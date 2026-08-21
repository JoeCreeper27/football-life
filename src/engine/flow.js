import { clamp } from './rng.js';
import {
  LV, CLUBS, YOUTH_CLUBS, TIER, DPOS, EVENTS, TRAITS, ABIL, CONF, POS_GROUP,
  NATIONS, ORIGINS, REGION, MAX_TIER, MAX_ABIL, leaguesAt,
  ARCHETYPE, ARCH_SWITCH, ROLE_RANK, SQUAD, PHYSICAL, PAC_LOCK_AGE, growthPhase, STAGE_TRAIN,
  POS_WEIGHT,
  BUILD,
  trainingTable, trainingFor,
} from './data.js';
import {
  rngOf, syncCursor, addAb, subAb, abCost, ovr, defaultPos, posQualified, squadGap,
  nationOf, regionOf, isHomeLeague, isAbroad, ageWindow, isGrowable, addFanRep, ovrAt, bestPos, trackPeak,
} from './state.js';
import {
  rollMinutes, simSeason, injuryRisk, accrueLoad, loadCap,
  annualSalary, applyDecline, dValue, fmtMoney,
} from './sim.js';

/**
 * 引擎對外只有兩個入口：
 *   run(s)            推進到下一個需要玩家決策的點
 *   answer(s, value)  回答目前的 pending，然後繼續推進
 * 回傳純資料 { cards, pending }，不碰 DOM，因此可以在 Node 裡跑平衡模擬。
 */
export function run(s) { return loop(s, undefined); }
export function answer(s, value) { return loop(s, value); }

function loop(s, input) {
  const ctx = { cards: [], rng: rngOf(s) };
  let guard = 0;
  s.pending = null;
  while (!s.done && !s.pending && guard++ < 400) {
    const step = STEPS[s.step || 'YEAR_START'];
    if (!step) break;
    step(s, ctx, input);
    input = undefined; // 輸入只餵給第一個步驟
  }
  syncCursor(s, ctx.rng);
  return { cards: ctx.cards, pending: s.pending, state: s };
}

const card = (ctx, tone, title, html) => ctx.cards.push({ tone, title, html });
const ask = (s, pending, resume) => { s.pending = pending; s.step = resume; };
const isPro = s => s.club.stage === 'PRO';
const hl = v => `<b class="hl">${v}</b>`;
const up = v => `<b class="up">+${v}</b>`;
const dn = v => `<b class="dn">${v}</b>`;

function unlock(s, ctx, key) {
  if (s.player.traits[key]) return;
  s.player.traits[key] = true;
  const t = TRAITS[key];
  card(ctx, t.tone, '隱藏屬性解鎖：' + t.n, t.fx);
}

/* ==================================================================== */
const STEPS = {};

/* ---------------- 年度開始 ---------------- */
const STAGE_LABEL = {
  JHS: y => `國${'一二三'[y - 1]}`,
  HS: y => `高${'一二三'[y - 1]}`,
  UNI: y => `大${'一二三四'[y - 1]}`,
  ACADEMY: y => `青訓 U${13 + y}`,
};

STEPS.YEAR_START = (s, ctx) => {
  const c = s.club;
  if (!s._bornNoted) {
    s._bornNoted = true;
    const b = BUILD[s.player.build];
    if (b) card(ctx, 'info', `體型：${b.n}`, `${b.d}。<br>這是你拿到的身體，不是你挑的。`);
  }
  const stage = STAGE_LABEL[c.stage] ? STAGE_LABEL[c.stage](c.stageYear) : LV[c.lv].n;
  const where = isPro(s) && isAbroad(s) ? ' · 旅外' : '';
  ctx.cards.push({ divider: `${s.career.year} 年 · ${s.player.age} 歲 · ${stage}${where}` });
  s.phase = 'PRESEASON';
  s.step = 'PRE_DECLINE';
};

/* ---------------- 季前 ---------------- */
STEPS.PRE_DECLINE = (s, ctx) => {
  const p = s.player;
  p.injury.seasonFactor = 1;

  if (p.age >= CONF.retireAge) { return retire(s, ctx, '身體已到極限，賽季前宣布掛靴。'); }

  // 重傷隔年：人回來了，狀態還沒
  if (p.injury.lingering) {
    p.injury.lingering = 0;
    p.injury.seasonFactor = 0.72;
    card(ctx, 'bad', '狀態還沒回來',
      '傷是好了，但那種「身體會自己反應」的感覺還沒回來。這一季會很辛苦。');
  }

  if (p.service > 0) {
    p.service--;
    p.injury.seasonFactor = 0.0;
    card(ctx, 'bad', '服役中', '這一年沒有比賽。你在營區的水泥地上踢球，鞋底磨得很快。');
  } else if (p.injury.rehab > 0) {
    p.injury.rehab--;
    p.injury.seasonFactor = 0.0;
    card(ctx, 'bad', '復健年', '整季在復健室度過。這一年沒有比賽，只有無數次的重訓與跑步機。');
  }

  trackPeak(s);          // 衰退之前先記高水位
  const ch = applyDecline(s);
  if (ch && Object.keys(ch).length) {
    const txt = Object.entries(ch).map(([k, v]) => `${ABIL[k]} ${dn(v)}`).join('、');
    card(ctx, 'bad', '歲月不饒人',
      `${p.age >= 35 ? '第二階段（逐年加劇）' : '第一階段'}衰退：${txt}。<br>` +
      `速度和體能回不去了，但你對比賽的理解還在。`);
  }
  s.step = 'PRE_DICE';
};

/**
 * 訓練骰依生涯階段（GROWTH）決定顆數與骰面，養成階段再依所在環境微調。
 * 潛力期骰面開到 8，一季能動 8–10 點；巔峰期之後幾乎練不動 ——
 * 這是「總量控制住、重壓在 24 歲前」的實作點，動這裡等於動整條成長曲線。
 */
function diceSpec(s, rng) {
  const p = s.player;
  const g = growthPhase(p.age);
  const env = STAGE_TRAIN[s.club.stage] || STAGE_TRAIN.PRO;
  let n = g.n + env.dice;

  // 上場時間與表現直接換成成長：坐板凳的人練不起來，這是出場率的第二層意義
  const last = s.career.seasons[s.career.seasons.length - 1];
  if (last && last.apps > 0) {
    if (last.minutes >= 70) n += 1;
    else if (last.minutes < 30) n -= 1;
    if (last.rating >= 7.2) n += 1;
  }

  if (p.injury.rehab > 0 || p.injury.seasonFactor === 0) n = Math.min(n, 1);
  if (p.traits.benched) n -= 1;
  if (p.origin === 'immigrant' && p.age <= 15) n -= 1;   // 適應期
  if (s._diceDebuff) { n -= s._diceDebuff; s._diceDebuff = undefined; }
  if (p.injury.restNext) { n -= 1; p.injury.restNext = 0; }   // 上季受傷，季前要先養
  return {
    n: Math.max(1, n),
    lo: p.traits.golden ? Math.max(g.lo, 4) : g.lo,
    hi: g.hi,
    phase: g.n2,
  };
}

/** 訓練環境讓不同類型的能力練起來效率不同 */
function trainBoost(s, k) {
  const env = STAGE_TRAIN[s.club.stage] || STAGE_TRAIN.PRO;
  return PHYSICAL.includes(k) ? env.phy : env.tec;
}

/** 這個階段能不能自主加練（國中與青訓的課表本來就排滿了） */
const canExtraTrain = s => isPro(s) || s.club.stage === 'HS' || s.club.stage === 'UNI';

