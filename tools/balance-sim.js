/**
 * 平衡模擬：用機器人策略跑 N 局，輸出分布報表。
 * 用法：node tools/balance-sim.js [局數] [策略]
 *   策略：balanced（預設）| safe | aggressive
 *
 * 這是把遊戲當成純函式來測的好處：改一個係數，馬上知道
 * 「登上五大聯賽的比例」會不會從 8% 變 40%。
 */
import { createState, ovr } from '../src/engine/state.js';
import { run, answer } from '../src/engine/flow.js';
import { POS_WEIGHT, LV } from '../src/engine/data.js';
import { randomSeed } from '../src/engine/rng.js';

const N = parseInt(process.argv[2], 10) || 2000;
const STRAT = process.argv[3] || 'balanced';

const TARGETS = {
  '登上五大聯賽': [6, 10],
  '登上 J1/歐洲以上': [25, 45],
  '一輩子沒離開台灣': [25, 50],
  '世界足球先生': [0, 1],
  '踢進世界盃': [1, 5],
  '25 歲前退出': [10, 22],
  '生涯至少一次重傷': [40, 65],
};

function botAlloc(state, pending) {
  const p = state.player;
  const dp = p.dpos || { GK: 'GK', DF: 'CB', MF: 'CM', FW: 'ST' }[p.group];
  const w = POS_WEIGHT[dp];
  // 依位置權重排序，優先把點數灌進最有價值又還沒到潛力上限的能力
  const order = Object.keys(p.ab).sort((a, b) => {
    const room = k => (p.pot[k] - p.ab[k]);
    const score = k => (w[k] || 0.02) * 100 + Math.min(room(k), 10);
    return score(b) - score(a);
  });
  const out = {};
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

  // 事件卡
  if (has('bold')) return STRAT === 'aggressive' ? 'bold' : STRAT === 'safe' ? 'safe' : 'norm';
  // 踢法
  if (has('全場壓迫')) return STRAT === 'aggressive' ? '全場壓迫' : STRAT === 'safe' ? '節省體力' : '標準';
  // 韌帶抉擇
  if (has('surgery')) return STRAT === 'aggressive' ? 'gamble' : 'surgery';
  // 畢業分流：能往上就往上
  if (has('eu')) return 'eu';
  if (has('jp')) return 'jp';
  if (has('uni') && state.player.age <= 18 && ovr(state.player) < 40) return 'uni';
  if (has('tpfl')) return 'tpfl';
  // 轉會：能升就升，坐板凳就外租
  if (has('up')) return 'up';
  if (has('loan')) return 'loan';
  if (has('down') && ovr(state.player) < LV[state.club.lv].min) return 'down';
  if (has('stay')) return 'stay';
  // 其他（位置登錄等）取第一個
  return opts.find(o => o.main)?.v ?? vals[0];
}

function playOne(seed) {
  const group = ['GK', 'DF', 'MF', 'FW'][Math.floor(Math.random() * 4)];
  const s = createState(seed, { name: 'BOT', number: 9, group });
  s.step = 'YEAR_START';
  let r = run(s);
  let guard = 0;
  while (!s.done && guard++ < 300) {
    const value = r.pending.type === 'alloc' ? botAlloc(s, r.pending) : botChoice(s, r.pending);
    r = answer(s, value);
  }
  return s;
}

const acc = {};
const bump = k => (acc[k] = (acc[k] || 0) + 1);
const legacies = [];
let t0 = Date.now();

for (let i = 0; i < N; i++) {
  const s = playOne(randomSeed());
  if (!s.result) { bump('未正常結束'); continue; }
  legacies.push(s.result.legacy);
  const tops = new Set(s.career.seasons.map(x => LV[x.lv]?.top).filter(Boolean));
  if (tops.has('BIG5')) bump('登上五大聯賽');
  if (tops.has('BIG5') || tops.has('EUR2') || tops.has('ASIA')) bump('登上 J1/歐洲以上');
  if (tops.size <= 1 && tops.has('TPFL')) bump('一輩子沒離開台灣');
  if (s.career.honors.some(h => h.includes('世界足球先生'))) bump('世界足球先生');
  if (s.career.worldCups.length) bump('踢進世界盃');
  if (s.player.age < 25) bump('25 歲前退出');
  if (s.player.injury.bigCount + s.player.injury.aclCount > 0) bump('生涯至少一次重傷');
  bump('_total');
}

const total = acc._total || 1;
const pct = k => ((acc[k] || 0) / total * 100);
legacies.sort((a, b) => a - b);
const q = p => legacies[Math.floor(legacies.length * p)] ?? 0;

console.log(`\n跑了 ${N} 局（策略：${STRAT}，耗時 ${Date.now() - t0}ms）\n`);
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
if (acc['未正常結束']) console.log(`⚠ 未正常結束：${acc['未正常結束']} 局`);
console.log();
