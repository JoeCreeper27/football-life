import { Rng, clamp } from './rng.js';
import {
  GROUP_ABIL, YOUTH_CLUBS, CONF, DPOS, POS_WEIGHT, LV, TIER,
  NATIONS, NATION_ORDER, ORIGINS, ARCHETYPE, SYNERGY, SYNERGY_GK, MAX_ABIL,
  BUILD, BUILD_ROLL, BUILD_ADJ,
  growthPhase, PHYSICAL, PHYSICAL_HARD_AGE, PHYSICAL_LOCK_AGE,
} from './data.js';

export const SCHEMA_VERSION = '0.4.0';

/**
 * 建立一局新生涯。所有隨機都吃 rng，因此同種子同設定必得同一個開局。
 * setup: { name, number, group, nation, origin }
 */
export function createState(seed, { name, number, group, nation = 'TW', origin = 'local' }) {
  const rng = new Rng(seed);
  const keys = GROUP_ABIL[group];
  const nat = NATIONS[nation] || NATIONS.TW;
  // 有些國家沒有移民這條路，防呆一律落回本地
  if (origin === 'immigrant' && nat.noImmigrant) origin = 'local';
  const org = ORIGINS[origin] || ORIGINS.local;
  // 該國本地／混血出身的潛力加成
  const natPot = nat.potBonus && origin !== 'immigrant' ? nat.potBonus : 0;

  // 體型開局隨機，影響初始值與潛力上限（不是玩家選的）
  const build = rng.pick(BUILD_ROLL);
  const B = BUILD[build];
  const upList = group === 'GK' ? B.gkUp : B.up;
  const downList = group === 'GK' ? B.gkDown : B.down;
  const buildAb = k => (upList.includes(k) ? BUILD_ADJ.ab : downList.includes(k) ? BUILD_ADJ.abDown : 0);
  const buildPot = k => (upList.includes(k) ? BUILD_ADJ.pot : downList.includes(k) ? BUILD_ADJ.potDown : 0);

  // 12 歲起步，起始值低；國家青訓水準與出身直接反映在這裡
  const ab = {};
  keys.forEach(k => (ab[k] = clamp(rng.int(15, 27) + nat.dev + org.ab + buildAb(k), 8, 42)));

  /**
   * 潛力天花板。兩層結構：
   *
   * 1. 天賦係數 talent —— 每個球員一個，把所有潛力一起往上或往下推。
   *    這是「頂級球員相關能力全部 90」的來源：只有分項洗牌的話，ovr 是加權平均，
   *    數學上永遠到不了 90，因為總會有幾項是平庸的。
   * 2. 分項洗牌 —— 決定這個人的強項落在哪，並且偏向他這個位置真正吃重的能力
   *    （前鋒的頂尖潛力落在射門而不是防守，才對得起 FIFA 式的直覺）。
   */
  // 注意 rng.gauss(1) 的實際標準差約 0.58（四次均勻取樣近似），不是 1，
  // 所以倍率要放大才拉得開差距 —— 這裡的散布直接決定「天才與庸才的距離」
  const talent = rng.gauss(1);
  const w = POS_WEIGHT[defaultPos(group)];
  const shuffled = weightedOrder(rng, keys, w);

  const BAND = group === 'GK'
    ? [[84, 93], [78, 88], [71, 82], [63, 76]]
    : [[84, 93], [78, 88], [72, 83], [64, 77], [56, 70]];
  const pot = {};
  shuffled.forEach((k, i) => {
    const [lo, hi] = BAND[Math.min(i, BAND.length - 1)];
    pot[k] = clamp(Math.round(rng.int(lo, hi) + talent * 24 + nat.dev + natPot + buildPot(k)), 25, MAX_ABIL);
  });
  pot[shuffled[0]] = clamp(pot[shuffled[0]] + org.potTop, 35, MAX_ABIL);

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
      build,
      age: CONF.startAge, ab, pot, carry,
      arch: null, archEvolved: null, archSwitched: false,
      decay: {},
      traits: {}, removed: [],
      injury: { load: 0, aclCount: 0, bigCount: 0, nextRisk: 0, rehab: 0, restNext: 0, seasonFactor: 1 },
      service: 0,
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
      wentUni: false,
      coach: null,
      fanRep: CONF.fanRepStart,
      seenEvents: [],
      clubHistory: [],
      legends: [],
      counters: {
        six: 0, bold: 0, boldWin: 0, benchStreak: 0, ironStreak: 0,
        clutch: 0, goodRating: 0, cleanSeasons: 0,
      },
    },
  };
}

/**
 * 加權排序：權重越高的能力越可能排在前面（＝拿到越高的潛力帶）。
 * 前鋒的頂尖天賦應該長在射門上，而不是隨機掉到防守去。
 * 仍然保留意外性 —— 偶爾出現的「傳球天賦前鋒」正是位置轉型劇本的來源。
 */
function weightedOrder(rng, keys, w) {
  const pool = keys.slice();
  const out = [];
  while (pool.length) {
    const wt = pool.map(k => (w[k] || 0.02) + 0.06);
    let roll = rng.next() * wt.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < pool.length - 1 && (roll -= wt[i]) > 0) i++;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
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
  let cap = L.tier >= 7 ? 30 : L.tier >= 5 ? 31 : 33;
  if (regionOf(p) === L.region) cap += 3;
  cap += ORIGINS[p.origin]?.windowAdj || 0;
  if (p.altNation && NATIONS[p.altNation]?.region === L.region) cap += 2;
  return p.age <= cap;
}

/* ---------------- 能力成長 ---------------- */