STEPS.PRE_DICE = (s, ctx, input) => {
  const p = s.player;
  const env = STAGE_TRAIN[s.club.stage] || STAGE_TRAIN.PRO;

  if (input === undefined) {
    const spec = diceSpec(s, ctx.rng);
    const dice = Array.from({ length: spec.n }, () => ctx.rng.int(spec.lo, spec.hi));
    dice.forEach(d => { if (d >= 6) s.career.counters.six++; });
    if (!p.traits.golden && s.career.counters.six >= 5 && p.age <= 22) unlock(s, ctx, 'golden');

    if (env.d && s._envNoted !== s.club.stage) {
      s._envNoted = s.club.stage;
      card(ctx, 'info', '訓練環境', `${env.d}<br>` +
        `體能類效率 ×${env.phy.toFixed(2)}、技術類效率 ×${env.tec.toFixed(2)}。`);
    }

    // 學院有必修課：前幾顆骰被固定課表吃掉，剩下的才由玩家安排
    // 帶上顯示名稱，UI 層就不必認得訓練表
    const fixed = env.fixed.slice(0, Math.max(0, dice.length - 1))
      .map((key, i) => ({ key, die: dice[i], n: trainingTable(p.group)[key]?.n || key }));
    const free = dice.slice(fixed.length);

    const majors = ARCHETYPE[p.arch]?.major || [];
    const TT = trainingTable(p.group);
    const options = trainingFor(p.group).map(key => {
      const t = TT[key];
      const feeds = Object.keys(t.ab).filter(k => k in p.ab);
      // 主修判定看「權重佔比」而不是「有沒有沾到」：
      // 射門練習只餵 0.1 的射門也算主修的話，一半以上的項目都會標黃框
      const total = feeds.reduce((a, k) => a + t.ab[k], 0);
      const mine = feeds.reduce((a, k) => a + (majors.includes(k) ? t.ab[k] : 0), 0);
      return {
        v: key, t: t.n,
        s: feeds.map(k => `${ABIL[k]}${'▲'.repeat(Math.max(1, Math.round(t.ab[k] * 2)))}`).join(' '),
        dead: feeds.every(k => !isGrowable(p, k)),
        major: total > 0 && mine / total >= 0.5,
      };
    });

    // 主修相關的訓練排前面，玩家一眼就看到該練什麼
    options.sort((a, b) => (b.major ? 1 : 0) - (a.major ? 1 : 0));
    const arch = ARCHETYPE[p.arch];

    return ask(s, {
      type: 'train',
      title: `季前訓練（${spec.phase}）`,
      note: arch
        ? `<b class="hl">黃框</b>是 ${arch.n} 的主修訓練（${arch.major.map(k => ABIL[k]).join('、')}）` +
          `：成長成本 ×0.7，其餘維持原價。`
        : '18 歲確立原型後，主修訓練會標成黃框。',
      dice: free, fixed, options,
      // 自主加練：多一次訓練，代價是受傷風險與身體負荷；不加練則換一次際遇
      extra: canExtraTrain(s),
    }, 'PRE_DICE');
  }

  // input: { picks: [訓練key（對應每顆骰）], extra: 訓練key | null }
  const before = { ...p.ab };
  const spent = [];
  // 權重先正規化：一顆骰的總產出固定，差別在「分給哪幾項能力」，
  // 不然項目餵的能力越多就越強，玩家只會一直選同一項
  const TT = trainingTable(p.group);
  const apply = (key, amount) => {
    const t = TT[key];
    if (!t) return;
    const total = Object.values(t.ab).reduce((a, b) => a + b, 0);
    for (const [k, w] of Object.entries(t.ab)) {
      if (!(k in p.ab) || !isGrowable(p, k)) continue;
      addAb(p, k, amount * (w / total) * trainBoost(s, k));
    }
    spent.push(t.n);
  };

  s._extraRisk = 0;
  (input.fixed || []).forEach(f => apply(f.key, f.die));
  (input.picks || []).forEach(pk => apply(pk.key, pk.die));

  // 沒有加練 → 這季多一次際遇。休息不是空手而歸，是把時間花在別的地方
  s._restBonus = (!input.extra && canExtraTrain(s)) ? 1 : 0;

  if (input.extra) {
    const amt = ctx.rng.int(2, 5);
    apply(input.extra, amt);
    // 代價只算在這一季：nextRisk 會跨季累積，年年加練會滾成必然受傷
    s._extraRisk = 6;
    p.injury.load += 1.5;
    card(ctx, 'info', '自主加練',
      `所有人都走了，你留下來多練了 ${hl(TT[input.extra]?.n || '')}。` +
      `<br>身體不會忘記這些時間，但也不會忘記你沒有休息。（受傷率 ${up(4)}）`);
  }

  const gains = Object.keys(p.ab)
    .map(k => [k, p.ab[k] - before[k]])
    .filter(([, d]) => d > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, d]) => `${ABIL[k]} ${up(d)}`);
  card(ctx, '', '季前訓練成果',
    `課表：${spent.join('、') || '無'}<br>` + (gains.join('、') || '這一季沒有明顯進步'));

  s.step = isPro(s) ? 'PRE_STYLE' : 'PRE_SQUAD';
};

STEPS.PRE_STYLE = (s, ctx, input) => {
  if (input === undefined) {
    return ask(s, {
      type: 'choice', title: '本季踢法',
      options: [
        { v: '全場壓迫', t: '全場壓迫', s: '表現 +1、產能 +8%｜受傷率 +9、負荷 ×1.45' },
        { v: '標準', t: '標準', s: '標準表現與負荷', main: true },
        { v: '節省體力', t: '節省體力', s: '表現 −1｜負荷 ×0.62，延長生涯' },
      ],
    }, 'PRE_STYLE');
  }
  s.player.style = input;
  s.step = 'PRE_SQUAD';
};

/** 陣中地位判定：足球版的核心焦慮 */
STEPS.PRE_SQUAD = (s, ctx) => {
  const c = s.club;
  if (!isPro(s)) { c.role = 'STARTER'; c.minutes = 0.85; s.step = 'MID_EVENTS'; return; }

  if (!s.player.dpos) return (s.step = 'PRE_POS');

  const r = rollMinutes(s, ctx.rng);
  c.role = r.role; c.minutes = r.minutes;
  const gap = squadGap(s);
  card(ctx, r.role === 'BENCH' || r.role === 'STAND' ? 'bad' : '', '陣中地位',
    `教練把你放在 ${hl(r.roleName)} 的位置（實力差 ${gap >= 0 ? '+' : ''}${gap.toFixed(0)}）。` +
    `預期出場率 ${hl(Math.round(r.minutes * 100) + '%')}。`);

  if (r.role === 'BENCH' || r.role === 'STAND') {
    s.career.counters.benchStreak++;
    if (s.career.counters.benchStreak >= 2) unlock(s, ctx, 'benched');
  } else {
    s.career.counters.benchStreak = 0;
    if (!s.player.traits.captain && c.yearsAtClub >= 4 && r.role === 'KEY' && ctx.rng.chance(35)) {
      unlock(s, ctx, 'captain');
    }
    if (!s.player.traits.adapt && s.player.origin === 'immigrant' && isAbroad(s)
        && (r.role === 'KEY' || r.role === 'STARTER')) {
      unlock(s, ctx, 'adapt');
    }
  }
  s.step = 'MID_EVENTS';
};

/** 登上職業後才登錄細分位置 */
STEPS.PRE_POS = (s, ctx, input) => {
  const p = s.player;
  const cands = Object.keys(DPOS).filter(k => DPOS[k].group === p.group);
  if (input === undefined) {
    const ok = cands.filter(k => posQualified(p, k, s.club.lv, p.age));
    const list = (ok.length ? ok : [defaultPos(p.group)]);
    if (list.length === 1) { p.dpos = list[0]; s.step = 'PRE_SQUAD'; return; }
    return ask(s, {
      type: 'choice', title: '教練要幫你登錄位置',
      options: list.map((k, i) => ({
        v: k, t: DPOS[k].n, main: i === 0,
        s: `薪資係數 ×${DPOS[k].sal.toFixed(2)}`,
      })),
    }, 'PRE_POS');
  }
  p.dpos = input;
  card(ctx, '', '位置登錄', `你被登錄為 ${hl(DPOS[input].n)}。`);
  s.step = 'PRE_SQUAD';
};

/* ---------------- 賽季中 ---------------- */

/** 事件卡的副作用 API：讓 data.js 的 fx 不用知道 flow 的內部結構 */
function fxApi(s, ctx) {
  return {
    rng: ctx.rng,
    salary: annualSalary(s),
    card: (tone, title, html) => card(ctx, tone, title, html),
    unlock: key => unlock(s, ctx, key),
    fine: pct => {
      const amt = Math.round(annualSalary(s) * pct);
      s.career.salaryTotal = Math.max(0, s.career.salaryTotal - amt);
      card(ctx, 'bad', '罰款', `球會開罰 ${fmtMoney(amt)}。`);
    },
    suspend: games => {
      const L = LV[s.club.lv];
      s.club.minutes = Math.max(0, s.club.minutes - games / (L.g || 34));
      card(ctx, 'bad', '禁賽', `禁賽 ${games} 場，本季出場時間縮水。`);
    },
    shiftRole: dir => {
      const idx = SQUAD.findIndex(r => r.k === s.club.role);
      const next = SQUAD[clamp(idx - dir, 0, SQUAD.length - 1)];
      s.club.role = next.k;
      s.club.minutes = clamp(s.club.minutes + dir * 0.15, 0, 0.95);
      card(ctx, dir > 0 ? 'good' : 'bad', '陣中地位變動',
        `教練把你調整為 ${hl(next.n)}，出場率 ${Math.round(s.club.minutes * 100)}%。`);
    },
  };
}

/** 依 cond 過濾、依 weight 加權抽樣，排除已觸發過的 once 卡 */
function drawEvent(s, rng) {
  const p = s.player;
  const seen = s.career.seenEvents || [];
  const pool = EVENTS.filter(e => {
    if (e.once && seen.includes(e.n)) return false;
    const forOk = e.for === '*' ||
      (e.for === 'GK' && p.group === 'GK') ||
      (e.for === 'OUT' && p.group !== 'GK') ||
      (e.for === 'PRO' && isPro(s)) ||
      (e.for === 'ABROAD' && isPro(s) && isAbroad(s));
    if (!forOk) return false;
    return e.cond ? !!e.cond(s) : true;
  });
  if (!pool.length) return null;
  const total = pool.reduce((a, e) => a + (e.weight ?? 1), 0);
  let roll = rng.next() * total;
  for (const e of pool) {
    roll -= (e.weight ?? 1);
    if (roll <= 0) return e;
  }
  return pool[pool.length - 1];
}

/** 套用效果表；能力、受傷率與球迷聲望走同一張表 */
/**
 * 抬高天賦上限。這是傳奇球星指導與一般訓練最大的差別 ——
 * 一般事件只是往天花板底下填，這種機遇是把天花板本身推高。
 */
/** 壓低天賦上限（重傷專用）。回傳給卡片用的說明文字。 */
function lowerPot(p, table) {
  const parts = [];
  for (const [k, v] of Object.entries(table)) {
    if (!(k in p.pot)) continue;
    const before = p.pot[k];
    p.pot[k] = clamp(p.pot[k] - v, 25, MAX_ABIL);
    if (p.pot[k] !== before) parts.push(`${ABIL[k]}上限 ${dn(p.pot[k] - before)}`);
  }
  return parts.join('、');
}

