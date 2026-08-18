import { Rng, clamp } from './rng.js';
import {
  GROUP_ABIL, YOUTH_CLUBS, CONF, DPOS, POS_WEIGHT, LV, TIER,
  NATIONS, NATION_ORDER, ORIGINS,
} from './data.js';

export const SCHEMA_VERSION = '0.2.0';

/**
 * 建立一局新生涯。所有隨機都吃 rng，因此同種子同設定必得同一個開局。
 * setup: { name, number, group, nation, origin }
 */
export function createState(seed, { name, number, group, nation = 'TW', origin = 'local' }) {
  const rng = new Rng(seed);
  const keys = GROUP_ABIL[group];
  const nat = NATIONS[nation] || NATIONS.TW;
  const org = ORIGINS[origin] || ORIGINS.local;

  // 12 歲起步，起始值低；國家青訓水準與出身直接反映在這裡
  const ab = {};
  keys.forEach(k => (ab[k] = clamp(rng.int(17, 27) + nat.dev + org.ab, 10, 40)));

  // OOTP 式潛力天花板：洗牌後 1 項頂尖、1 項優質、1 項中上、其餘平庸。
  // 門將只有 5 項能力，天花板刻意更集中，避免出現全能怪。
  const pot = {};
  const shuffled = rng.shuffle(keys);
  if (group === 'GK') {
    shuffled.forEach((k, i) => {
      pot[k] = i === 0 ? rng.int(70, 80) : i === 1 ? rng.int(60, 70) : rng.int(48, 58);
    });
  } else {
    shuffled.forEach((k, i) => {
      pot[k] = i === 0 ? rng.int(72, 80) : i === 1 ? rng.int(64, 74)
             : i === 2 ? rng.int(56, 68) : rng.int(46, 62);
    });
  }
  // 青訓水準拉抬整體天花板，混血再給最高項一點額外空間
  keys.forEach(k => (pot[k] = clamp(pot[k] + nat.dev, 40, 80)));
  pot[shuffled[0]] = clamp(pot[shuffled[0]] + org.potTop, 40, 80);

  const carry = {};
  keys.forEach(k => (carry[k] = 0));

  // 混血：抽一個第二國籍，18 歲時決定代表哪一隊
  let altNation = null;
  if (origin === 'mixed') {
    const others = NATION_ORDER.filter(k => k !== nation);
    altNation = rng.pick(others);
  }

  const school = rng.pick(YOUTH_CLUBS.JHS[nat.region]);

  return {
    v: SCHEMA_VERSION,
    seed, cursor: rng.cursor,
    done: false,
    phase: 'PRESEASON',
    pending: null,

    player: {
      name, number, group, dpos: null,
      nation, origin, altNation, natlPick: nation, natlPicked: false,
      age: CONF.startAge, ab, pot, carry,
      traits: {}, removed: [],
      injury: { load: 0, aclCount: 0, bigCount: 0, nextRisk: 0, rehab: 0, seasonFactor: 1 },
      style: '標準',
    },

    club: {
      stage: 'JHS', lv: 'JHS', stageYear: 1,
      club: school, tier: 3,
      role: 'STARTER', minutes: 0.8,
      contract: null, yearsAtClub: 0, loanFrom: null,
    },

    career: {
      year: CONF.startYear,
      seasons: [],
      honors: [],
      caps: 0, intlGoals: 0, worldCups: [],
      salaryTotal: 0,
      clubTally: {},
      pool: 0,
      fromAcademy: false,
      counters: { six: 0, bold: 0, boldWin: 0, benchStreak: 0, ironStreak: 0 },
    },
  };
}

/** 從存檔還原 rng（靠 cursor 快轉） */
export function rngOf(s) { return new Rng(s.seed, s.cursor); }
export function syncCursor(s, rng) { s.cursor = rng.cursor; }

/* ---------------- 國家與旅外 ---------------- */

export function nationOf(p) { return NATIONS[p.nation] || NATIONS.TW; }
export function regionOf(p) { return nationOf(p).region; }

