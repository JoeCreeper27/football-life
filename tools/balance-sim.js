/**
 * 平衡模擬：用機器人策略跑 N 局，輸出分布報表。
 * 用法：node tools/balance-sim.js [局數] [策略] [國家]
 *   策略：balanced（預設）| safe | aggressive
 *   國家：TW / JP / KR / US / BR / AR / GB / ES / DE / IT / FR / PT / NL
 *         省略則每局隨機抽一個國家
 *
 * 這是把遊戲當成純函式來測的好處：改一個係數，馬上知道
 * 「登上五大聯賽的比例」會不會從 8% 變 40%。
 */
import { createState, ovr } from '../src/engine/state.js';
import { run, answer } from '../src/engine/flow.js';
import { POS_WEIGHT, LV, NATIONS, NATION_ORDER, ARCHETYPE } from '../src/engine/data.js';
import { randomSeed } from '../src/engine/rng.js';

const N = parseInt(process.argv[2], 10) || 2000;
const STRAT = process.argv[3] || 'balanced';
const NATION = process.argv[4] || null;

const TARGETS = {
  // 0.3.1 起刻意調高：加入連帶成長後整體能力上移，五大聯賽登陸率跟著放寬
  '登上五大聯賽': [10, 16],
  '登上洲際頂級以上': [25, 45],
  '一輩子沒旅外': [25, 50],
  '世界足球先生': [0, 1],
  // 世界盃與五大聯賽高度依賴出身國，隨機國家的合計值只看有沒有離譜，
  // 要對表請帶第三個參數指定國家（例：node tools/balance-sim.js 2000 balanced TW）
  '踢進世界盃': [1, 50],
  '25 歲前退出': [10, 22],
  '生涯至少一次重傷': [40, 65],
  '進足球學校': [0, 100],
  '確立原型': [0, 100],
  '球迷聲望 ≥80': [0, 100],
};

function botAlloc(state, pending) {
  const p = state.player;
  const dp = p.dpos || { GK: 'GK', DF: 'CB', MF: 'CM', FW: 'ST' }[p.group];
  const w = POS_WEIGHT[dp];
  const locked = pending.locked || [];
  const major = pending.major || [];
  // 依位置權重排序，優先把點數灌進最有價值又還沒到潛力上限的能力；
  // 原型主修加權，並排除 29 歲後鎖住的能力
  const order = Object.keys(p.ab).filter(k => !locked.includes(k)).sort((a, b) => {
    const room = k => (p.pot[k] - p.ab[k]);
    const score = k => (w[k] || 0.02) * 100 + Math.min(room(k), 10) + (major.includes(k) ? 25 : 0);
    return score(b) - score(a);
  });
  const out = {};
  if (!order.length) return out;
  const units = pending.dice ? pending.dice : Array(pending.pool).fill(1);
  units.forEach((v, i) => {
    const k = order[i % Math.min(3, order.length)];
    out[k] = (out[k] || 0) + v;
  });
  return out;
}

function botChoice(state, pending) {
  const opts = pending.options;
  const vals = opts.map(o => o.v);
  const has = v => vals.includes(v);
  const withPrefix = pre => vals.filter(v => v.startsWith(pre));

  // 事件卡
  if (has('bold')) return STRAT === 'aggressive' ? 'bold' : STRAT === 'safe' ? 'safe' : 'norm';
  // 踢法
  if (has('全場壓迫')) return STRAT === 'aggressive' ? '全場壓迫' : STRAT === 'safe' ? '節省體力' : '標準';
  // 韌帶抉擇
  if (has('surgery')) return STRAT === 'aggressive' ? 'gamble' : 'surgery';
  // 國中畢業：積極派進足球學校，保守派留校隊
  if (has('academy')) return STRAT === 'safe' ? 'hs' : 'academy';
  // 分岔型事件卡：積極派挑第二條路
  if (has('opt0')) return STRAT === 'aggressive' && has('opt1') ? 'opt1' : 'opt0';
  // 兵役：能免則免
  if (has('sub')) return 'sub';
  if (has('defer')) return 'defer';
  if (has('serve') && vals.length === 1) return 'serve';
  // 原型轉型：一律接受，拒絕等於提早退休
  if (has('switch')) return 'switch';
  // 原型選擇：契合度最高的排在第一個
  if (vals.some(v => ARCHETYPE[v])) return vals.find(v => ARCHETYPE[v]);
  // 國籍抉擇（混血）：選國家隊實力較強的一邊
  if (vals.length === 2 && vals.every(v => NATIONS[v])) {
    return vals.slice().sort((a, b) => NATIONS[b].natl - NATIONS[a].natl)[0];
  }
  // 畢業分流：能簽最高層級就簽，否則升學拖時間
  const pro = withPrefix('pro:');
  if (pro.length) {
    if (has('uni') && state.player.age <= 18 && ovr(state.player) < 40) return 'uni';
    return pro.sort((a, b) => LV[b.slice(4)].tier - LV[a.slice(4)].tier)[0];
  }
  if (has('uni')) return 'uni';
  if (has('quit')) return 'quit';
  // 轉會：能升就升（優先歐洲），坐板凳就外租
  const up = withPrefix('up:');
  if (up.length) {
    return up.sort((a, b) => {
      const la = LV[a.slice(3)], lb = LV[b.slice(3)];
      return (lb.region === 'EUR') - (la.region === 'EUR') || lb.base - la.base;
    })[0];
  }
  if (has('loan')) return 'loan';
  // 撐不住這個層級就往下找，保守派優先返鄉
  if (ovr(state.player) < LV[state.club.lv].min) {
    const home = withPrefix('home:');
    const down = withPrefix('down:');
    if (STRAT === 'safe' && home.length) return home[0];
    if (down.length) return down[0];
    if (home.length) return home[0];
  }
  if (has('stay')) return 'stay';
  // 其他（位置登錄等）取第一個
  return opts.find(o => o.main)?.v ?? vals[0];
}