function raisePot(s, ctx, table, mag) {
  const p = s.player, parts = [];
  for (const [k, v] of Object.entries(table || {})) {
    if (!(k in p.pot)) continue;
    const amt = Math.max(1, Math.round(v * (mag / 2)));
    const before = p.pot[k];
    p.pot[k] = clamp(p.pot[k] + amt, 25, MAX_ABIL);
    if (p.pot[k] !== before) parts.push(`${ABIL[k]} 上限 ${up(p.pot[k] - before)}`);
  }

  // 跟著大師學到的不只是那一招：其餘能力的天花板也一起往上挪。
  // 只抬 1~2 項的話，加權平均帶不動 —— 實測峰值只差 1.7 分，等於沒有發生。
  const blanket = Math.max(1, Math.round(7 * (mag / 2)));
  let lifted = 0;
  for (const k of Object.keys(p.pot)) {
    if (table && table[k] !== undefined) continue;
    const before = p.pot[k];
    p.pot[k] = clamp(p.pot[k] + blanket, 25, MAX_ABIL);
    if (p.pot[k] !== before) lifted++;
  }
  if (lifted) parts.push(`其餘 ${lifted} 項 ${up(blanket)}`);

  if (parts.length) {
    card(ctx, 'gold', '天賦被打開了',
      `${parts.join('、')}。<br>你原本以為的極限，往上挪了。`);
  }
}

function applyEffects(s, ctx, table, mag, win) {
  const p = s.player, parts = [];
  for (const [k, v] of Object.entries(table)) {
    const amt = Math.max(1, Math.round(Math.abs(v) * (mag / 2) * (k === 'fanRep' || k === 'inj' ? 1 : CONF.abilScale)));
    if (k === 'inj') {
      p.injury.nextRisk += v > 0 ? amt : -amt;
      parts.push(`受傷率 ${v > 0 ? up(amt) : dn(-amt)}`);
      continue;
    }
    if (k === 'fanRep') {
      const got = addFanRep(s, v > 0 ? amt : -amt);
      if (got) parts.push(`球迷聲望 ${got > 0 ? up(got) : dn(got)}`);
      continue;
    }
    let key = k;
    if (k === 'rand') key = ctx.rng.pick(Object.keys(p.ab));
    if (!(key in p.ab)) continue;
    if (v > 0) {
      const g = addAb(p, key, amt);
      parts.push(g ? `${ABIL[key]} ${up(g)}` : `${ABIL[key]} 蓄力 ${carryTxt(p, key)}`);
    } else { const g = subAb(p, key, amt); parts.push(`${ABIL[key]} ${dn(g)}`); }
  }
  return parts;
}

/** 蓄力槽進度：告訴玩家點數沒有蒸發，只是還沒滿一級 */
function carryTxt(p, k) {
  return `${Math.floor(p.carry[k] || 0)}/${abCost(p, k)}`;
}

STEPS.MID_EVENTS = (s, ctx, input) => {
  const p = s.player;
  s.phase = 'MIDSEASON';
  if (s._ev === undefined) {
    s._ev = (isPro(s) ? CONF.eventCards : 2) + (s._restBonus || 0);
    if (s._restBonus) {
      card(ctx, 'info', '沒有留下來加練',
        '你準時離開訓練場。多出來的時間，讓你遇上了一些別的事。');
      s._restBonus = 0;
    }
  }

  if (input === undefined) {
    if (s._ev <= 0 || p.injury.seasonFactor === 0) {
      s._ev = undefined; s._card = undefined; s.step = 'MID_INJURY'; return;
    }
    const ev = drawEvent(s, ctx.rng);
    if (!ev) { s._ev = 0; return; }
    s._card = ev.n;
    if (ev.once) (s.career.seenEvents = s.career.seenEvents || []).push(ev.n);

    // 分岔型卡片：不賭成功率，直接在兩條路之間選
    if (ev.opts) {
      return ask(s, {
        type: 'choice', title: `抉擇｜${ev.n}`,
        options: ev.opts.map((o, i) => ({ v: 'opt' + i, t: o.t, s: o.s, main: i === 0 })),
      }, 'MID_EVENTS');
    }
    const odds = evOdds(p);
    // acts = [保守, 照常, 全力] 的自訂文案；沒寫就用通用的
    const [aSafe, aNorm, aBold] = ev.acts || ['保守應對', '照常執行', '全力一搏'];
    return ask(s, {
      type: 'choice', title: `事件｜${ev.n} — 你要怎麼應對？`,
      options: [
        { v: 'bold', t: aBold, warn: true, s: `成功率 ${odds.bold}%｜幅度 ±3` },
        { v: 'norm', t: aNorm, main: true, s: `成功率 ${odds.norm}%｜幅度 ±2` },
        { v: 'safe', t: aSafe, s: `成功率 ${odds.safe}%｜幅度 ±1` },
      ],
    }, 'MID_EVENTS');
  }

  const ev = EVENTS.find(e => e.n === s._card);
  const api = fxApi(s, ctx);

  if (ev.opts && String(input).startsWith('opt')) {
    const opt = ev.opts[+String(input).slice(3)];
    const parts = applyEffects(s, ctx, opt.g || {}, 2, true);
    card(ctx, 'info', `${ev.n}｜${opt.t}`, parts.join('、') || '你做了選擇。');
    if (opt.fx) opt.fx(s, api);
    s._ev--; s._card = undefined;
    return;
  }

  const odds = evOdds(p);
  const rate = { bold: odds.bold, norm: odds.norm, safe: odds.safe }[input];
  const mag = { bold: 3, norm: 2, safe: 1 }[input];
  const win = ctx.rng.chance(rate);
  if (input === 'bold') { s.career.counters.bold++; if (win) s.career.counters.boldWin++; }

  const parts = applyEffects(s, ctx, win ? ev.g : ev.b, mag, win);
  card(ctx, win ? 'good' : 'bad', `${ev.n}｜${win ? '成功' : '失敗'}`,
    `${win ? ev.gt : ev.bt}<br>${parts.join('、') || '沒有明顯影響'}`);
  if (win && ev.gpot) raisePot(s, ctx, ev.gpot, mag);
  if (ev.fx) ev.fx(s, win, api);

  if (!win && ev.n === '社群媒體風波' && ctx.rng.chance(40)) unlock(s, ctx, 'socialko');
  s._ev--; s._card = undefined;
};

function evOdds(p) {
  let base = p.traits.golden ? 70 : 50;
  if (p.traits.socialko) base -= 10;
  if (p.traits.diver) base -= 5;
  return { safe: Math.min(95, base + 20), norm: base, bold: base - 15 };
}

STEPS.MID_INJURY = (s, ctx) => {
  const p = s.player;
  if (p.injury.seasonFactor === 0) { s.step = 'MID_SEASON'; return; }

  if (isPro(s)) {
    accrueLoad(s);
    if (p.injury.load >= loadCap(p)) return (s.step = 'MID_ACL');
  }

  const risk = injuryRisk(s);
  if (ctx.rng.chance(risk)) {
    // 三級傷勢：輕傷只是休息、中傷砍數據、重傷報銷整季並留下後遺症
    const roll = ctx.rng.int(1, 100);
    const bigLine = p.age >= 32 ? 22 : 12;
    if (roll <= bigLine) {
      p.injury.bigCount++;
      p.injury.seasonFactor = 0;
      subAb(p, 'pac', 14); subAb(p, 'sta', 9); subAb(p, 'phy', 5);
      // 重傷不只是掉能力，是把天花板本身壓下來 —— 爆發力回不到受傷前的水準
      const capLoss = lowerPot(p, { pac: 7, sta: 5, phy: 3 });
      p.injury.restNext = 1;
      p.injury.lingering = 1;   // 隔年狀態還是回不來
      card(ctx, 'bad', '重傷',
        `一次落地讓整個賽季結束。速度 ${dn(-14)}、體能 ${dn(-9)}、對抗 ${dn(-5)}。<br>` +
        (capLoss ? `而且${capLoss}，這是回不去的。<br>` : '') +
        `復健要一整年，回來之後身體不會跟以前一樣。`);
      if (p.age < 30 && p.injury.bigCount >= 2) unlock(s, ctx, 'glass');
      s.career.counters.ironStreak = 0;
    } else if (roll <= bigLine + 42) {
      const weeks = ctx.rng.int(5, 12);
      p.injury.seasonFactor = clamp(1 - weeks / 32, 0.35, 0.92);
      subAb(p, 'sta', 2);
      card(ctx, 'bad', ctx.rng.pick(['肌肉拉傷', '腿後肌拉傷', '鼠蹊部傷勢']),
        `缺陣約 ${weeks} 週。本季出場與數據都會打折，體能 ${dn(-2)}。`);
      s.career.counters.ironStreak = 0;
    } else {
      // 輕傷：能力不掉，但要休息，下一季少一次訓練
      const weeks = ctx.rng.int(2, 5);
      p.injury.seasonFactor = clamp(1 - weeks / 40, 0.85, 0.97);
      p.injury.restNext = 1;
      card(ctx, 'info', ctx.rng.pick(['腳踝扭傷', '膝蓋挫傷', '腳趾骨裂', '背部僵硬']),
        `缺陣約 ${weeks} 週。能力沒有受損，但接下來得先養傷 ——<br>` +
        `下個季前少一次訓練。`);
      s.career.counters.ironStreak = 0;
    }
  } else {
    p.injury.nextRisk = Math.max(0, p.injury.nextRisk - 2);
    s.career.counters.ironStreak++;
    if (s.career.counters.ironStreak >= 5 && !p.traits.iron) unlock(s, ctx, 'iron');
  }
  s.step = 'MID_SEASON';
};