/** 這個聯賽算不算「國內聯賽」 */
export function isHomeLeague(p, lvId) {
  const L = LV[lvId];
  if (!L || L.amateur) return true;
  return nationOf(p).home[L.tier] === lvId;
}

/** 目前是否人在海外 */
export function isAbroad(s) { return !isHomeLeague(s.player, s.club.lv); }

/**
 * 旅外年齡窗口：越高的層級關得越早，本區球員與移民出身寬鬆一些。
 * 這條規則讓「錯過窗口的強者留在本國輾壓」成為真實的策略分岔。
 */
export function ageWindow(p, lvId) {
  const L = LV[lvId];
  if (!L || L.amateur) return true;
  let cap = L.tier >= 7 ? 27 : L.tier >= 5 ? 29 : 33;
  if (regionOf(p) === L.region) cap += 3;
  cap += ORIGINS[p.origin]?.windowAdj || 0;
  if (p.altNation && NATIONS[p.altNation]?.region === L.region) cap += 2;
  return p.age <= cap;
}

/* ---------------- 能力成長 ---------------- */

/** 目前這一級要花幾點 */
export function abCost(p, k) {
  const cur = p.ab[k], cap = p.pot[k] ?? 62, gk = p.group === 'GK';
  let c = gk ? (cur >= 75 ? 7 : cur >= 70 ? 5 : cur >= 60 ? 3 : cur >= 48 ? 2 : 1)
             : (cur >= 75 ? 6 : cur >= 70 ? 4 : cur >= 60 ? 3 : cur >= 48 ? 2 : 1);
  if (cur >= cap) c *= gk ? 4 : 3; // 超過潛力上限，成本暴增但不封死
  return c;
}

/** 加點：未滿一級的餘數進蓄力槽，不蒸發 */
export function addAb(p, k, points) {
  if (!(k in p.ab)) return 0;
  const before = p.ab[k];
  let budget = points + (p.carry[k] || 0);
  while (p.ab[k] < 80) {
    const cost = abCost(p, k);
    if (budget < cost) break;
    budget -= cost;
    p.ab[k]++;
  }
  p.carry[k] = p.ab[k] >= 80 ? 0 : budget;
  return p.ab[k] - before;
}

/** 扣值 1:1 立即生效（跌比練快） */
export function subAb(p, k, points) {
  if (!(k in p.ab)) return 0;
  const before = p.ab[k];
  p.ab[k] = clamp(p.ab[k] - points, 1, 80);
  return p.ab[k] - before;
}

/* ---------------- 綜合評價 ---------------- */

/** 依目前位置（未定位則取該大類的預設位置）算加權綜合 */
export function ovr(p) {
  const dp = p.dpos || defaultPos(p.group);
  const w = POS_WEIGHT[dp];
  let v = 0;
  for (const k in w) v += (p.ab[k] ?? 30) * w[k];
  return Math.round(v);
}

export function defaultPos(group) {
  return { GK: 'GK', DF: 'CB', MF: 'CM', FW: 'ST' }[group];
}

/** 該位置在該聯賽的能力門檻是否過得去 */
export function posQualified(p, dpos, lv, age) {
  const d = DPOS[dpos];
  if (!d.req) return true;
  const B = LV[lv].par;
  const youth = age <= 21 ? 7 : age <= 24 ? 5 : age <= 26 ? 2 : 0;
  return Object.entries(d.req).every(([k, off]) => (p.ab[k] ?? 0) >= B + off - youth);
}

/* ---------------- 陣中地位 ---------------- */

/**
 * squadGap = 綜合 − (聯賽基準 + 球會等級加成 + 位置競爭)
 * 這是足球版的核心：能力夠了也不一定有球踢。
 */
export function squadGap(s) {
  const { player, club } = s;
  const L = LV[club.lv];
  const competition = 2; // 同位置隊內競爭的固定成本
  let gap = ovr(player) - (L.par + TIER[club.tier].bonus + competition);
  if (player.traits.captain) gap += 3;
  if (player.traits.onetool) gap -= 4;
  // 剛到異國的第一年，教練對外籍球員的期待值更高
  if (isAbroad(s) && club.yearsAtClub === 0) gap -= 2;
  return gap;
}
