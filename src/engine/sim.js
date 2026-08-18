import { clamp } from './rng.js';
import { LV, TIER, SQUAD, POS_WEIGHT, POS_OUTPUT, DPOS, CONF, ARCHETYPE } from './data.js';
import { ovr, squadGap, defaultPos, isAbroad } from './state.js';

/* ---------------- 陣中地位與出場時間 ---------------- */

export function roleOf(gap) {
  return SQUAD.find(r => gap >= r.gap) || SQUAD[SQUAD.length - 1];
}

export function rollMinutes(s, rng) {
  const gap = squadGap(s);
  const r = roleOf(gap);
  const t = clamp((gap - r.gap) / 4, 0, 1);
  const pct = r.minLo + (r.minHi - r.minLo) * clamp(t + rng.gauss(0.12), 0, 1);
  return { role: r.k, roleName: r.n, minutes: clamp(pct, 0, 1) };
}

/* ---------------- 賽季數據 ---------------- */

/** 能力聚合減聯賽基準：整個模擬的支點 */
export function dValue(s) {
  const p = s.player;
  const dp = p.dpos || defaultPos(p.group);
  const w = POS_WEIGHT[dp];
  let q = 0;
  for (const k in w) q += (p.ab[k] ?? 30) * w[k];
  return q - LV[s.club.lv].par;
}

const STYLE = {
  '全場壓迫': { d: 1, out: 1.08, load: 1.25 },
  '標準':     { d: 0, out: 1.00, load: 1.00 },
  '節省體力': { d: -1, out: 0.94, load: 0.70 },
};

export function simSeason(s, rng) {
  const p = s.player, c = s.club;
  const L = LV[c.lv];
  const st = STYLE[p.style] || STYLE['標準'];
  // 球迷聲望透過主場氣氛回饋到表現上（±2）
  const fanBoost = (s.career.fanRep - 50) / 25;
  const d = dValue(s) + st.d + fanBoost;
  const dp = p.dpos || defaultPos(p.group);
  const base = POS_OUTPUT[dp];
  const arch = ARCHETYPE[p.arch];
  const out = arch
    ? { g: base.g * arch.out.g, a: base.a * arch.out.a, cs: base.cs * arch.out.cs }
    : base;

  // 速度型原型 31 歲後產能斷崖，技術型幾乎不受影響
  const decay = arch && p.age >= 31
    ? (arch.ageBias === 'early' ? clamp(1 - (p.age - 30) * 0.11, 0.4, 1)
      : arch.ageBias === 'late' ? 1 : clamp(1 - (p.age - 30) * 0.05, 0.7, 1))
    : 1;

  const minutes = clamp(c.minutes + (arch?.minutes || 0), 0, 0.98);
  const apps = Math.round(L.g * minutes * p.injury.seasonFactor);
  const share = apps / 38;
  const perf = clamp(0.80 + d * 0.035, 0.30, 1.60) * st.out * decay;

  const bonus = s._bonusGoals || 0;
  const goals = Math.max(0, Math.round(out.g * share * perf + rng.gauss(1.4))) + bonus;
  const assists = Math.max(0, Math.round(out.a * share * perf + rng.gauss(1.2)));
  const cs = out.cs > 0
    ? Math.max(0, Math.round(out.cs * share * clamp(0.7 + d * 0.05, 0.2, 1.8) + rng.gauss(1.0)))
    : 0;
  const rating = +clamp(6.30 + d * 0.045 + rng.gauss(0.12), 5.20, 8.60).toFixed(2);

  return {
    year: s.career.year, age: p.age, lv: c.lv, lvName: L.n,
    club: c.club, tier: c.tier, dpos: dp, role: c.role,
    apps, goals, assists, cs, rating, d: +d.toFixed(1),
    arch: p.arch, minutes: +(minutes * 100).toFixed(0),
    loanFrom: c.loanFrom,
    abroad: isAbroad(s),
  };
}

/* ---------------- 傷病 ---------------- */

export function injuryRisk(s) {
  const p = s.player, c = s.club;
  let risk = CONF.baseInjury + p.injury.nextRisk;
  risk += c.minutes * 8;
  if (p.age >= 33) risk += 10; else if (p.age >= 30) risk += 5;
  if (p.style === '全場壓迫') risk += 4;
  if (p.traits.glass) risk = Math.max(risk, 40);
  if (p.traits.iron) risk = Math.min(risk, 10);
  return clamp(risk, 3, 75);
}

/** 韌帶負荷量表：速度爆發型 + 高強度踢法 + 高出場率累積得最快 */
export function accrueLoad(s) {
  const p = s.player, c = s.club;
  const st = STYLE[p.style] || STYLE['標準'];
  // 除數要跟著能力尺度走，否則能力一通膨，韌帶量表就爆得特別快
  const explosive = ((p.ab.pac ?? 40) + (p.ab.phy ?? 40)) / 27;
  const scar = p.injury.aclCount >= 2 ? 1.4 : p.injury.aclCount >= 1 ? 1.18 : 1;
  const archLoad = ARCHETYPE[p.arch]?.load || 1;
  const gain = explosive * st.load * clamp(0.4 + c.minutes, 0.4, 1.4) * scar * archLoad;
  p.injury.load += gain;
  return gain;
}

export function loadCap(p) { return p.traits.knee ? CONF.aclCap * 2 : CONF.aclCap; }

/* ---------------- 薪資 ---------------- */

export function annualSalary(s) {
  const L = LV[s.club.lv];
  if (!L.base) return 0;
  const d = dValue(s);
  const posCoef = DPOS[s.player.dpos || defaultPos(s.player.group)].sal;
  const tierCoef = TIER[s.club.tier].sal;
  // 高聲望是談判籌碼，低聲望球會會想把你賣掉
  const fanCoef = s.career.fanRep >= 75 ? 1.1 : s.career.fanRep <= 25 ? 0.9 : 1;
  const raw = (L.base + Math.max(-2, d) * L.coef) * posCoef * tierCoef * fanCoef;
  return Math.max(Math.round(L.base * 0.5), Math.round(raw));
}

/* ---------------- 衰退 ---------------- */

/**
 * 足球特有的非均勻衰退：速度與體能先走，閱讀比賽的能力反而還在。
 * 這條規則直接導出「速度型早退、技術型長青」與位置轉型的策略空間。
 */
export function applyDecline(s) {
  const p = s.player;
  if (p.age < CONF.declineAge) return null;
  const severe = p.age >= 35;
  const stepBig = severe ? 4 + (p.age - 35) : 3;
  const stepSmall = severe ? 2 : 1;
  const changes = {};
  const hit = (k, v) => {
    if (!(k in p.ab)) return;
    const before = p.ab[k];
    p.ab[k] = clamp(p.ab[k] - v, 1, 80);
    if (p.ab[k] !== before) changes[k] = p.ab[k] - before;
  };
  hit('pac', stepBig);
  hit('sta', stepBig);
  hit('phy', stepSmall);
  hit('ref', stepSmall);
  if (!p.traits.tempo) { hit('vis', severe ? 1 : 0); hit('pas', severe ? 1 : 0); }
  return changes;
}

export function fmtMoney(v) {
  if (v >= 10000) return (v / 10000).toFixed(2) + ' 億';
  return Math.round(v).toLocaleString('zh-TW') + ' 萬';
}