/** 韌帶量表爆表：動刀 vs 打封閉硬撐 */
STEPS.MID_ACL = (s, ctx, input) => {
  const p = s.player;
  if (input === undefined) {
    subAb(p, 'pac', 7);
    card(ctx, 'bad', '膝蓋發出警訊',
      `長期累積的負荷讓十字韌帶亮起紅燈，速度先掉了 ${dn(-7)}。醫療團隊把選擇權交給你。`);
    return ask(s, {
      type: 'choice', title: '你要怎麼處理？',
      options: [
        { v: 'surgery', t: '接受手術', main: true, s: '報銷一年，量表歸零，術後速度回春 +3~+8' },
        { v: 'gamble', t: '打封閉硬撐', warn: true, s: `成功率 ${p.traits.knee ? 85 : 55}%｜失敗將重大斷裂` },
      ],
    }, 'MID_ACL');
  }

  if (input === 'surgery') {
    p.injury.aclCount++;
    p.injury.load = 0;
    p.injury.rehab = 1;
    p.injury.seasonFactor = 0;
    const back = ctx.rng.int(4, 11);
    addAb(p, 'pac', back);
    card(ctx, 'bad', '十字韌帶手術', `整季報銷。漫長復健後速度回復 ${up(back)}。`);
    lowerPot(p, { pac: 6, sta: 3 });
    if (p.injury.aclCount >= 2) {
      Object.keys(p.ab).forEach(k => { if (k === 'pac') p.ab[k] = Math.round(p.ab[k] * 0.55); });
      card(ctx, 'bad', '第二次了', '兩度韌帶重建，爆發力再也回不來。速度直接砍半。');
    }
    s.player.traits.knee = false;
  } else {
    const ok = ctx.rng.chance(p.traits.knee ? 85 : 55);
    if (ok) {
      p.injury.load = Math.max(0, p.injury.load - 20);
      s.career.counters.gambleWin = (s.career.counters.gambleWin || 0) + 1;
      card(ctx, 'good', '硬撐成功', '止痛針打下去，你撐完了整季。量表 −20。');
      if (s.career.counters.gambleWin >= 2) unlock(s, ctx, 'knee');
    } else {
      p.injury.aclCount++;
      p.injury.rehab = 1;
      p.injury.seasonFactor = 0;
      subAb(p, 'pac', 7);
      s.career.counters.gambleWin = 0;
      card(ctx, 'bad', '重大韌帶斷裂', `賭輸了。整季報銷、隔年也難全恢復，速度再 ${dn(-7)}。`);
    }
  }
  s.step = 'MID_SEASON';
};

STEPS.MID_SEASON = (s, ctx) => {
  const p = s.player, c = s.club;
  if (p.injury.seasonFactor === 0) {
    s.career.seasons.push({
      year: s.career.year, age: p.age, lv: c.lv, lvName: LV[c.lv].n, club: c.club,
      dpos: p.dpos, role: c.role, apps: 0, goals: 0, assists: 0, cs: 0, rating: 0, d: 0, minutes: 0,
    });
    s.step = 'END_SALARY';
    return;
  }
  const st = simSeason(s, ctx.rng);
  s._bonusGoals = undefined;
  s.career.seasons.push(st);
  s.career.clubTally[c.club] = (s.career.clubTally[c.club] || 0) + 1;
  // 表現直接回饋到看台上：踢得好聲望漲，踢得爛掉得更快。養成階段還沒有球迷。
  if (isPro(s)) addFanRep(s, st.rating >= 7.3 ? 6 : st.rating >= 6.9 ? 3 : st.rating >= 6.5 ? 0 : -6);

  const line = p.group === 'GK'
    ? `${st.apps} 場｜零封 ${hl(st.cs)}｜評分 ${hl(st.rating)}`
    : `${st.apps} 場｜進球 ${hl(st.goals)}｜助攻 ${hl(st.assists)}｜評分 ${hl(st.rating)}`;
  card(ctx, '', `${s.career.year} 賽季成績`,
    `${c.club}・${DPOS[st.dpos]?.n || ''}<br>${line}<br>出場率 ${st.minutes}%`);
  s.step = 'END_SALARY';
};

/* ---------------- 原型 ---------------- */

/** 這個位置能登記的原型，依目前能力分布排出契合度 */
function archCandidates(p) {
  const dp = p.dpos || bestPos(p);
  const all = Object.entries(ARCHETYPE).filter(([, a]) => a.pos.includes(dp));
  const fit = ([, a]) => a.major.reduce((sum, k) => sum + (p.ab[k] ?? 0), 0) / a.major.length;
  const ok = all.filter(([, a]) => a.req(p)).sort((x, y) => fit(y) - fit(x));
  const rest = all.filter(([, a]) => !a.req(p)).sort((x, y) => fit(y) - fit(x));
  return [...ok, ...rest].slice(0, 3);
}

/** 「你踢的是哪一種球」：不是開局選的，是前幾年加點長出來的 */
STEPS.END_ARCH = (s, ctx, input) => {
  const p = s.player;
  if (p.arch || !isPro(s) || p.age < 18 || !p.dpos) { s.step = 'END_ARCH_EVO'; return; }
  const cands = archCandidates(p);
  if (!cands.length) { s.step = 'END_ARCH_EVO'; return; }

  if (input === undefined) {
    if (cands.length === 1) { applyArch(s, ctx, cands[0][0]); s.step = 'END_ARCH_EVO'; return; }
    return ask(s, {
      type: 'choice', title: '你踢的是哪一種球？',
      options: cands.map(([k, a], i) => ({
        v: k, t: a.n, main: i === 0,
        s: `${a.d}｜主修 ${a.major.map(x => ABIL[x]).join('、')}`,
      })),
    }, 'END_ARCH');
  }
  applyArch(s, ctx, input);
  s.step = 'END_ARCH_EVO';
};

function applyArch(s, ctx, key) {
  const p = s.player, a = ARCHETYPE[key];
  p.arch = key;
  a.major.forEach(k => { if (k in p.pot) p.pot[k] = Math.min(80, p.pot[k] + 4); });
  card(ctx, 'gold', `原型確立：${a.n}`,
    `${a.d}<br>主修 ${hl(a.major.map(k => ABIL[k]).join('、'))}（成長成本 ×0.7、潛力 +4），` +
    `其餘能力成本 ×1.3。<br>從現在起，你的成長方向被收窄了 —— 這就是身分的重量。`);
}

/** 進化與轉型 */
STEPS.END_ARCH_EVO = (s, ctx, input) => {
  const p = s.player, a = ARCHETYPE[p.arch];
  if (!a) { s.step = 'END_AWARDS'; return; }

  // 進化：同一條路走到極致，純榮譽向
  if (a.evolve && !p.archEvolved && a.evolve.cond(s)) {
    p.archEvolved = a.evolve.key;
    s.career.honors.push(`${s.career.year} ${a.evolve.n}`);
    card(ctx, 'gold', `★ ${a.evolve.n} ★`,
      `你把 ${a.n} 這條路走到了別人到不了的地方。`);
  }

  // 轉型：31 歲後速度掉到門檻下，全遊戲最有戲的一刻
  const sw = ARCH_SWITCH[p.arch];
  if (sw && !p.archSwitched && p.age >= 31 && (p.ab.pac ?? 99) < 68) {
    const to = ARCHETYPE[sw.to];
    if (input === undefined) {
      return ask(s, {
        type: 'choice', title: `打法會議：${a.n} 已經跑不動了`,
        options: [
          { v: 'switch', t: `轉型為 ${to.n}`, main: true,
            s: `${sw.t}｜主修改為 ${to.major.map(k => ABIL[k]).join('、')}、潛力 +3、生涯延長` },
          { v: 'keep', t: '不改，就這樣踢到最後', warn: true,
            s: '產能持續衰減，兩季後就得面對引退' },
        ],
      }, 'END_ARCH_EVO');
    }
    p.archSwitched = true;
    if (input === 'switch') {
      p.arch = sw.to;
      to.major.forEach(k => { if (k in p.pot) p.pot[k] = Math.min(80, p.pot[k] + 3); });
      card(ctx, 'gold', `轉型成功：${to.n}`, `${sw.t}<br>你又多了幾年可以踢。`);
      unlock(s, ctx, 'secondwind');
    } else {
      s.career.counters.refusedSwitch = 1;
      card(ctx, 'bad', '你拒絕了', '教練沒有再提這件事。你知道時間不多了。');
    }
  }
  s.step = 'END_AWARDS';
};

/**
 * 負面特性的翻身路徑。
 * 每張負面卡都要有出路，否則玩家會覺得是被懲罰，而不是被講了一個故事。
 */
