import { randomSeed } from './engine/rng.js';
import {
  createState, ovr, abCost, addAb, defaultPos, bestPos, isAbroad, originAllowed, SCHEMA_VERSION,
} from './engine/state.js';
import { run, answer } from './engine/flow.js';
import {
  ABIL, GROUP_ABIL, POS_GROUP, DPOS, LV, TIER, SQUAD,
  NATIONS, NATION_ORDER, ORIGINS, REGION, ARCHETYPE, MAX_ABIL, ABIL_SHORT, BUILD, POS_WEIGHT,
} from './engine/data.js';
import { fmtMoney } from './engine/sim.js';
import { openShareImage } from './share.js';
import { VERSION } from './version.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'fl-save';
const PREF_KEY = 'fl-pref';

let S = null;
let curYearBody = null;
const MAX_YEARS = 40;

/* ---------------- 開場 ---------------- */
$('ver').textContent = `v${VERSION}`;

const SEED = new URLSearchParams(location.search).get('seed') || randomSeed();
let pickedGroup = 'FW';
let pickedNation = 'TW';
let pickedOrigin = 'local';

/** 選單列：一排按鈕，選中的加 .sel */
function pickRow(id, entries, current, onPick) {
  const row = $(id);
  row.innerHTML = '';
  entries.forEach(([k, label, sub]) => {
    const b = document.createElement('button');
    b.className = 'btn' + (k === current ? ' sel' : '');
    b.innerHTML = label + (sub ? `<small>${sub}</small>` : '');
    b.onclick = () => { onPick(k); setup(); };
    row.appendChild(b);
  });
}

/** 出身國家決定起點聯賽與國家隊實力，開場就把這件事講清楚 */
function nationNote() {
  const nat = NATIONS[pickedNation];
  const org = ORIGINS[pickedOrigin];
  const tiers = Object.keys(nat.home).map(Number).sort((a, b) => a - b);
  const entry = LV[nat.home[tiers[0]]];
  const ceiling = LV[nat.home[tiers[tiers.length - 1]]];
  return `<b>${nat.n}</b>（${REGION[nat.region]}）　青訓水準 ${nat.dev > 0 ? '+' + nat.dev : nat.dev}｜代表隊實力 ${nat.natl}<br>` +
    `國內起點：${entry.n}　國內天花板：${ceiling.n}${tiers[tiers.length - 1] < 7 ? '（要踢五大聯賽必須旅外）' : ''}<br>` +
    `${nat.uni ? '有大學足球這條升學路線' : '沒有大學足球，高中之後只能走職業'}` +
    `${nat.localPhysPot ? `　<b class="hl">純本地出身體能類潛力上限 +${nat.localPhysPot}</b>` : ''}<br>` +
    `<b>${org.n}</b>：${org.fx}`;
}

function setup() {
  pickRow('pos-row', Object.entries(POS_GROUP).map(([k, n]) => [k, n]), pickedGroup, k => (pickedGroup = k));
  pickRow('nation-row', NATION_ORDER.map(k => [k, NATIONS[k].n]), pickedNation, k => (pickedNation = k));
  // 移民與原住民都只有部分國家有（非洲兩國兩個都沒有，只剩純本地與混血）
  const originList = Object.entries(ORIGINS)
    .filter(([k]) => originAllowed(k, NATIONS[pickedNation]));
  if (!originList.some(([k]) => k === pickedOrigin)) pickedOrigin = 'local';
  pickRow('origin-row', originList.map(([k, o]) => [k, o.n, o.d]), pickedOrigin, k => (pickedOrigin = k));
  $('setup-note').innerHTML = nationNote();
  $('btn-start').onclick = start;
}

/** 只在開場跑一次：重跑 setup() 會蓋掉玩家正在輸入的內容 */
function initSetup() {
  const pref = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
  if (pref.name) $('in-name').value = pref.name;
  if (pref.number) $('in-number').value = pref.number;
  if (pref.nation && NATIONS[pref.nation]) pickedNation = pref.nation;
  if (pref.origin && ORIGINS[pref.origin]) pickedOrigin = pref.origin;
  $('seed-line').textContent = `世界種子：${SEED}　相同種子＋相同選擇＝相同人生`;
  setup();
}

