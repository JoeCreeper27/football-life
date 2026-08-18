import { clamp } from './rng.js';
import {
  LV, CLUBS, YOUTH_CLUBS, TIER, DPOS, EVENTS, TRAITS, ABIL, CONF, POS_GROUP,
  NATIONS, ORIGINS, REGION, MAX_TIER, leaguesAt,
} from './data.js';
import {
  rngOf, syncCursor, addAb, subAb, ovr, defaultPos, posQualified, squadGap,
  nationOf, regionOf, isHomeLeague, isAbroad, ageWindow,
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

  if (p.injury.rehab > 0) {
    p.injury.rehab--;
    p.injury.seasonFactor = 0.0;
    card(ctx, 'bad', '復健年', '整季在復健室度過。這一年沒有比賽，只有無數次的重訓與跑步機。');
  }

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
 * 訓練骰數依養成階段不同：國中最少、足球學校最多。
 * 這是「進足球學校 vs 留校隊」這個選擇的主要機制差異。
 */
function diceCount(s, rng) {
  const st = s.club.stage;
  if (st === 'JHS') return rng.chance(55) ? 2 : 3;
  if (st === 'HS') return rng.chance(50) ? 3 : 4;
  if (st === 'ACADEMY') return rng.chance(45) ? 4 : 5;
  if (st === 'UNI') return rng.chance(50) ? 3 : 4;
  return rng.chance(35) ? 3 : rng.chance(62) ? 4 : rng.chance(80) ? 5 : 6;
}

STEPS.PRE_DICE = (s, ctx, input) => {
  const p = s.player;
  if (input === undefined) {
    let n = diceCount(s, ctx.rng);
    if (p.injury.rehab > 0 || p.injury.seasonFactor === 0) n = 2;
    if (p.traits.benched) n = Math.max(2, n - 1);
    if (p.origin === 'immigrant' && p.age <= 15) n = Math.max(1, n - 1); // 適應期
    const floor = p.traits.golden ? 4 : 1;
    const dice = Array.from({ length: n }, () => ctx.rng.int(floor, 6));
    dice.forEach(d => { if (d === 6) s.career.counters.six++; });
    if (!p.traits.golden && s.career.counters.six >= 5 && p.age <= 22) unlock(s, ctx, 'golden');
    return ask(s, { type: 'alloc', title: '季前特訓：分配訓練骰', dice }, 'PRE_DICE');
  }
  // input: { 能力key: 點數 }
  const gains = [];
  for (const [k, v] of Object.entries(input)) {
    const got = addAb(p, k, v);
    if (got > 0) gains.push(`${ABIL[k]} ${up(got)}`);
  }
  if (gains.length) card(ctx, '', '季前特訓成果', gains.join('、'));
  s.step = isPro(s) ? 'PRE_STYLE' : 'PRE_SQUAD';
};

STEPS.PRE_STYLE = (s, ctx, input) => {
  if (input === undefined) {
    return ask(s, {
      type: 'choice', title: '本季踢法',
      options: [
        { v: '全場壓迫', t: '全場壓迫', s: '表現 +1、產能 +8%｜身體負荷 ×1.25' },
        { v: '標準', t: '標準', s: '標準表現與負荷', main: true },
        { v: '節省體力', t: '節省體力', s: '表現 −1｜負荷 ×0.7，延長生涯' },
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
STEPS.MID_EVENTS = (s, ctx, input) => {
  const p = s.player;
  s.phase = 'MIDSEASON';
  if (s._ev === undefined) s._ev = isPro(s) ? CONF.eventCards : 2;

  if (input === undefined) {
    if (s._ev <= 0 || p.injury.seasonFactor === 0) { s._ev = undefined; s._card = undefined; s.step = 'MID_INJURY'; return; }
    const pool = EVENTS.filter(e =>
      e.for === '*' ||
      (e.for === 'GK' && p.group === 'GK') ||
      (e.for === 'OUT' && p.group !== 'GK') ||
      (e.for === 'PRO' && isPro(s)) ||
      (e.for === 'ABROAD' && isPro(s) && isAbroad(s)));
    const ev = ctx.rng.pick(pool);
    s._card = ev.n;
    const odds = evOdds(p);
    return ask(s, {
      type: 'choice', title: `事件｜${ev.n} — 你要怎麼應對？`,
      options: [
        { v: 'bold', t: '全力一搏', warn: true, s: `成功率 ${odds.bold}%｜幅度 ±3` },
        { v: 'norm', t: '照常執行', main: true, s: `成功率 ${odds.norm}%｜幅度 ±2` },
        { v: 'safe', t: '保守應對', s: `成功率 ${odds.safe}%｜幅度 ±1` },
      ],
    }, 'MID_EVENTS');
  }

  const ev = EVENTS.find(e => e.n === s._card);
  const odds = evOdds(p);
  const rate = { bold: odds.bold, norm: odds.norm, safe: odds.safe }[input];
  const mag = { bold: 3, norm: 2, safe: 1 }[input];
  const win = ctx.rng.chance(rate);
  if (input === 'bold') { s.career.counters.bold++; if (win) s.career.counters.boldWin++; }

  const table = win ? ev.g : ev.b;
  const parts = [];
  for (const [k, v] of Object.entries(table)) {
    const amt = Math.max(1, Math.round(Math.abs(v) * (mag / 2)));
    if (k === 'inj') { p.injury.nextRisk += win ? -amt : amt; parts.push(`受傷率 ${win ? dn(-amt) : up(amt)}`); continue; }
    let key = k;
    if (k === 'rand') key = ctx.rng.pick(Object.keys(p.ab));
    if (!(key in p.ab)) continue;
    if (v > 0) { const g = addAb(p, key, amt); parts.push(g ? `${ABIL[key]} ${up(g)}` : `${ABIL[key]} 蓄力中`); }
    else { const g = subAb(p, key, amt); parts.push(`${ABIL[key]} ${dn(g)}`); }
  }
  card(ctx, win ? 'good' : 'bad', `${ev.n}｜${win ? '成功' : '失敗'}`,
    `${win ? ev.gt : ev.bt}<br>${parts.join('、') || '沒有明顯影響'}`);

  if (!win && ev.n === '社群媒體風波' && ctx.rng.chance(40)) unlock(s, ctx, 'socialko');
  s._ev--; s._card = undefined;
};

function evOdds(p) {
  let base = p.traits.golden ? 70 : 50;
  if (p.traits.socialko) base -= 10;
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
    const big = ctx.rng.chance(p.age >= 32 ? 24 : 13);
    if (big) {
      p.injury.bigCount++;
      p.injury.seasonFactor = 0;
      subAb(p, 'pac', 5); subAb(p, 'sta', 3);
      card(ctx, 'bad', '重傷', `一次落地讓整個賽季結束。速度 ${dn(-5)}、體能 ${dn(-3)}。`);
      if (p.age < 30 && p.injury.bigCount >= 2) unlock(s, ctx, 'glass');
      s.career.counters.ironStreak = 0;
    } else {
      const weeks = ctx.rng.int(4, 10);
      p.injury.seasonFactor = clamp(1 - weeks / 34, 0.4, 0.95);
      card(ctx, 'bad', '傷勢', `肌肉拉傷，缺陣約 ${weeks} 週。本季出場與數據都會打折。`);
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
    subAb(p, 'pac', 5);
    card(ctx, 'bad', '膝蓋發出警訊',
      `長期累積的負荷讓十字韌帶亮起紅燈，速度先掉了 ${dn(-5)}。醫療團隊把選擇權交給你。`);
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
    const back = ctx.rng.int(3, 8);
    addAb(p, 'pac', back);
    card(ctx, 'bad', '十字韌帶手術', `整季報銷。漫長復健後速度回復 ${up(back)}。`);
    if (p.injury.aclCount >= 2) {
      Object.keys(p.ab).forEach(k => { if (k === 'pac') p.ab[k] = Math.round(p.ab[k] / 2); });
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
      subAb(p, 'pac', 5);
      s.career.counters.gambleWin = 0;
      card(ctx, 'bad', '重大韌帶斷裂', `賭輸了。整季報銷、隔年也難全恢復，速度再 ${dn(-5)}。`);
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
  s.career.seasons.push(st);
  s.career.clubTally[c.club] = (s.career.clubTally[c.club] || 0) + 1;

  const line = p.group === 'GK'
    ? `${st.apps} 場｜零封 ${hl(st.cs)}｜評分 ${hl(st.rating)}`
    : `${st.apps} 場｜進球 ${hl(st.goals)}｜助攻 ${hl(st.assists)}｜評分 ${hl(st.rating)}`;
  card(ctx, '', `${s.career.year} 賽季成績`,
    `${c.club}・${DPOS[st.dpos]?.n || ''}<br>${line}<br>出場率 ${st.minutes}%`);
  s.step = 'END_SALARY';
};

/* ---------------- 季末 ---------------- */
STEPS.END_SALARY = (s, ctx) => {
  s.phase = 'SEASON_END';
  if (isPro(s)) {
    const sal = annualSalary(s);
    s.career.salaryTotal += sal;
    card(ctx, '', '季末結算',
      `本年度薪資 ${hl(fmtMoney(sal))}（生涯累計 ${fmtMoney(s.career.salaryTotal)}）`);
  }
  s.step = 'END_AWARDS';
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
  // 上限壓在 60：足球強國的國腳名額極難擠，但不能高到綜合評價根本碰不到
  const base = clamp(nat.natl * 0.45 + 26, 40, 60);
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
  if (p.natlPicked || !p.altNation || p.age < 18) { s.step = 'END_MOVE'; return; }
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

    if (o < LV[c.lv].min - 3) {
      card(ctx, 'bad', '戰力外通知', '球會告知不會續約，你必須找下一站。');
    }

    options.push({ v: 'stay', t: '留隊競爭', main: true, s: `續留 ${c.club}，爭取更高的陣中地位` });

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
    if (isAbroad(s)) {
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
    if (p.age >= 30) options.push({ v: 'retire', t: '高掛球鞋', warn: true, s: '就此結束球員生涯' });

    return ask(s, { type: 'choice', title: '轉會窗開啟', options }, 'END_MOVE');
  }

  if (input === 'retire') return retire(s, ctx, '在還踢得動的時候，自己選擇了告別。');

  const sep = input.indexOf(':');
  const kind = sep < 0 ? input : input.slice(0, sep);
  const to = sep < 0 ? null : input.slice(sep + 1);

  if (kind === 'stay') {
    c.yearsAtClub++;
    if (!p.traits.oneclub && c.yearsAtClub >= 10 &&
        s.career.honors.some(h => h.includes('冠軍'))) unlock(s, ctx, 'oneclub');
  } else if (kind === 'loan') {
    const dest = pickLeague(s, Math.max(1, tier - 1), ctx.rng);
    c.loanFrom = c.club;
    moveTo(s, dest, 3, ctx.rng);
    card(ctx, 'info', '外租', `以外租身分加盟 ${hl(c.club)}（${LV[dest].n}），母隊 ${c.loanFrom}。去踢球吧。`);
  } else if (kind === 'down') {
    moveTo(s, to, ctx.rng.chance(50) ? 2 : 3, ctx.rng);
    card(ctx, 'info', '轉會', `你放棄了更高的舞台，換來 ${hl(c.club)}（${LV[to].n}）的核心位置。`);
  } else if (kind === 'home') {
    const drop = LV[to].tier < tier;
    moveTo(s, to, ctx.rng.chance(40) ? 1 : 2, ctx.rng);
    card(ctx, 'info', '返鄉',
      `你回來了。${hl(c.club)}（${LV[to].n}）把 ${p.number} 號球衣留給你，` +
      `機場有球迷等著。${drop ? '層級是降了，但這裡有人記得你的名字。' : ''}`);
  } else if (kind === 'side') {
    const clubTier = ovr(p) >= LV[to].par + 3 ? (ctx.rng.chance(40) ? 1 : 2) : (ctx.rng.chance(55) ? 2 : 3);
    moveTo(s, to, clubTier, ctx.rng);
    card(ctx, 'info', '轉戰他鄉',
      `同一個級別，換一片天。你加盟了 ${hl(c.club)}（${LV[to].n}・${TIER[clubTier].n}）。`);
  } else if (kind === 'up') {
    const clubTier = ovr(p) >= LV[to].par + 4 ? (ctx.rng.chance(45) ? 1 : 2) : (ctx.rng.chance(50) ? 2 : 3);
    const abroad = !isHomeLeague(p, to);
    moveTo(s, to, clubTier, ctx.rng);
    card(ctx, 'gold', abroad ? '海外轉會成功' : '轉會成功',
      `你加盟了 ${hl(c.club)}（${LV[to].n}・${TIER[clubTier].n}）。` +
      (abroad ? '<br>行李收好，語言之後再學。' : ''));
    if (LV[to].tier === MAX_TIER && !p.traits.pioneer) unlock(s, ctx, 'pioneer');
    if (LV[to].tier >= 4 && s.career.fromAcademy && !p.traits.academy) unlock(s, ctx, 'academy');
  }

  // 能力跌破底線就被淘汰（不分年齡：這是「第二人生」劇本的入口）
  if (LV[c.lv].tier === 1 && ovr(p) < LV[c.lv].min - 2 && ctx.rng.chance(55)) {
    return retire(s, ctx, `連 ${LV[c.lv].n} 都留不住你的位置，最後一份合約沒有續。`);
  }
  if (ovr(p) < LV[c.lv].min - 8 && p.age >= 30) {
    return retire(s, ctx, '沒有球會再遞出合約，你只好承認時間到了。');
  }
  s.step = 'YEAR_ADVANCE';
};

function moveTo(s, lv, clubTier, rng) {
  const pool = CLUBS[lv];
  const cands = pool.filter(x => x.t === clubTier);
  const list = cands.length ? cands : pool;
  const chosen = rng ? rng.pick(list) : list[0];
  s.club.lv = lv;
  s.club.club = chosen.n;
  s.club.tier = chosen.t;
  s.club.yearsAtClub = 0;
  s.club.stage = 'PRO';
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
    s.club.club = ctx.rng.pick(YOUTH_CLUBS.UNI[nat.region]);
    card(ctx, 'info', '進入大學', `你選擇了 ${hl(s.club.club)}，繼續在校隊磨練。`);
  } else {
    const lv = input.slice(4);
    moveTo(s, lv, 3, ctx.rng);
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
  const legacy = Math.round(dataScore + honorScore);

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

  if (legacy < GATE[2] && Object.values(p.pot).reduce((a, b) => a + b, 0) < 480) unlock(s, ctx, 'grinder');

  s.done = true;
  s.pending = null;
  s.result = {
    reason, rank, legacy, topLv, sum,
    nation: nationOf(p).n,
    origin: ORIGINS[p.origin]?.n,
    natlTeam: (NATIONS[p.natlPick] || nationOf(p)).n,
    abroadSeasons: s.career.seasons.filter(x => x.abroad).length,
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