function cureTraits(s, ctx) {
  const p = s.player, c = s.club;
  const L = s.career.seasons[s.career.seasons.length - 1];
  if (!L || !isPro(s)) return;
  const n = s.career.counters;

  n.goodRating = L.rating >= 7.2 ? (n.goodRating || 0) + 1 : 0;
  n.starterRun = ROLE_RANK[c.role] >= 3 ? (n.starterRun || 0) + 1 : 0;
  n.noDive = (n.noDive || 0) + 1;

  const cure = k => {
    p.traits[k] = false;
    if (!p.removed.includes(TRAITS[k].n)) p.removed.push(TRAITS[k].n);
    card(ctx, 'good', `擺脫了「${TRAITS[k].n}」`, `${TRAITS[k].cure}。這一頁翻過去了。`);
  };
  if (p.traits.cancer && n.goodRating >= 2 && c.yearsAtClub <= 2) cure('cancer');
  if (p.traits.socialko && s.career.fanRep >= 70) cure('socialko');
  if (p.traits.diver && n.noDive >= 2) cure('diver');
  if (p.traits.puppet && n.selfMove) cure('puppet');
  if (p.traits.benched && n.starterRun >= 2) cure('benched');
}

/**
 * 在低階聯賽連續掙扎的季數。年輕球員撐不出來就會被足球淘汰 ——
 * 沒有這條的話，只要不受重傷，每個人都能一路混到 42 歲。
 */
function trackStruggle(s) {
  const L = s.career.seasons[s.career.seasons.length - 1];
  const n = s.career.counters;
  if (!isPro(s) || !L) return;
  const stuck = LV[s.club.lv].tier <= 2 &&
    (ROLE_RANK[s.club.role] <= 1 || L.rating < 6.2 || L.apps < 6);
  n.struggle = stuck ? (n.struggle || 0) + 1 : 0;
}

/* ---------------- 季末 ---------------- */
STEPS.END_SALARY = (s, ctx) => {
  cureTraits(s, ctx);
  trackStruggle(s);
  s.phase = 'SEASON_END';
  if (isPro(s)) {
    const sal = annualSalary(s);
    s.career.salaryTotal += sal;
    const bonus = s.career.fanRep >= 70 ? Math.round(sal * 0.1) : 0;
    if (bonus) s.career.salaryTotal += bonus;
    card(ctx, '', '季末結算',
      `本年度薪資 ${hl(fmtMoney(sal))}` +
      (bonus ? `＋球衣分紅 ${fmtMoney(bonus)}` : '') +
      `（生涯累計 ${fmtMoney(s.career.salaryTotal)}）<br>球迷聲望 ${hl(Math.round(s.career.fanRep))}`);
  }
  s.step = 'END_ARCH';
};

STEPS.END_AWARDS = (s, ctx) => {
  const p = s.player, c = s.club, L = LV[c.lv];
  const last = s.career.seasons[s.career.seasons.length - 1];
  if (!isPro(s) || !last || last.apps === 0) { s.step = 'END_MOVE'; return; }

  const d = last.d;
  const honors = [];

  // 球隊榮譽
  let champ = TIER[c.tier].champ;
  if (p.traits.bigmatch) champ *= 1.25;
  if (ctx.rng.chance(champ)) {
    honors.push(`${s.career.year} ${L.n}冠軍`);
    if (L.top === 'BIG5' && ctx.rng.chance(35)) honors.push(`${s.career.year} 歐洲冠軍賽冠軍`);
    if (L.top === 'ASIA' && ctx.rng.chance(30)) honors.push(`${s.career.year} 亞洲冠軍賽冠軍`);
  }

  // 個人獎項
  const scorer = ['ST', 'W', 'AM'].includes(last.dpos);
  if (scorer && last.goals >= L.g * 0.45 && ctx.rng.chance(clamp(20 + d * 4, 5, 70))) {
    honors.push(`${s.career.year} ${L.n}金靴`);
  }
  if (p.group === 'GK' && last.cs >= L.g * 0.34 && ctx.rng.chance(clamp(20 + d * 4, 5, 65))) {
    honors.push(`${s.career.year} ${L.n}金手套`);
  }
  if (last.rating >= 7.4 && ctx.rng.chance(clamp(12 + d * 3, 3, 55))) {
    honors.push(`${s.career.year} ${L.n}年度最佳陣容`);
  }
  if (last.rating >= 7.7 && d >= 4 && ctx.rng.chance(clamp(8 + d * 2, 2, 35))) {
    honors.push(`${s.career.year} ${L.n}年度最佳球員`);
  }
  if (L.top === 'BIG5' && last.rating >= 8.0 && honors.some(h => h.includes('歐洲冠軍賽')) && ctx.rng.chance(25)) {
    honors.push(`${s.career.year} 世界足球先生`);
  }

  if (honors.length) {
    s.career.honors.push(...honors);
    card(ctx, 'gold', '榮譽', honors.join('<br>'));
  }
  s.step = 'END_INTL';
};

/** 代表隊徵召門檻：強國難擠、弱國容易，出身也有影響 */
function callThreshold(p) {
  const nat = NATIONS[p.natlPick] || nationOf(p);
  // 徵召門檻由國家實力推導，並且必須落在球員實際碰得到的 ovr 區間內：
  // 法國這種強國要 ~82（等於得是該國最好的那批），台灣約 60。
  // 這條線一定要跟著 LV 的 par 尺度一起移動 —— 寫死絕對值的話，
  // 尺度一改就會變成「強國永遠選不上、弱國人人是國腳」。
  const base = clamp(nat.natl * 0.38 + 52, 62, 84);
  const own = p.natlPick === p.nation ? (ORIGINS[p.origin]?.callAdj || 0) : 2;
  return base + own;
}

/** 國家隊：兩年一循環，個人能力只提供小幅加成 */
STEPS.END_INTL = (s, ctx) => {
  const p = s.player;
  if (!isPro(s) || p.age < 19 || s.career.year % 2 !== 0) { s.step = 'END_NATION'; return; }
  const nat = NATIONS[p.natlPick] || nationOf(p);
  if (ovr(p) < callThreshold(p)) { s.step = 'END_NATION'; return; }

  const caps = ctx.rng.int(4, 9);
  s.career.caps += caps;
  const goals = p.group === 'FW' ? ctx.rng.int(0, 4) : ctx.rng.int(0, 2);
  s.career.intlGoals += goals;
  s.career.pool += 2;

  // 代表隊整體實力每屆隨機，個人能力最多提供 +8 的加成（足球是團隊運動）
  const teamStrength = nat.natl + ctx.rng.int(-8, 8) + clamp((ovr(p) - 55) * 0.6, 0, 8);
  const worldCup = s.career.year % 4 === 0;
  if (worldCup) {
    if (ctx.rng.chance(clamp((teamStrength - 45) * 1.6, 1, 92))) {
      s.career.worldCups.push(s.career.year);
      s.career.honors.push(`${s.career.year} 世界盃會內賽`);
      card(ctx, 'gold', '★ 世界盃會內賽 ★',
        nat.natl < 50
          ? `終場哨響，全場的人都哭了。${nat.n}代表隊史上第一次踢進世界盃會內賽，而你在場上。`
          : `${nat.n}代表隊如期晉級世界盃會內賽，你在名單裡。`);
      unlock(s, ctx, 'national');
    } else {
      card(ctx, 'bad', '世界盃資格賽',
        `${nat.n}代表隊止步資格賽。${caps} 場出賽、進球 ${goals}。差一步，還是差一步。`);
    }
  } else {
    card(ctx, '', `${nat.n}代表隊徵召`,
      `本輪出賽 ${hl(caps)} 場、進球 ${goals}（生涯 ${s.career.caps} 場）。獲得 2 點能力點。`);
  }
  if (!p.traits.national && s.career.caps >= 40) unlock(s, ctx, 'national');
  s.step = 'END_NATION';
};

/** 混血限定：18 歲決定代表哪一國，這一步會改寫整個世界盃劇本 */
STEPS.END_NATION = (s, ctx, input) => {
  const p = s.player;
  if (p.natlPicked || !p.altNation || p.age < 18) { s.step = 'END_POS'; return; }
  const home = NATIONS[p.nation], alt = NATIONS[p.altNation];
  if (input === undefined) {
    return ask(s, {
      type: 'choice', title: '國籍抉擇：兩本護照，只能為一支代表隊出賽',
      options: [
        { v: p.nation, t: `${home.n}代表隊`, main: true,
          s: `實力基準 ${home.natl}｜徵召門檻低，是從小長大的地方` },
        { v: p.altNation, t: `${alt.n}代表隊`,
          s: `實力基準 ${alt.natl}｜徵召門檻更高，但世界盃舞台更近` },
      ],
    }, 'END_NATION');
  }
  p.natlPick = input;
  p.natlPicked = true;
  if (input !== p.nation) {
    card(ctx, 'gold', '歸化', `你披上了 ${hl(alt.n)} 的球衣。故鄉的球迷不會原諒你，但世界盃更近了。`);
    unlock(s, ctx, 'naturalized');
  } else {
    card(ctx, '', '國籍抉擇', `你選擇留在 ${hl(home.n)} 代表隊。這裡才是家。`);
  }
  s.step = 'END_POS';
};

/**
 * 位置轉型：能力長歪了就換個位置踢。
 * 邊鋒掉速轉前腰、後衛長出傳球轉後腰、中場長出對抗轉中鋒支點 ——
 * 這是「能力發展決定你是什麼球員」而不是反過來。
 */