function start() {
  const name = ($('in-name').value || '無名').slice(0, 10);
  const number = parseInt($('in-number').value, 10) || 10;
  localStorage.setItem(PREF_KEY, JSON.stringify({
    name, number, nation: pickedNation, origin: pickedOrigin,
  }));
  S = createState(SEED, {
    name, number, group: pickedGroup, nation: pickedNation, origin: pickedOrigin,
  });
  S.step = 'YEAR_START';
  $('setup').hidden = true;
  $('board').hidden = false;
  $('abils').onclick = () => { detailOpen = !detailOpen; renderAbilDetail(); };
  push(run(S));
}

/* ---------------- 渲染 ---------------- */
function push({ cards, pending }) {
  cards.forEach(c => c.divider ? divider(c.divider) : renderCard(c));
  board();
  save();
  if (S.done) return settlement();
  if (pending) renderPending(pending);
}

function divider(text) {
  const log = $('log');
  const blocks = log.querySelectorAll('.yr-block');
  if (blocks.length >= 1) blocks[blocks.length - 1].classList.add('collapsed');
  const block = document.createElement('div');
  block.className = 'yr-block';
  const head = document.createElement('div');
  head.className = 'yr-head';
  head.textContent = text;
  head.onclick = () => block.classList.toggle('collapsed');
  const body = document.createElement('div');
  body.className = 'yr-body';
  block.append(head, body);
  log.appendChild(block);
  curYearBody = body;
  const all = log.querySelectorAll('.yr-block');
  for (let i = 0; i < all.length - MAX_YEARS; i++) all[i].remove();
}

function renderCard({ tone, title, html }) {
  const d = document.createElement('div');
  d.className = 'card ' + (tone || '');
  d.innerHTML = (title ? `<h4>${title}</h4>` : '') + html;
  (curYearBody || $('log')).appendChild(d);
  scrollBottom();
}

function board() {
  const p = S.player, c = S.club;
  $('bd-name').innerHTML = `${p.name}<small>#${p.number}</small>`;
  const roleName = (SQUAD.find(r => r.k === c.role) || {}).n || '';
  const archName = ARCHETYPE[p.arch]?.n;
  $('bd-sub').textContent =
    `${NATIONS[p.nation].n}・${BUILD[p.build]?.n || ''}・` +
    `${archName || (p.dpos ? DPOS[p.dpos].n : DPOS[bestPos(p)].n + '（適性）')}` +
    (c.stage === 'PRO' ? `・${roleName}・出場率 ${Math.round(c.minutes * 100)}%` : '');
  const tier = c.stage === 'PRO' ? `（${TIER[c.tier].n}）` : '';
  const away = c.stage === 'PRO' && isAbroad(S) ? ' ✈' : '';
  $('bd-club').textContent = `${c.club}${tier}${away}　${LV[c.lv].n}`;
  $('bd-age').textContent = p.age;
  $('bd-year').textContent = S.career.year;
  $('bd-ovr').textContent = ovr(p);
  $('bd-fan').textContent = Math.round(S.career.fanRep);
  $('bd-sal').textContent = Math.round(S.career.salaryTotal).toLocaleString('zh-TW');
  document.body.dataset.stage =
    c.stage === 'PRO' ? `PRO_${LV[c.lv].region || 'ASIA'}` : c.stage;
  $('bd-phase').textContent =
    { PRESEASON: '季前', MIDSEASON: '賽季中', SEASON_END: '季末' }[S.phase] || '季前';
  renderAbils();
}