function playOne(seed) {
  const group = ['GK', 'DF', 'MF', 'FW'][Math.floor(Math.random() * 4)];
  const nation = NATION || NATION_ORDER[Math.floor(Math.random() * NATION_ORDER.length)];
  const origin = ['local', 'local', 'mixed', 'immigrant'][Math.floor(Math.random() * 4)];
  const s = createState(seed, { name: 'BOT', number: 9, group, nation, origin });
  s.step = 'YEAR_START';
  let r = run(s);
  let guard = 0;
  while (!s.done && guard++ < 400) {
    const value = r.pending.type === 'alloc' ? botAlloc(s, r.pending) : botChoice(s, r.pending);
    r = answer(s, value);
  }
  return s;
}

const acc = {};
const bump = k => (acc[k] = (acc[k] || 0) + 1);
const legacies = [];
const byNation = {};
let t0 = Date.now();

for (let i = 0; i < N; i++) {
  const s = playOne(randomSeed());
  if (!s.result) { bump('未正常結束'); continue; }
  legacies.push(s.result.legacy);
  const pro = s.career.seasons.filter(x => !LV[x.lv]?.amateur);
  const tops = new Set(pro.map(x => LV[x.lv]?.top).filter(Boolean));
  const nat = s.player.nation;
  byNation[nat] = byNation[nat] || { n: 0, big5: 0 };
  byNation[nat].n++;
  if (tops.has('BIG5')) { bump('登上五大聯賽'); byNation[nat].big5++; }
  if (tops.has('BIG5') || tops.has('EUR2') || tops.has('TOP')) bump('登上洲際頂級以上');
  if (pro.length && !pro.some(x => x.abroad)) bump('一輩子沒旅外');
  if (s.career.honors.some(h => h.includes('世界足球先生'))) bump('世界足球先生');
  if (s.career.worldCups.length) bump('踢進世界盃');
  if (s.player.age < 25) bump('25 歲前退出');
  if (s.player.injury.bigCount + s.player.injury.aclCount > 0) bump('生涯至少一次重傷');
  if (s.career.fromAcademy) bump('進足球學校');
  if (s.player.arch) bump('確立原型');
  if (s.career.fanRep >= 80) bump('球迷聲望 ≥80');
  bump('_total');
}

const total = acc._total || 1;
const pct = k => ((acc[k] || 0) / total * 100);
legacies.sort((a, b) => a - b);
const q = p => legacies[Math.floor(legacies.length * p)] ?? 0;

console.log(`\n跑了 ${N} 局（策略：${STRAT}，國家：${NATION || '隨機'}，耗時 ${Date.now() - t0}ms）\n`);
console.log('指標'.padEnd(22), '實際'.padStart(8), '目標'.padStart(12), '  狀態');
console.log('-'.repeat(58));
for (const [k, [lo, hi]] of Object.entries(TARGETS)) {
  const v = pct(k);
  const ok = v >= lo && v <= hi;
  console.log(k.padEnd(20), (v.toFixed(1) + '%').padStart(9),
    `${lo}–${hi}%`.padStart(12), '  ' + (ok ? 'OK' : v < lo ? '偏低' : '偏高'));
}
console.log('-'.repeat(58));
console.log(`傳奇評分 P25/P50/P75/P95：${q(.25)} / ${q(.5)} / ${q(.75)} / ${q(.95)}`);
if (!NATION) {
  const line = NATION_ORDER
    .filter(k => byNation[k])
    .map(k => `${NATIONS[k].n} ${(byNation[k].big5 / byNation[k].n * 100).toFixed(0)}%`)
    .join('  ');
  console.log(`各國登上五大聯賽比例：${line}`);
}
if (acc['未正常結束']) console.log(`⚠ 未正常結束：${acc['未正常結束']} 局`);
console.log();