/**
 * 目前這一級要花幾點。
 * 三層修正：能力現值 → 生涯階段（巔峰期 ×1.5、維持期 ×2）→ 原型（主修 ×0.7、非主修 ×1.3）。
 * 階段乘數是「總量控制在 24 歲前」的主要手段，改這裡等於改整條成長曲線。
 */
export function abCost(p, k) {
  const cur = p.ab[k], cap = p.pot[k] ?? 62, gk = p.group === 'GK';
  const arch = ARCHETYPE[p.arch];
  const major = arch ? arch.major.includes(k) : false;

  let c = gk ? (cur >= 94 ? 5 : cur >= 87 ? 4 : cur >= 78 ? 2 : 1)
             : (cur >= 94 ? 4 : cur >= 87 ? 3 : cur >= 78 ? 2 : 1);
  // 離天花板越遠成長越快：有天賦的人爬得上去，沒天賦的人早早卡住。
  // 這條是「頂尖能不能摸到 90」的關鍵 —— 直接加點數會讓所有人一起變強。
  const head = cap - cur;
  if (head >= 32) c *= 0.55;
  else if (head >= 20) c *= 0.8;
  // 超過潛力上限：越推越貴，而且是加速的。
  // 這條線是天賦差距的守門員 —— 太便宜的話，低天賦球員照樣爬到頂，
  // 天賦分布再寬也會被抹平（實測曾經平均突破 8 分、P95 突破 22 分）。
  if (cur >= cap) {
    const over = cur - cap;
    c *= (major ? 2.6 : 3.6) + over * 1.15;
  }
  c *= growthPhase(p.age).cost;
  // 26 歲之後體能類練得動但很吃力，技術類不受影響
  if (p.age >= PHYSICAL_HARD_AGE && PHYSICAL.includes(k)) c *= 2;
  if (arch && major) c *= 0.7;   // 主修便宜，非主修維持原價（不再加罰）
  return Math.max(1, Math.ceil(c));
}

/** 體能類 33 歲後練不動；技術類一輩子都還能練 */
export function isGrowable(p, k) {
  return !PHYSICAL.includes(k) || p.age < PHYSICAL_LOCK_AGE;
}

/** 球迷聲望：0–100，負面事件扣得比正面加得兇 */
export function addFanRep(s, v) {
  const before = s.career.fanRep;
  s.career.fanRep = clamp(before + v, 0, 100);
  return s.career.fanRep - before;
}

/**
 * 加點：未滿一級的餘數進蓄力槽，不蒸發。
 * spill = true 時會依 SYNERGY 帶動相關能力（帶動的點數一樣走蓄力槽，
 * 所以不會憑空跳級，只是累積得比較快）。
 */
export function addAb(p, k, points, spill = true) {
  if (!(k in p.ab)) return 0;
  const before = p.ab[k];
  let budget = points + (p.carry[k] || 0);
  while (p.ab[k] < MAX_ABIL) {
    const cost = abCost(p, k);
    if (budget < cost) break;
    budget -= cost;
    p.ab[k]++;
  }
  p.carry[k] = p.ab[k] >= MAX_ABIL ? 0 : Math.round(budget * 100) / 100;

  // 連帶成長只把相關能力帶到天賦上限為止；要突破天賦，得靠專門訓練
  if (spill && points > 0) {
    for (const [j, ratio] of Object.entries(synergyTable(p)[k] || {})) {
      if (j in p.ab && p.ab[j] < (p.pot[j] ?? 62)) addAb(p, j, points * ratio, false);
    }
  }
  return p.ab[k] - before;
}

/** 門將與外場的能力組不同，連帶成長各走各的表 */
const synergyTable = p => (p.group === 'GK' ? SYNERGY_GK : SYNERGY);

/** 這一項會帶動哪些能力（UI 用來提示玩家） */
export function synergyOf(p, k) {
  return Object.keys(synergyTable(p)[k] || {}).filter(j => j in p.ab);
}

/** 扣值 1:1 立即生效（跌比練快） */
export function subAb(p, k, points) {
  if (!(k in p.ab)) return 0;
  const before = p.ab[k];
  p.ab[k] = clamp(p.ab[k] - points, 1, MAX_ABIL);
  return p.ab[k] - before;
}

/* ---------------- 綜合評價 ---------------- */

/**
 * 依目前位置算加權綜合。
 * 還沒登錄細分位置時（養成期），取「這身能力最適合的位置」而不是固定的預設位置 ——
 * 否則一個速度 84、盤帶 75、傳球 72 的前鋒會被當成中鋒評價（射門只有 28），
 * 綜合從 69 掉到 46，然後在畢業時被判定不夠格。教練會把你放在你最強的位置。
 */
export function ovr(p) {
  return ovrAt(p, p.dpos || bestPos(p));
}

/** 這身能力最適合該大類裡的哪個位置 */
export function bestPos(p) {
  const cands = Object.keys(DPOS).filter(k => DPOS[k].group === p.group);
  if (!cands.length) return defaultPos(p.group);
  return cands.reduce((best, k) => (ovrAt(p, k) > ovrAt(p, best) ? k : best), cands[0]);
}

/** 如果改踢某個位置，綜合評價會是多少 —— 位置轉型判斷用 */
export function ovrAt(p, dpos) {
  const w = POS_WEIGHT[dpos];
  if (!w) return 0;
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
  const youth = age <= 21 ? 9 : age <= 24 ? 7 : age <= 26 ? 3 : 0;
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
  if (player.traits.captain) gap += 4;
  if (player.traits.onetool) gap -= 5;
  // 剛到異國的第一年，教練對外籍球員的期待值更高
  if (isAbroad(s) && club.yearsAtClub === 0) gap -= 3;
  return gap;
}