/** 能力一覽：改成選訓練之後，這是玩家唯一能看到自己能力值的地方 */
function renderAbils() {
  const box = $('abils');
  const p = S.player;
  const keys = GROUP_ABIL[p.group];
  const n = keys.length;
  const R = 46, CX = 78, CY = 70;            // viewBox 156×140
  const pt = (i, r) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
  };
  const poly = f => keys.map((k, i) => pt(i, R * f(k) / MAX_ABIL).map(v => v.toFixed(1)).join(',')).join(' ');

  const rings = [0.25, 0.5, 0.75, 1].map(f =>
    `<polygon points="${keys.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(',')).join(' ')}"
      fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
  const spokes = keys.map((_, i) => {
    const [x, y] = pt(i, R);
    return `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`;
  }).join('');
  // 縮寫 + 數值；潛力上限不畫在圖上，改到展開的細項裡看
  // 標出哪些能力計入目前位置的綜合評價 —— 不標的話玩家會練了一堆不算分的東西
  const counted = POS_WEIGHT[p.dpos || bestPos(p)] || {};
  const labels = keys.map((k, i) => {
    const [x, y] = pt(i, R + 13);
    const on = counted[k] !== undefined;
    return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" font-size="9"
      fill="${on ? 'var(--amber)' : 'var(--dim)'}" opacity="${on ? 1 : .45}">` +
      `${ABIL_SHORT[k] || ABIL[k]}<tspan fill="${on ? 'var(--ink)' : 'var(--dim)'}" font-weight="700">${p.ab[k]}</tspan></text>`;
  }).join('');

  box.innerHTML =
    `<svg viewBox="0 0 156 140" role="img" aria-label="能力雷達圖（點擊看細項）">` +
      rings + spokes +
      `<polygon points="${poly(k => p.ab[k])}" fill="var(--amber)" fill-opacity=".22"
        stroke="var(--amber)" stroke-width="2"/>` +
      labels +
    `</svg>`;
  renderAbilDetail();
}

/** 點雷達圖展開的能力細項：長條圖看得到與潛力上限的距離 */
let detailOpen = false;

function renderAbilDetail() {
  const box = $('abils-detail');
  box.hidden = !detailOpen;
  if (!detailOpen) return;
  const p = S.player;
  const cw = POS_WEIGHT[p.dpos || bestPos(p)] || {};
  box.innerHTML = `<div class="sheet"><h4>能力細項　${p.name}・${p.age} 歲` +
    `<small style="color:var(--dim);font-weight:400">　（★ = 計入 ${DPOS[p.dpos || bestPos(p)].n} 的綜合）</small></h4>` +
    GROUP_ABIL[p.group].map(k => {
      const v = p.ab[k], pk = p.pot[k] ?? 70;
      return `<div class="abrow"${cw[k] === undefined ? ' style="opacity:.5"' : ''}>` +
        `<span class="nm">${ABIL[k]}${cw[k] !== undefined ? '<small style="color:var(--amber)">★</small>' : ''}</span>` +
        `<span class="bar"><i style="width:${v / MAX_ABIL * 100}%"></i>` +
        `<em style="left:${pk / MAX_ABIL * 100}%"></em></span>` +
        `<span class="val">${v}<small>/${pk}</small></span></div>`;
    }).join('') +
    `<div class="radar-key">紅線 = 潛力上限（再往上成本大增）<br>點任意處關閉</div></div>`;
  box.onclick = () => { detailOpen = false; renderAbilDetail(); };
}

function scrollBottom() {
  requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight));
}

/* ---------------- 決策 ---------------- */
function renderPending(pending) {
  if (pending.type === 'choice') return renderChoice(pending);
  if (pending.type === 'train') return renderTrain(pending);
  if (pending.type === 'alloc') return renderAlloc(pending);
}

