import { clamp } from './rng.js';
import {
  LV, LADDER, CLUBS, TIER, DPOS, EVENTS, TRAITS, ABIL, CONF, POS_GROUP,
} from './data.js';
import {
  rngOf, syncCursor, addAb, subAb, ovr, defaultPos, posQualified, squadGap,
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
STEPS.YEAR_START = (s, ctx) => {
  const stage = s.club.stage === 'HS' ? `高${'一二三'[s.club.stageYear - 1]}`
    : s.club.stage === 'UNI' ? `大${'一二三四'[s.club.stageYear - 1]}`
    : LV[s.club.lv].n;
  ctx.cards.push({ divider: `${s.career.year} 年 · ${s.player.age} 歲 · ${stage}` });
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

STEPS.PRE_DICE = (s, ctx, input) => {
  const p = s.player;
  if (input === undefined) {
    let n = ctx.rng.chance(35) ? 3 : ctx.rng.chance(62) ? 4 : ctx.rng.chance(80) ? 5 : 6;
    if (p.injury.rehab > 0 || p.injury.seasonFactor === 0) n = 2;
    if (p.traits.benched) n = Math.max(2, n - 1);
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
      (e.for === 'PRO' && isPro(s)));
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

/** 國家隊：兩年一循環，個人能力只提供小幅加成 */
STEPS.END_INTL = (s, ctx) => {
  const p = s.player;
  if (!isPro(s) || p.age < 19 || ovr(p) < 48 || s.career.year % 2 !== 0) { s.step = 'END_MOVE'; return; }

  const caps = ctx.rng.int(4, 9);
  s.career.caps += caps;
  const goals = p.group === 'FW' ? ctx.rng.int(0, 4) : ctx.rng.int(0, 2);
  s.career.intlGoals += goals;
  s.career.pool += 2;

  // 中華隊整體實力每屆隨機，個人最多提供 +10% 加成
  const teamStrength = ctx.rng.int(30, 62) + clamp((ovr(p) - 55) * 0.6, 0, 8);
  const worldCup = s.career.year % 4 === 0;
  if (worldCup) {
    const qualify = teamStrength >= 66 && ctx.rng.chance(clamp(teamStrength - 58, 1, 22));
    if (qualify) {
      s.career.worldCups.push(s.career.year);
      s.career.honors.push(`${s.career.year} 世界盃會內賽`);
      card(ctx, 'gold', '★ 世界盃資格賽晉級 ★',
        `終場哨響，全場的人都哭了。台灣代表隊史上第一次踢進世界盃會內賽，而你在場上。`);
      unlock(s, ctx, 'national');
    } else {
      card(ctx, 'bad', '世界盃資格賽',
        `${caps} 場國家隊出賽，進球 ${goals}。差一步，還是差一步。`);
    }
  } else {
    card(ctx, '', '國家隊徵召',
      `本輪代表隊出賽 ${hl(caps)} 場、進球 ${goals}（生涯 ${s.career.caps} 場）。獲得 2 點能力點。`);
  }
  if (!p.traits.national && s.career.caps >= 40) unlock(s, ctx, 'national');
  s.step = 'END_MOVE';
};

/* ---------------- 去向 ---------------- */
STEPS.END_MOVE = (s, ctx, input) => {
  const p = s.player, c = s.club;

  // 業餘階段
  if (c.stage === 'HS' || c.stage === 'UNI') {
    const maxYear = c.stage === 'HS' ? 3 : 4;
    if (c.stageYear < maxYear) { c.stageYear++; s.step = 'YEAR_ADVANCE'; return; }
    return graduate(s, ctx, input);
  }

  // 職業
  if (input === undefined) {
    const o = ovr(p);
    const idx = LADDER.indexOf(c.lv);
    const options = [];

    if (o < LV[c.lv].min - 3) {
      card(ctx, 'bad', '戰力外通知', '球會告知不會續約，你必須找下一站。');
    }

    options.push({ v: 'stay', t: '留隊競爭', main: true, s: `續留 ${c.club}，爭取更高的陣中地位` });

    if (c.role === 'BENCH' || c.role === 'STAND') {
      options.push({ v: 'loan', t: '要求外租', s: '降一級但保證主力，累積出場數與成長' });
    }
    if (idx > 0) {
      options.push({ v: 'down', t: '申請轉會（降級當核心）', s: `轉往 ${LV[LADDER[idx - 1]].n} 的中游球隊` });
    }
    const nextLv = LADDER[idx + 1];
    if (nextLv && o >= LV[nextLv].min && ageWindow(p.age, nextLv)) {
      options.push({ v: 'up', t: `挑戰 ${LV[nextLv].n}`, s: `有球會遞出報價（能力 ${o} ≥ 門檻 ${LV[nextLv].min}）` });
    }
    if (p.age >= 30) options.push({ v: 'retire', t: '高掛球鞋', warn: true, s: '就此結束球員生涯' });

    return ask(s, { type: 'choice', title: '轉會窗開啟', options }, 'END_MOVE');
  }

  const idx = LADDER.indexOf(c.lv);
  if (input === 'retire') return retire(s, ctx, '在還踢得動的時候，自己選擇了告別。');

  if (input === 'stay') {
    c.yearsAtClub++;
    if (!p.traits.oneclub && c.yearsAtClub >= 10 &&
        s.career.honors.some(h => h.includes('冠軍'))) unlock(s, ctx, 'oneclub');
  } else if (input === 'loan') {
    const to = LADDER[Math.max(0, idx - 1)];
    c.loanFrom = c.club;
    moveTo(s, to, 3, ctx.rng);
    card(ctx, 'info', '外租', `以外租身分加盟 ${hl(c.club)}（${LV[to].n}），母隊 ${c.loanFrom}。去踢球吧。`);
  } else if (input === 'down') {
    moveTo(s, LADDER[Math.max(0, idx - 1)], ctx.rng.chance(50) ? 2 : 3, ctx.rng);
    card(ctx, 'info', '轉會', `你放棄了更高的舞台，換來 ${hl(c.club)} 的核心位置。`);
  } else if (input === 'up') {
    const to = LADDER[idx + 1];
    const tier = ovr(p) >= LV[to].par + 4 ? (ctx.rng.chance(45) ? 1 : 2) : (ctx.rng.chance(50) ? 2 : 3);
    moveTo(s, to, tier, ctx.rng);
    card(ctx, 'gold', '轉會成功', `你加盟了 ${hl(c.club)}（${LV[to].n}・${TIER[tier].n}）。`);
    if (to === 'BIG5' && !p.traits.pioneer) unlock(s, ctx, 'pioneer');
  }

  // 能力跌破底線就被淘汰（不分年齡：這是「第二人生」劇本的入口）
  const bottom = LADDER.indexOf(c.lv) === 0;
  if (bottom && ovr(p) < LV[c.lv].min - 2 && ctx.rng.chance(55)) {
    return retire(s, ctx, '連企業聯賽都留不住你的位置，最後一份合約沒有續。');
  }
  if (ovr(p) < LV[c.lv].min - 8 && p.age >= 30) {
    return retire(s, ctx, '沒有球會再遞出合約，你只好承認時間到了。');
  }
  s.step = 'YEAR_ADVANCE';
};

function ageWindow(age, lv) {
  if (lv === 'BIG5') return age <= 27;
  if (lv === 'CHAMP' || lv === 'EUR2') return age <= 29;
  return age <= 33;
}

function moveTo(s, lv, tier, rng) {
  const pool = CLUBS[lv] || CLUBS.TPFL;
  const cands = pool.filter(x => x.t === tier);
  const list = cands.length ? cands : pool;
  const chosen = rng ? rng.pick(list) : list[0];
  s.club.lv = lv;
  s.club.club = chosen.n;
  s.club.tier = chosen.t;
  s.club.yearsAtClub = 0;
  s.club.stage = 'PRO';
}

/** 畢業分流 */
function graduate(s, ctx, input) {
  const p = s.player, o = ovr(p);
  if (input === undefined) {
    const options = [];
    if (s.club.stage === 'HS') options.push({ v: 'uni', t: '升學打大專聯賽', s: '多四年養成時間，25 歲前受傷率較低' });
    if (o >= LV.TPFL.min - 2) {
      options.push({ v: 'tpfl', t: '投入台灣企業足球聯賽', main: true, s: `半職業起步（門檻 ${LV.TPFL.min}）` });
    } else {
      options.push({ v: 'quit', t: '離開足球', warn: true, s: `能力 ${o} 不足以簽下職業合約` });
    }
    if (o >= 42) options.push({ v: 'jp', t: '赴日測試', s: `J3 起步（能力 ${o} ≥ 42）` });
    if (o >= 48) options.push({ v: 'eu', t: '歐洲青訓試訓', warn: true, s: `直闖歐洲跳板聯賽（能力 ${o} ≥ 48）` });
    return ask(s, { type: 'choice', title: '畢業了，接下來？', options }, 'END_MOVE');
  }
  if (input === 'quit') return retire(s, ctx, '沒有球會遞出合約。你把球鞋收進櫃子，去找了一份工作。');
  if (input === 'uni') {
    s.club.stage = 'UNI'; s.club.lv = 'UNI'; s.club.stageYear = 1;
    s.club.club = ctx.rng.pick(CLUBS.UNI);
    card(ctx, 'info', '進入大學', `你選擇了 ${hl(s.club.club)}，繼續在校隊磨練。`);
  } else {
    const map = { tpfl: 'TPFL', jp: 'J3', eu: 'EUR2' };
    const lv = map[input];
    moveTo(s, lv, 3, ctx.rng);
    card(ctx, 'gold', '職業生涯開始', `你與 ${hl(s.club.club)}（${LV[lv].n}）簽下第一份職業合約。`);
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
  const LV_W = { BIG5: 1.6, EUR2: 1.25, ASIA: 1.0, TPFL: 0.7 };
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
    const order = { BIG5: 4, EUR2: 3, ASIA: 2, TPFL: 1 };
    const t = LV[x.lv]?.top;
    return t && (order[t] || 0) > (order[best] || 0) ? t : best;
  }, 'TPFL');
  const GATE = {
    BIG5: [5200, 3800, 2800, 2000], EUR2: [6200, 4600, 3400, 2400],
    ASIA: [7000, 5200, 3800, 2600], TPFL: [8500, 6200, 4400, 3000],
  }[topLv];
  const RANK = ['世界級傳奇', '洲際級名將', '聯賽級主力', '職業球員', '半職業'];
  const rank = RANK[GATE.findIndex(g => legacy >= g)] ?? RANK[4];

  if (legacy < GATE[2] && Object.values(p.pot).reduce((a, b) => a + b, 0) < 480) unlock(s, ctx, 'grinder');

  s.done = true;
  s.pending = null;
  s.result = {
    reason, rank, legacy, topLv, sum,
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