STEPS.END_POS = (s, ctx, input) => {
  const p = s.player;
  const cd = s.career.counters.posSwitch || 0;
  if (!isPro(s) || !p.dpos || p.group === 'GK' || p.age < 21 || s.career.year - cd < 4) {
    s.step = 'END_SERVICE'; return;
  }
  const cur = ovr(p);
  const alt = Object.keys(DPOS)
    .filter(k => k !== 'GK' && k !== p.dpos)
    .map(k => ({ k, v: ovrAt(p, k) }))
    .sort((a, b) => b.v - a.v)[0];
  if (!alt || alt.v < cur + 3) { s.step = 'END_SERVICE'; return; }

  // 轉型是賭注，不是免費升級：年紀越大越難改，原型不合更難
  const arch = ARCHETYPE[p.arch];
  const fit = arch && arch.pos.includes(alt.k);
  const odds = clamp(80 - Math.max(0, p.age - 25) * 5 + (fit ? 8 : 0), 30, 88);

  if (input === undefined) {
    return ask(s, {
      type: 'choice', title: `位置會議：教練想把你改踢 ${DPOS[alt.k].n}`,
      options: [
        { v: 'try', t: `接受轉型（成功率 ${odds}%）`, warn: true,
          s: `成功可到綜合 ${alt.v} 上下；失敗則白費半個賽季，位置也回不去` },
        { v: 'keep', t: `繼續踢 ${DPOS[p.dpos].n}`, main: true,
          s: `守住現在的綜合 ${cur}，不冒險` },
      ],
    }, 'END_POS');
  }

  s.career.counters.posSwitch = s.career.year;
  if (input !== 'try') {
    card(ctx, '', '位置會議', `你選擇繼續踢 ${hl(DPOS[p.dpos].n)}。熟悉的位置，熟悉的跑位。`);
    s.step = 'END_SERVICE'; return;
  }

  if (ctx.rng.chance(odds)) {
    const from = DPOS[p.dpos].n;
    p.dpos = alt.k;
    if (!fit && p.arch) { p.arch = null; p.archEvolved = null; }
    // 適應良好：新位置最吃重的能力再長一點
    const key = Object.entries(POS_WEIGHT[alt.k]).sort((a, b) => b[1] - a[1])[0][0];
    const got = addAb(p, key, ctx.rng.int(2, 5));
    unlock(s, ctx, 'secondwind');
    card(ctx, 'gold', `位置轉型成功：${from} → ${DPOS[alt.k].n}`,
      `新的跑位一開始很陌生，但你的身體記住了。綜合 ${hl(cur)} → ${hl(ovr(p))}` +
      (got ? `，${ABIL[key]} ${up(got)}` : '') +
      (fit ? '' : '<br>原本的原型不再適用，下個賽季結束後會重新確立。'));
  } else {
    // 失敗：試了半季還是回到原位，而且這半季白費了
    p.injury.seasonFactor = Math.min(p.injury.seasonFactor, 0.75);
    s.club.minutes = clamp(s.club.minutes - 0.12, 0, 0.95);
    addFanRep(s, -5);
    card(ctx, 'bad', '轉型失敗',
      `教練試了半個賽季，最後還是把你放回 ${hl(DPOS[p.dpos].n)}。` +
      `<br>那半季你兩個位置都沒踢好，出場時間與狀態都受影響。`);
  }
  s.step = 'END_SERVICE';
};

/** 兵役：有徵兵制的國家，20–24 歲之間一定要面對一次 */
STEPS.END_SERVICE = (s, ctx, input) => {
  const p = s.player, nat = nationOf(p);
  const done = s.career.counters.service;
  if (done || !nat.service || p.age < 20 || p.age > 24 || !isPro(s)) { s.step = 'END_MOVE'; return; }

  if (input === undefined) {
    const options = [];
    if (s.career.caps >= 5) {
      options.push({ v: 'sub', t: '申請體育替代役', main: true,
        s: `國家隊 ${s.career.caps} 場，資格符合｜訓練不中斷` });
    }
    if (isAbroad(s)) {
      options.push({ v: 'defer', t: '海外役男延期',
        s: '人在國外可以先緩徵，但 30 歲前回國會受限' });
    }
    options.push({ v: 'serve', t: '入伍服完役期', warn: true,
      s: '少一個賽季、體能 −3，黃金期就這樣過去一年' });
    return ask(s, { type: 'choice', title: '兵役通知單寄到了', options }, 'END_SERVICE');
  }

  s.career.counters.service = input;
  if (input === 'sub') {
    card(ctx, 'good', '體育替代役',
      `代表隊的資歷幫了你。你以替代役身分繼續留在球隊訓練，一天都沒有停。`);
  } else if (input === 'defer') {
    card(ctx, 'info', '緩徵',
      `你在國外，兵單先押著。但這件事沒有消失，只是被推遲了。`);
  } else {
    p.service = 1;
    subAb(p, 'sta', 3);
    card(ctx, 'bad', '入伍',
      `理平頭那天你才發現，球鞋要收起來一整年。體能 ${dn(-3)}。<br>` +
      `黃金期的一年，就這樣過去了。`);
  }
  s.step = 'END_MOVE';
};

/* ---------------- 去向 ---------------- */

const where = (p, id) => (isHomeLeague(p, id) ? '國內' : REGION[LV[id].region]);

/**
 * 國內優先，其餘各地區輪流各取一個。
 * 重點是選單不能全是同一洲 —— 「要去哪個地區」本身就是這個遊戲的主要決策。
 */
function diversify(p, ids, rng, limit) {
  const byRegion = new Map();
  for (const id of rng.shuffle(ids.filter(x => !isHomeLeague(p, x)))) {
    if (!byRegion.has(LV[id].region)) byRegion.set(LV[id].region, []);
    byRegion.get(LV[id].region).push(id);
  }
  const out = ids.filter(id => isHomeLeague(p, id));
  for (let guard = 0; out.length < limit && guard < 8; guard++) {
    let added = false;
    for (const list of byRegion.values()) {
      if (!list.length || out.length >= limit) continue;
      out.push(list.shift());
      added = true;
    }
    if (!added) break;
  }
  return out.slice(0, limit);
}

/** 某一層級中能力與年齡窗口都過得去的聯賽 */
function reachable(s, tier) {
  const p = s.player, o = ovr(p);
  return leaguesAt(tier).filter(id =>
    id !== s.club.lv && o >= LV[id].min && ageWindow(p, id));
}

/** 往上一層 */
function upDests(s, rng) {
  const tier = LV[s.club.lv].tier;
  if (tier >= MAX_TIER) return [];
  return diversify(s.player, reachable(s, tier + 1), rng, 4);
}

/** 同級橫向轉會：換一個地區試試，薪水與聯賽風格都不一樣 */
function sideDests(s, rng) {
  const cur = LV[s.club.lv];
  const ids = reachable(s, cur.tier).filter(id => LV[id].region !== cur.region);
  return diversify(s.player, ids, rng, 2);
}

/** 往下一層 */
function downDests(s, rng) {
  const tier = LV[s.club.lv].tier;
  if (tier <= 1) return [];
  return diversify(s.player, leaguesAt(tier - 1).filter(id => ageWindow(s.player, id)), rng, 2);
}

/** 返回家鄉：挑國內談得下來的最高層級，談不下來就回最低那一層 */
function homeDest(s) {
  const nat = nationOf(s.player), o = ovr(s.player);
  const tiers = Object.keys(nat.home).map(Number).sort((a, b) => b - a);
  return tiers.find(t => o >= LV[nat.home[t]].min) !== undefined
    ? nat.home[tiers.find(t => o >= LV[nat.home[t]].min)]
    : nat.home[tiers[tiers.length - 1]];
}

/** 外租落點：優先回到熟悉的環境 */
function pickLeague(s, tier, rng) {
  const all = leaguesAt(tier);
  if (!all.length) return null;
  const home = all.filter(id => isHomeLeague(s.player, id));
  if (home.length && rng.chance(60)) return rng.pick(home);
  const ok = all.filter(id => ageWindow(s.player, id));
  return rng.pick(ok.length ? ok : all);
}