/** 季前訓練：把每顆骰指派給一個訓練項目，而不是直接點能力 */
function renderTrain({ title, note, dice, fixed, options, extra }) {
  const a = $('act');
  const picks = [];
  let phase = 'dice';      // dice → extra → done
  let chosenExtra = null;

  const render = () => {
    const idx = picks.length;
    a.innerHTML = `<div class="title">${title}　` +
      (phase === 'dice' ? `剩餘 ${dice.length - idx} 顆訓練骰` : '自主加練（可跳過）') +
      `</div>`;

    if (fixed.length) {
      a.innerHTML += `<div class="fixed-row">必修課表：` +
        fixed.map(f => `${f.n} <b>${f.die}</b>`).join('　') + `</div>`;
    }
    if (note) a.innerHTML += `<div class="train-note">${note}</div>`;
    if (dice.length) {
      a.innerHTML += `<div id="dice">${dice.map((v, i) =>
        `<div class="die ${i < idx ? 'used' : ''} ${i === idx && phase === 'dice' ? 'active' : ''} ${v >= 9 ? 'six' : ''}">${v}</div>`
      ).join('')}</div>`;
    }

    if (phase === 'dice' || phase === 'extra') {
      // 訓練項目排成方格，一行放得下好幾個
      const grid = document.createElement('div');
      grid.className = 'row grid trainset';
      const used = {};
      picks.forEach(pk => (used[pk.key] = (used[pk.key] || 0) + 1));
      fixed.forEach(f => (used[f.key] = (used[f.key] || 0) + 1));
      options.forEach(o => {
        const b = document.createElement('button');
        // 選過的加深底色，一顆骰加深一級
        const lv = Math.min(used[o.v] || 0, 3);
        b.className = 'btn' + (o.major ? ' main' : '') + (lv ? ' picked p' + lv : '');
        b.disabled = !!o.dead;
        b.textContent = o.t;
        b.onclick = () => {
          if (phase === 'dice') picks.push({ key: o.v, die: dice[idx] });
          else { chosenExtra = o.v; phase = 'done'; submit(); return; }
          if (picks.length >= dice.length) phase = extra ? 'extra' : 'done';
          if (phase === 'done') return submit();
          render();
        };
        grid.appendChild(b);
      });
      a.appendChild(grid);
    }

    const undo = document.createElement('button');
    undo.className = 'btn';
    undo.style.textAlign = 'center';
    undo.textContent = '↩ 復原';
    undo.disabled = !picks.length;
    undo.onclick = () => { picks.pop(); phase = 'dice'; render(); };
    a.appendChild(undo);

    if (phase === 'extra') {
      const skip = document.createElement('button');
      skip.className = 'btn main';
      skip.style.textAlign = 'center';
      skip.innerHTML = '不加練，好好休息 ▸<small>這季多一次際遇（可能是機會，也可能是麻煩）</small>';
      skip.onclick = () => { chosenExtra = null; submit(); };
      a.appendChild(skip);
    }
    scrollBottom();
  };

  const submit = () => {
    a.innerHTML = '';
    push(answer(S, { fixed, picks, extra: chosenExtra }));
  };

  if (!dice.length) { phase = extra ? 'extra' : 'done'; if (phase === 'done') return submit(); }
  render();
}

function renderChoice({ title, options }) {
  const a = $('act');
  a.innerHTML = title ? `<div class="title">${title}</div>` : '';
  options.forEach(o => {
    const b = document.createElement('button');
    b.className = 'btn' + (o.main ? ' main' : '') + (o.warn ? ' warn' : '');
    b.innerHTML = o.t + (o.s ? `<small>${o.s}</small>` : '');
    b.onclick = () => { a.innerHTML = ''; push(answer(S, o.v)); };
    a.appendChild(b);
  });
  scrollBottom();
}

