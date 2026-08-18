import { randomSeed } from './engine/rng.js';
import { createState, ovr, abCost, addAb, defaultPos } from './engine/state.js';
import { run, answer } from './engine/flow.js';
import { ABIL, GROUP_ABIL, POS_GROUP, DPOS, LV, TIER, SQUAD } from './engine/data.js';
import { fmtMoney } from './engine/sim.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'fl-save';
const PREF_KEY = 'fl-pref';

let S = null;
let curYearBody = null;
const MAX_YEARS = 40;

/* ---------------- 開場 ---------------- */
const SEED = new URLSearchParams(location.search).get('seed') || randomSeed();
let pickedGroup = 'FW';

function setup() {
  const row = $('pos-row');
  row.innerHTML = '';
  Object.entries(POS_GROUP).forEach(([k, n]) => {
    const b = document.createElement('button');
    b.className = 'btn' + (k === pickedGroup ? ' sel' : '');
    b.textContent = n;
    b.onclick = () => { pickedGroup = k; setup(); };
    row.appendChild(b);
  });
  const pref = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
  if (pref.name) $('in-name').value = pref.name;
  if (pref.number) $('in-number').value = pref.number;
  $('seed-line').textContent = `世界種子：${SEED}　相同種子＋相同選擇＝相同人生`;
  $('btn-start').onclick = start;
}

function start() {
  const name = ($('in-name').value || '無名').slice(0, 10);
  const number = parseInt($('in-number').value, 10) || 10;
  localStorage.setItem(PREF_KEY, JSON.stringify({ name, number }));
  S = createState(SEED, { name, number, group: pickedGroup });
  S.step = 'YEAR_START';
  $('setup').hidden = true;
  $('board').hidden = false;
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
  $('bd-sub').textContent =
    `${p.dpos ? DPOS[p.dpos].n : POS_GROUP[p.group]}` +
    (c.stage === 'PRO' ? `・${roleName}・出場率 ${Math.round(c.minutes * 100)}%` : '');
  const tier = c.stage === 'PRO' ? `（${TIER[c.tier].n}）` : '';
  $('bd-club').textContent = `${c.club}${tier}`;
  $('bd-age').textContent = p.age;
  $('bd-year').textContent = S.career.year;
  $('bd-ovr').textContent = ovr(p);
  $('bd-sal').textContent = Math.round(S.career.salaryTotal).toLocaleString('zh-TW');
  const idx = { PRESEASON: 0, MIDSEASON: 1, SEASON_END: 2 }[S.phase] ?? 0;
  document.querySelectorAll('#phase div').forEach((d, i) => d.classList.toggle('on', i === idx));
}

function scrollBottom() {
  requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight));
}

/* ---------------- 決策 ---------------- */
function renderPending(pending) {
  if (pending.type === 'choice') return renderChoice(pending);
  if (pending.type === 'alloc') return renderAlloc(pending);
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

function renderAlloc({ title, dice, pool }) {
  const a = $('act');
  const p = S.player;
  const keys = GROUP_ABIL[p.group];
  let idx = 0, left = pool || 0;
  const spent = {};
  const hist = [];
  // 在暫存副本上加點，確認前不動真正的狀態
  const draft = { group: p.group, ab: { ...p.ab }, pot: p.pot, carry: { ...p.carry } };

  const remaining = () => (dice ? dice.length - idx : left);

  function render() {
    a.innerHTML = `<div class="title">${title}　剩餘 ${remaining()}${dice ? ' 顆骰' : ' 點'}</div>`;
    if (dice) {
      a.innerHTML += `<div id="dice">${dice.map((v, i) =>
        `<div class="die ${i < idx ? 'used' : ''} ${i === idx ? 'active' : ''} ${v === 6 ? 'six' : ''}">${v}</div>`
      ).join('')}</div>`;
    }
    keys.forEach(k => {
      const v = draft.ab[k], cap = v >= 80, pk = draft.pot[k] ?? 62;
      const cost = abCost(draft, k), carry = draft.carry[k] || 0;
      const r = document.createElement('div');
      r.className = 'abrow' + (cap ? ' capped' : '');
      r.innerHTML =
        `<span class="nm">${ABIL[k]}</span>` +
        `<span class="bar"><i style="width:${v / 80 * 100}%"></i><em style="left:${pk / 80 * 100}%"></em></span>` +
        `<span class="val">${v}<small>/${pk}</small>${cost > 1 ? `<br><small>${carry}/${cost}</small>` : ''}</span>`;
      if (!cap && remaining() > 0) {
        r.onclick = () => {
          const amt = dice ? dice[idx] : 1;
          const before = { v: draft.ab[k], c: draft.carry[k] };
          addAb(draft, k, amt);
          spent[k] = (spent[k] || 0) + amt;
          hist.push({ k, amt, before });
          if (dice) idx++; else left--;
          render();
        };
      }
      a.appendChild(r);
    });
    const undo = document.createElement('button');
    undo.className = 'btn';
    undo.style.textAlign = 'center';
    undo.textContent = '↩ 復原';
    undo.disabled = !hist.length;
    undo.onclick = () => {
      const h = hist.pop();
      draft.ab[h.k] = h.before.v; draft.carry[h.k] = h.before.c;
      spent[h.k] -= h.amt;
      if (dice) idx--; else left++;
      render();
    };
    a.appendChild(undo);

    if (remaining() === 0 || keys.every(k => draft.ab[k] >= 80)) {
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
    `<tr><td>${x.year}</td><td>${x.club}</td><td>${x.apps}</td>` +
    `<td>${S.player.group === 'GK' ? x.cs : x.goals}</td><td>${x.assists}</td><td>${x.rating || '—'}</td></tr>`
  ).join('');
  renderCard({
    tone: 'gold', title: `生涯結算 — ${r.rank}`,
    html:
      `<div>傳奇評分 <b class="hl">${r.legacy}</b>｜共 ${r.seasons} 個賽季</div>` +
      `<div>生涯 ${r.sum.apps} 場｜進球 ${r.sum.goals}｜助攻 ${r.sum.assists}｜零封 ${r.sum.cs}</div>` +
      `<div>國家隊 ${r.caps} 場、進球 ${r.intlGoals}` +
      `${r.worldCups.length ? `｜<b class="hl">世界盃 ${r.worldCups.join('、')}</b>` : ''}</div>` +
      `<div>生涯薪資 <b class="hl">${fmtMoney(r.salary)}</b></div>` +
      (r.traits.length ? `<div style="margin-top:6px">特性：${r.traits.join('、')}</div>` : '') +
      (r.honors.length ? `<div style="margin-top:6px;color:var(--gold)">${r.honors.join('<br>')}</div>` : '') +
      `<table><tr><th>年</th><th>球會</th><th>場</th><th>${S.player.group === 'GK' ? '零封' : '球'}</th><th>助</th><th>評分</th></tr>${rows}</table>`,
  });
  a.innerHTML = '';
  const share = document.createElement('button');
  share.className = 'btn main';
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
  a.append(share, again);
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
    const a = $('act');
    a.innerHTML = '<div class="title">偵測到未完成的生涯</div>';
    const cont = document.createElement('button');
    cont.className = 'btn main';
    cont.textContent = `繼續 ${saved.player.name} 的生涯`;
    cont.innerHTML += `<small>${saved.career.year} 年 · ${saved.player.age} 歲 · ${saved.club.club}</small>`;
    cont.onclick = () => {
      S = saved;
      $('setup').hidden = true; $('board').hidden = false; a.innerHTML = '';
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

setup();
tryResume();