STEPS.END_MOVE = (s, ctx, input) => {
  const p = s.player, c = s.club;

  // 養成階段
  if (c.stage === 'JHS') {
    if (c.stageYear < CONF.jhsYears) { c.stageYear++; s.step = 'YEAR_ADVANCE'; return; }
    return youthPath(s, ctx, input);
  }
  if (c.stage === 'HS' || c.stage === 'ACADEMY' || c.stage === 'UNI') {
    const maxYear = c.stage === 'UNI' ? CONF.uniYears : CONF.hsYears;
    if (c.stageYear < maxYear) { c.stageYear++; s.step = 'YEAR_ADVANCE'; return; }
    return graduate(s, ctx, input);
  }

  // 職業
  const tier = LV[c.lv].tier;
  if (input === undefined) {
    const o = ovr(p);
    const options = [];

    const forced = s._forceMove || o < LV[c.lv].min - 3 || s.career.fanRep <= 20;
    if (forced) {
      card(ctx, 'bad', '戰力外通知',
        s.career.fanRep <= 20
          ? '球會受不了看台的壓力，決定把你賣掉。你必須找下一站。'
          : '球會告知不會續約，你必須找下一站。');
    }

    if (!forced) {
      options.push({ v: 'stay', t: '留隊競爭', main: true, s: `續留 ${c.club}，爭取更高的陣中地位` });
    }

    if (c.role === 'BENCH' || c.role === 'STAND') {
      options.push({ v: 'loan', t: '要求外租', s: '降一級但保證主力，累積出場數與成長' });
    }
    for (const id of upDests(s, ctx.rng)) {
      options.push({
        v: 'up:' + id, t: `挑戰 ${LV[id].n}`,
        s: `${where(p, id)}・門檻 ${LV[id].min}（你 ${o}）`,
      });
    }
    for (const id of sideDests(s, ctx.rng)) {
      options.push({
        v: 'side:' + id, t: `轉戰 ${LV[id].n}`,
        s: `${where(p, id)}・同級別，換個地區重新開始`,
      });
    }
    // 選了海外役男延期的人，30 歲前回國會被兵役卡住
    const deferred = s.career.counters.service === 'defer' && p.age < 30;
    if (isAbroad(s) && !deferred) {
      const back = homeDest(s);
      options.push({
        v: 'home:' + back, t: '返回家鄉',
        s: `回到 ${LV[back].n}，在熟悉的地方踢完剩下的日子`,
      });
    }
    for (const id of downDests(s, ctx.rng)) {
      options.push({
        v: 'down:' + id, t: `降級加盟 ${LV[id].n}`,
        s: `${where(p, id)}・下修舞台，換取出場時間與數據`,
      });
    }
    if (p.age >= 30) {
      options.push({ v: 'retire', t: '高掛球鞋', warn: true, s: '就此結束球員生涯' });
      if (coachQualified(s)) {
        options.push({ v: 'coach', t: '掛靴轉任教練', warn: true,
          s: `直接接下教鞭（成功率 ${coachOdds(s)}%）｜成功大幅提升收入與聲望，失敗則黯然離開` });
      }
    }

    return ask(s, { type: 'choice', title: '轉會窗開啟', options }, 'END_MOVE');
  }

  if (input === 'retire') return retire(s, ctx, '在還踢得動的時候，自己選擇了告別。');
  if (input === 'coach') return turnCoach(s, ctx);
  s._forceMove = undefined;

  const sep = input.indexOf(':');
  const kind = sep < 0 ? input : input.slice(0, sep);
  const to = sep < 0 ? null : input.slice(sep + 1);
  // 自己談成的轉會 —— 這是擺脫〈經紀人傀儡〉的唯一方式
  if (['up', 'side', 'down', 'home'].includes(kind)) s.career.counters.selfMove = 1;

  if (kind === 'stay') {
    c.yearsAtClub++;
    if (!p.traits.oneclub && c.yearsAtClub >= 10 &&
        s.career.honors.some(h => h.includes('冠軍'))) unlock(s, ctx, 'oneclub');
  } else if (kind === 'loan') {
    const dest = pickLeague(s, Math.max(1, tier - 1), ctx.rng);
    c.loanFrom = c.club;
    moveTo(s, dest, 3, ctx.rng, ctx);
    card(ctx, 'info', '外租', `以外租身分加盟 ${hl(c.club)}（${LV[dest].n}），母隊 ${c.loanFrom}。去踢球吧。`);
  } else if (kind === 'down') {
    moveTo(s, to, ctx.rng.chance(50) ? 2 : 3, ctx.rng, ctx);
    card(ctx, 'info', '轉會', `你放棄了更高的舞台，換來 ${hl(c.club)}（${LV[to].n}）的核心位置。`);
  } else if (kind === 'home') {
    const drop = LV[to].tier < tier;
    moveTo(s, to, ctx.rng.chance(40) ? 1 : 2, ctx.rng, ctx);
    card(ctx, 'info', '返鄉',
      `你回來了。${hl(c.club)}（${LV[to].n}）把 ${p.number} 號球衣留給你，` +
      `機場有球迷等著。${drop ? '層級是降了，但這裡有人記得你的名字。' : ''}`);
  } else if (kind === 'side') {
    const clubTier = ovr(p) >= LV[to].par + 4 ? (ctx.rng.chance(40) ? 1 : 2) : (ctx.rng.chance(55) ? 2 : 3);
    moveTo(s, to, clubTier, ctx.rng, ctx);
    card(ctx, 'info', '轉戰他鄉',
      `同一個級別，換一片天。你加盟了 ${hl(c.club)}（${LV[to].n}・${TIER[clubTier].n}）。`);
  } else if (kind === 'up') {
    const clubTier = ovr(p) >= LV[to].par + 5 ? (ctx.rng.chance(45) ? 1 : 2) : (ctx.rng.chance(50) ? 2 : 3);
    const abroad = !isHomeLeague(p, to);
    moveTo(s, to, clubTier, ctx.rng, ctx);
    card(ctx, 'gold', abroad ? '海外轉會成功' : '轉會成功',
      `你加盟了 ${hl(c.club)}（${LV[to].n}・${TIER[clubTier].n}）。` +
      (abroad ? '<br>行李收好，語言之後再學。' : ''));
    if (LV[to].tier === MAX_TIER && !p.traits.pioneer) unlock(s, ctx, 'pioneer');
    if (LV[to].tier >= 4 && s.career.fromAcademy && !p.traits.academy) unlock(s, ctx, 'academy');
  }

  // 年輕就在低階聯賽連續掙扎 → 被足球淘汰，這是「第二人生」劇本的主要入口
  if (p.age <= 24 && (s.career.counters.struggle || 0) >= 3 && ctx.rng.chance(38)) {
    return retire(s, ctx, '連續幾季都沒有人要你上場。最後一通電話沒有打來，你去找了別的工作。');
  }
  // 太年輕就重傷，有些人再也沒有回來
  if (p.age <= 22 && p.injury.bigCount >= 1 && ctx.rng.chance(12)) {
    return retire(s, ctx, '那次重傷之後，膝蓋再也撐不住訓練量。二十出頭就結束了。');
  }

  // 能力跌破底線就被淘汰（不分年齡：這是「第二人生」劇本的入口）
  if (LV[c.lv].tier === 1 && ovr(p) < LV[c.lv].min - 3 && ctx.rng.chance(55)) {
    return retire(s, ctx, `連 ${LV[c.lv].n} 都留不住你的位置，最後一份合約沒有續。`);
  }
  if (ovr(p) < LV[c.lv].min - 11 && p.age >= 30) {
    return retire(s, ctx, '沒有球會再遞出合約，你只好承認時間到了。');
  }
  s.step = 'YEAR_ADVANCE';
};

function moveTo(s, lv, clubTier, rng, ctx) {
  const pool = CLUBS[lv];
  // 候選太少就放寬到相鄰等級，並且盡量不要立刻回到同一支球隊 ——
  // 否則低階聯賽每個等級只有一兩支，玩家會一直看到同一個隊名
  let list = pool.filter(x => x.t === clubTier && x.n !== s.club.club);
  if (list.length < 2) {
    list = pool.filter(x => Math.abs(x.t - clubTier) <= 1 && x.n !== s.club.club);
  }
  if (!list.length) list = pool.filter(x => x.n !== s.club.club);
  if (!list.length) list = pool;
  const chosen = rng ? rng.pick(list) : list[0];

  // 離開一支球隊時結算球迷聲望：夠高就永遠留在那座球場的記憶裡
  if (s.club.stage === 'PRO' && s.club.club !== chosen.n) {
    if (s.career.fanRep >= CONF.fanRepLegend) {
      s.career.legends.push(s.club.club);
      if (s.career.fanRep >= 90 && ctx) unlock(s, ctx, 'idol');
    }
    (s.career.clubHistory = s.career.clubHistory || []).push(s.club.club);
    s.career.fanRep = CONF.fanRepOnMove; // 新東家重新認識你
  }

  s.club.lv = lv;
  s.club.club = chosen.n;
  s.club.tier = chosen.t;
  s.club.yearsAtClub = 0;
  s.club.stage = 'PRO';
  s.club.loanFrom = s.club.loanFrom || null;
}

/** 國中畢業：足球學校 vs 學校球隊，這是整個養成期最重的一次選擇 */
function youthPath(s, ctx, input) {
  const nat = nationOf(s.player);
  if (input === undefined) {
    return ask(s, {
      type: 'choice', title: '國中畢業：接下來三年要在哪裡踢球？',
      options: [
        { v: 'academy', t: '進足球學校（青訓梯隊）', main: true,
          s: '每年多 1–2 顆訓練骰，直接對接職業；但沒有升學這條退路' },
        { v: 'hs', t: '留在學校球隊',
          s: nat.uni ? '成長普通，保留升大學與其他人生選項' : '成長普通，課業與球隊兼顧' },
      ],
    }, 'END_MOVE');
  }
  const c = s.club;
  c.stageYear = 1;
  if (input === 'academy') {
    c.stage = 'ACADEMY'; c.lv = 'ACADEMY';
    c.club = ctx.rng.pick(YOUTH_CLUBS.ACADEMY[nat.region]);
    s.career.fromAcademy = true;
    card(ctx, 'gold', '進入青訓體系',
      `${hl(c.club)} 把你簽了下來。從今天起，足球是唯一的功課。`);
  } else {
    c.stage = 'HS'; c.lv = 'HS';
    c.club = ctx.rng.pick(YOUTH_CLUBS.HS[nat.region]);
    card(ctx, 'info', '高中校隊', `你進了 ${hl(c.club)}，一邊念書一邊踢球。`);
  }
  s.step = 'YEAR_ADVANCE';
}