function renderAlloc({ title, dice, pool, locked = [], major = [] }) {
  const a = $('act');
  const p = S.player;
  // 主修置頂，鎖住的沉底；其餘折疊起來，讓玩家一眼看到該練哪三個
  const all = GROUP_ABIL[p.group];
  const keys = [
    ...all.filter(k => major.includes(k) && !locked.includes(k)),
    ...all.filter(k => !major.includes(k) && !locked.includes(k)),
    ...all.filter(k => locked.includes(k)),
  ];
  const folded = major.length ? keys.filter(k => !major.includes(k)) : [];
  let showAll = !folded.length;
  let idx = 0, left = pool || 0;
  const spent = {};
  const hist = [];
  // 在暫存副本上加點，確認前不動真正的狀態。
  // age / arch 一定要帶上：abCost 依生涯階段與原型加成計算成本。
  const draft = {
    group: p.group, age: p.age, arch: p.arch,
    ab: { ...p.ab }, pot: p.pot, carry: { ...p.carry },
  };

  const remaining = () => (dice ? dice.length - idx : left);

  function render() {
    a.innerHTML = `<div class="title">${title}　剩餘 ${remaining()}${dice ? ' 顆骰' : ' 點'}</div>`;
    if (dice) {
      a.innerHTML += `<div id="dice">${dice.map((v, i) =>
        `<div class="die ${i < idx ? 'used' : ''} ${i === idx ? 'active' : ''} ${v === 6 ? 'six' : ''}">${v}</div>`
      ).join('')}</div>`;
    }
    const visible = showAll ? keys : keys.filter(k => major.includes(k));
    visible.forEach(k => {
      const v = draft.ab[k], pk = draft.pot[k] ?? 70;
      const isLocked = locked.includes(k);
      const cap = v >= MAX_ABIL || isLocked;
      const cost = abCost(draft, k), carry = draft.carry[k] || 0;
      const r = document.createElement('div');
      r.className = 'abrow' + (cap ? ' capped' : '') + (major.includes(k) ? ' major' : '');
      r.innerHTML =
        `<span class="nm">${ABIL[k]}${isLocked ? '<small>鎖</small>' : ''}</span>` +
        `<span class="bar"><i style="width:${v / MAX_ABIL * 100}%"></i><em style="left:${pk / MAX_ABIL * 100}%"></em></span>` +
        // 蓄力槽只要有值就顯示：連帶成長常常只加半點，不顯示玩家會以為沒作用
        `<span class="val">${v}<small>/${pk}</small>` +
        `${(cost > 1 || carry > 0) && !isLocked ? `<br><small>蓄力 ${carry.toFixed(1)}/${cost}</small>` : ''}</span>`;
      if (!cap && remaining() > 0) {
        r.onclick = () => {
          const amt = dice ? dice[idx] : 1;
          // 連帶成長會動到不只一項，所以整份快照才復原得回來
          const snap = { ab: { ...draft.ab }, carry: { ...draft.carry } };
          addAb(draft, k, amt);
          spent[k] = (spent[k] || 0) + amt;
          hist.push({ k, amt, snap });
          if (dice) idx++; else left--;
          render();
        };
      }
      a.appendChild(r);
    });
    if (folded.length) {
      const t = document.createElement('button');
      t.className = 'btn';
      t.style.textAlign = 'center';
      t.innerHTML = showAll ? '▲ 只看主修' : `▼ 其他能力（${folded.length}）`;
      t.onclick = () => { showAll = !showAll; render(); };
      a.appendChild(t);
    }
    const undo = document.createElement('button');
    undo.className = 'btn';
    undo.style.textAlign = 'center';
    undo.textContent = '↩ 復原';
    undo.disabled = !hist.length;
    undo.onclick = () => {
      const h = hist.pop();
      draft.ab = { ...h.snap.ab };
      draft.carry = { ...h.snap.carry };
      spent[h.k] -= h.amt;
      if (dice) idx--; else left++;
      render();
    };
    a.appendChild(undo);

    if (remaining() === 0 || keys.every(k => draft.ab[k] >= MAX_ABIL)) {
      const ok = document.createElement('button');
      ok.className = 'btn main';
      ok.style.textAlign = 'center';
      ok.textContent = '確認 ▸';
      ok.onclick = () => { a.innerHTML = ''; push(answer(S, spent)); };
      a.appendChild(ok);
    }
    scrollBottom();
  }
  render();
}