/** 畢業分流：依能力列出談得下來的層級，國內優先 */
function graduate(s, ctx, input) {
  const p = s.player, o = ovr(p), nat = nationOf(p);
  const fromAcademy = s.club.stage === 'ACADEMY';

  if (input === undefined) {
    const options = [];
    for (const t of [3, 2, 1]) {
      const dests = leaguesAt(t).filter(id => o >= LV[id].min && ageWindow(p, id));
      if (!dests.length) continue;
      const home = dests.filter(id => isHomeLeague(p, id));
      const id = home.length ? home[0] : ctx.rng.pick(dests);
      options.push({
        v: 'pro:' + id, t: `加入 ${LV[id].n}`, main: options.length === 0,
        s: `${where(p, id)}・門檻 ${LV[id].min}（你 ${o}）`,
      });
    }
    if (s.club.stage === 'HS' && nat.uni) {
      options.push({ v: 'uni', t: '升學打大學聯賽', s: '多四年養成時間，晚一點再進職業' });
    }
    if (!options.length) {
      card(ctx, 'bad', fromAcademy ? '青訓釋出' : '沒有球會來看',
        fromAcademy ? '學院沒有把你留下來。三年只練球的代價，現在要自己承擔。'
                    : '整個球季沒有球探留下你的名字。');
    }
    if (!options.some(x => x.v.startsWith('pro:'))) {
      options.push({ v: 'quit', t: '離開足球', warn: true, s: `能力 ${o} 不足以簽下任何一份職業合約` });
    }
    return ask(s, { type: 'choice', title: '畢業了，接下來？', options }, 'END_MOVE');
  }

  if (input === 'quit') {
    return retire(s, ctx, fromAcademy
      ? '青訓合約沒有續。你把球鞋收進櫃子，開始想接下來要做什麼。'
      : '沒有球會遞出合約。你把球鞋收進櫃子，去找了一份工作。');
  }
  if (input === 'uni') {
    s.club.stage = 'UNI'; s.club.lv = 'UNI'; s.club.stageYear = 1;
    s.career.wentUni = true;
    s.club.club = ctx.rng.pick(YOUTH_CLUBS.UNI[nat.region]);
    card(ctx, 'info', '進入大學', `你選擇了 ${hl(s.club.club)}，繼續在校隊磨練。`);
  } else {
    const lv = input.slice(4);
    moveTo(s, lv, 3, ctx.rng, ctx);
    card(ctx, 'gold', '職業生涯開始',
      `你與 ${hl(s.club.club)}（${LV[lv].n}）簽下第一份職業合約。` +
      (isAbroad(s) ? '<br>第一次一個人出國，行李比想像中輕。' : ''));
  }
  s.step = 'YEAR_ADVANCE';
}

/* ---------------- 年度推進 ---------------- */
STEPS.YEAR_ADVANCE = (s, ctx, input) => {
  if (s.career.pool > 0) {
    if (input === undefined) {
      return ask(s, {
        type: 'alloc', title: `國際賽成果：分配 ${s.career.pool} 點`,
        pool: s.career.pool,
      }, 'YEAR_ADVANCE');
    }
    for (const [k, v] of Object.entries(input)) addAb(s.player, k, v);
    s.career.pool = 0;
  }
  s.player.age++;
  s.career.year++;
  s.step = 'YEAR_START';
};

/* ---------------- 轉任教練 ---------------- */

/**
 * 帶得動人不等於踢得好：看的是閱讀比賽的能力、更衣室地位與學歷，
 * 而不是速度或射門。
 */
function coachQualified(s) {
  const p = s.player;
  const brain = Math.max(p.ab.vis ?? 0, p.ab.pas ?? 0, p.ab.pos ?? 0);
  return brain >= 68 || !!p.traits.captain || !!s.career.wentUni;
}

function coachOdds(s) {
  const p = s.player;
  const brain = Math.max(p.ab.vis ?? 0, p.ab.pas ?? 0, p.ab.pos ?? 0);
  let v = 34;
  v += clamp((brain - 62) * 0.9, 0, 22);          // 閱讀比賽的能力
  if (p.traits.captain) v += 15;                  // 帶過更衣室
  if (s.career.wentUni) v += 10;                  // 唸過書、懂得表達
  if (p.traits.tempo) v += 5;
  if (p.traits.cancer) v -= 20;                   // 更衣室毒瘤沒人敢用
  v += clamp((s.career.fanRep - 50) * 0.2, -10, 12);
  return Math.round(clamp(v, 20, 90));
}

function turnCoach(s, ctx) {
  const p = s.player;
  const odds = coachOdds(s);
  const win = ctx.rng.chance(odds);
  const base = annualSalary(s) || 200;

  if (win) {
    const years = ctx.rng.int(6, 14);
    const pay = Math.round(base * 0.5 * years);
    s.career.salaryTotal += pay;
    addFanRep(s, 18);
    s.career.honors.push(`${s.career.year} 起執教 ${years} 年`);
    s.career.coach = { win: true, years, pay };
    unlock(s, ctx, 'gaffer');
    card(ctx, 'gold', '掛靴轉任教練',
      `你把球鞋收進櫃子，換上西裝站到場邊。` +
      `<br>執教 ${hl(years)} 年，教練生涯收入 ${hl(fmtMoney(pay))}，球迷聲望 ${up(18)}。`);
    return retire(s, ctx, '以教練的身分留在了這項運動裡。');
  }

  const pay = Math.round(base * 0.5 * 2);
  s.career.salaryTotal += pay;
  addFanRep(s, -12);
  s.career.coach = { win: false, years: 2, pay };
  card(ctx, 'bad', '執教失敗',
    `兩個賽季、一次降級，然後是那通電話。` +
    `<br>球員時代的名聲沒能換成教練的權威，聲望 ${dn(-12)}。`);
  return retire(s, ctx, '教鞭只拿了兩年就被收走，你離開了這項運動。');
}

/* ---------------- 引退與傳奇評分 ---------------- */
function retire(s, ctx, reason) {
  const p = s.player;
  const sum = s.career.seasons.reduce((a, x) => ({
    apps: a.apps + x.apps, goals: a.goals + x.goals, assists: a.assists + x.assists, cs: a.cs + x.cs,
  }), { apps: 0, goals: 0, assists: 0, cs: 0 });

  const HONOR_PT = [
    [/世界足球先生/, 900], [/世界盃會內賽/, 800], [/歐洲冠軍賽冠軍/, 300],
    [/亞洲冠軍賽冠軍/, 180], [/年度最佳球員/, 420], [/金靴|金手套/, 200],
    [/年度最佳陣容/, 80], [/冠軍/, 120],
  ];
  const LV_W = { BIG5: 1.6, EUR2: 1.25, TOP: 1.0, HOME: 0.7 };
  let dataScore = 0;
  s.career.seasons.forEach(x => {
    const w = LV_W[LV[x.lv]?.top] || 0.6;
    dataScore += (x.goals * 8 + x.assists * 5 + x.apps * 1.2 + x.cs * 6) * w;
  });
  let honorScore = 0;
  s.career.honors.forEach(h => {
    for (const [re, pt] of HONOR_PT) if (re.test(h)) { honorScore += pt; break; }
  });
  honorScore += s.career.caps * 4;
  const fanScore = (s.career.fanRep - 50) * 12;
  const legacy = Math.max(0, Math.round(dataScore + honorScore + fanScore));

  // 特殊結局：聲望夠高又待得夠久，這座球場會永遠留著你的號碼
  const shirtRetired = s.career.fanRep >= 90 && s.club.yearsAtClub >= 8;
  if (shirtRetired) {
    unlock(s, ctx, 'idol');
    card(ctx, 'gold', '★ 球衣退休 ★',
      `${s.club.club} 宣布永久保留 ${p.number} 號。球場外要立一座你的塑像，` +
      `揭幕那天，看台上的人比你踢過的任何一場都多。`);
  }
  if (s.career.fanRep >= CONF.fanRepLegend && !s.career.legends.includes(s.club.club)) {
    s.career.legends.push(s.club.club);
  }

  const topLv = s.career.seasons.reduce((best, x) => {
    const order = { BIG5: 4, EUR2: 3, TOP: 2, HOME: 1 };
    const t = LV[x.lv]?.top;
    return t && (order[t] || 0) > (order[best] || 0) ? t : best;
  }, 'HOME');
  // 低階聯賽的門檻更高：同樣的評分，在小聯賽代表你更接近那個層級的天花板
  const GATE = {
    BIG5: [5200, 3800, 2800, 2000], EUR2: [6200, 4600, 3400, 2400],
    TOP: [7000, 5200, 3800, 2600], HOME: [8500, 6200, 4400, 3000],
  }[topLv];
  const RANK = ['世界級傳奇', '洲際級名將', '聯賽級主力', '職業球員', '半職業'];
  const rank = RANK[GATE.findIndex(g => legacy >= g)] ?? RANK[4];

  if (legacy < GATE[2] && Object.values(p.pot).reduce((a, b) => a + b, 0) < 640) unlock(s, ctx, 'grinder');

  trackPeak(s);          // 最後一年沒有下一次 YEAR_START，收尾補記一次
  s.done = true;
  s.pending = null;
  s.result = {
    reason, rank, legacy, topLv, sum,
    nation: nationOf(p).n,
    origin: ORIGINS[p.origin]?.n,
    arch: ARCHETYPE[p.arch]?.n,
    archEvolved: p.archEvolved && ARCHETYPE[p.arch]?.evolve?.n,
    fanRep: Math.round(s.career.fanRep),
    legends: s.career.legends,
    shirtRetired,
    removed: p.removed,
    natlTeam: (NATIONS[p.natlPick] || nationOf(p)).n,
    abroadSeasons: s.career.seasons.filter(x => x.abroad).length,
    coach: s.career.coach || null,
    seasons: s.career.seasons.length,
    honors: s.career.honors,
    caps: s.career.caps, intlGoals: s.career.intlGoals,
    worldCups: s.career.worldCups,
    salary: s.career.salaryTotal,
    traits: Object.keys(p.traits).filter(k => p.traits[k]).map(k => TRAITS[k]?.n).filter(Boolean),
  };
  card(ctx, 'gold', '生涯結束', reason);
}

export { retire as _retire };