/* ---------------- 結算 ---------------- */
function settlement() {
  const r = S.result;
  const a = $('act');
  const rows = S.career.seasons.map(x =>
    `<tr><td>${x.year}</td><td>${x.club}${x.abroad ? ' ✈' : ''}` +
    `<br><small style="opacity:.5">${x.lvName}</small></td><td>${x.apps}</td>` +
    `<td>${S.player.group === 'GK' ? x.cs : x.goals}</td><td>${x.assists}</td><td>${x.rating || '—'}</td></tr>`
  ).join('');
  renderCard({
    tone: 'gold', title: `生涯結算 — ${r.rank}`,
    html:
      `<div>${r.nation}出身・${r.origin}｜代表 ${r.natlTeam} 出賽` +
      `${r.abroadSeasons ? `｜旅外 ${r.abroadSeasons} 季` : '｜從未旅外'}</div>` +
      (r.arch ? `<div>原型 <b class="hl">${r.arch}</b>${r.archEvolved ? `　→　<b class="hl">${r.archEvolved}</b>` : ''}</div>` : '') +
      `<div>傳奇評分 <b class="hl">${r.legacy}</b>｜共 ${r.seasons} 個賽季｜球迷聲望 <b class="hl">${r.fanRep}</b></div>` +
      `<div>生涯 ${r.sum.apps} 場｜進球 ${r.sum.goals}｜助攻 ${r.sum.assists}｜零封 ${r.sum.cs}</div>` +
      `<div>國家隊 ${r.caps} 場、進球 ${r.intlGoals}` +
      `${r.worldCups.length ? `｜<b class="hl">世界盃 ${r.worldCups.join('、')}</b>` : ''}</div>` +
      `<div>生涯薪資 <b class="hl">${fmtMoney(r.salary)}</b></div>` +
      (r.coach ? `<div style="margin-top:6px;color:${r.coach.win ? 'var(--gold)' : 'var(--dn)'}">` +
        (r.coach.win
          ? `執教生涯 ${r.coach.years} 年・教練收入 ${fmtMoney(r.coach.pay)}`
          : `轉任教練 ${r.coach.years} 年後下台`) + `</div>` : '') +
      (r.shirtRetired ? `<div style="margin-top:6px;color:var(--gold)">★ 球衣退休・球場外立像 ★</div>` : '') +
      (r.legends?.length ? `<div style="margin-top:6px">這些球場永遠記得你：${r.legends.join('、')}</div>` : '') +
      (r.traits.length ? `<div style="margin-top:6px">特性：${r.traits.join('、')}</div>` : '') +
      (r.removed?.length ? `<div style="opacity:.55"><s>${r.removed.join('、')}</s></div>` : '') +
      (r.honors.length ? `<div style="margin-top:6px;color:var(--gold)">${r.honors.join('<br>')}</div>` : '') +
      `<table><tr><th>年</th><th>球會</th><th>場</th><th>${S.player.group === 'GK' ? '零封' : '球'}</th><th>助</th><th>評分</th></tr>${rows}</table>`,
  });
  a.innerHTML = '';
  const pic = document.createElement('button');
  pic.className = 'btn main';
  pic.style.textAlign = 'center';
  pic.textContent = '產生分享圖片';
  pic.onclick = () => openShareImage(S);
  const share = document.createElement('button');
  share.className = 'btn';
  share.style.textAlign = 'center';
  share.textContent = '複製這段人生的種子碼';
  share.onclick = () => {
    navigator.clipboard?.writeText(`${location.origin}${location.pathname}?seed=${S.seed}`);
    share.textContent = '已複製 ✓';
  };
  const again = document.createElement('button');
  again.className = 'btn';
  again.style.textAlign = 'center';
  again.textContent = '換一個種子，再來一次';
  again.onclick = () => { localStorage.removeItem(SAVE_KEY); location.href = location.pathname; };
  a.append(pic, share, again);
  localStorage.removeItem(SAVE_KEY);
}

/* ---------------- 存檔 ---------------- */
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ }
}

function tryResume() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const saved = JSON.parse(raw);
    if (saved.done) return false;
    // 規則改版後聯賽 id 與欄位都會變，舊存檔直接丟掉比讀進來壞掉好
    if (saved.v !== SCHEMA_VERSION) {
      localStorage.removeItem(SAVE_KEY);
      return false;
    }
    const a = $('act');
    a.innerHTML = '<div class="title">偵測到未完成的生涯</div>';
    const cont = document.createElement('button');
    cont.className = 'btn main';
    cont.textContent = `繼續 ${saved.player.name} 的生涯`;
    cont.innerHTML += `<small>${saved.career.year} 年 · ${saved.player.age} 歲 · ${saved.club.club}</small>`;
    cont.onclick = () => {
      S = saved;
      $('setup').hidden = true; $('board').hidden = false; a.innerHTML = '';
      $('abils').onclick = () => { detailOpen = !detailOpen; renderAbilDetail(); };
          // 存檔沒有保留畫面歷史，直接從當前決策點續玩
      divider(`${S.career.year} 年 · ${S.player.age} 歲（讀取存檔）`);
      push(run(S));
    };
    const fresh = document.createElement('button');
    fresh.className = 'btn';
    fresh.textContent = '開新的生涯';
    fresh.onclick = () => { localStorage.removeItem(SAVE_KEY); a.innerHTML = ''; };
    a.append(cont, fresh);
    return true;
  } catch (e) { return false; }
}

initSetup();
tryResume();
