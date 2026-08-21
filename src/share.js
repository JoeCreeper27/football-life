import {
  ABIL, ABIL_SHORT, GROUP_ABIL, MAX_ABIL, POS_WEIGHT, DPOS,
} from './engine/data.js';
import { bestPos } from './engine/state.js';
import { fmtMoney } from './engine/sim.js';

/* ---------------- 分享圖 ---------------- */
/* 生涯結束後把整段人生畫成一張直式長圖。純 canvas，不依賴任何外部函式庫，
   因為 build 出來的是單一 HTML 檔，不能在執行期抓 CDN。 */

export const SHARE_W = 720;                    // 邏輯寬度；實際輸出再乘上 SHARE_SCALE
const SHARE_SCALE = 2;                  // 2 倍點陣，貼到社群才不會糊
const TOP_LV_NAME = { BIG5: '五大聯賽', EUR2: '五大次級', TOP: '洲際頂級', HOME: '國內聯賽' };

/** 取目前階段的配色 —— 分享圖跟著結局的地區走，同一張圖一看就知道人生落在哪 */
function shareTheme() {
  const cs = getComputedStyle(document.body);
  const v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
  return {
    bg: v('--bg', '#0b1a10'), panel: v('--panel', '#12281a'), line: v('--line', '#1e4029'),
    ink: v('--ink', '#e8f0e6'), dim: v('--dim', '#8fae95'),
    amber: v('--amber', '#f5c451'), gold: v('--gold', '#f0d078'),
  };
}

const SHARE_FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif';
const shFont = (w, px) => `${w} ${px}px ${SHARE_FONT}`;

/** 量一段文字要斷成幾行（畫之前要先知道畫布多高） */
function wrapLines(ctx, str, max) {
  const out = [];
  let line = '';
  for (const ch of String(str)) {
    if (ctx.measureText(line + ch).width > max && line) { out.push(line); line = ch; }
    else line += ch;
  }
  if (line) out.push(line);
  return out;
}

export function buildShareCanvas(S) {
  const p = S.player, r = S.result, T = shareTheme();
  const PAD = 44, INNER = SHARE_W - PAD * 2;
  const isGK = p.group === 'GK';

  // 先用一張暫時的 canvas 量文字，決定最終高度 —— 榮譽列數是變動的
  const m = document.createElement('canvas').getContext('2d');
  m.font = shFont(400, 19);
  const honors = r.honors.slice(0, 7);
  const honorLines = honors.reduce((a, h) => a + wrapLines(m, h, INNER - 26).length, 0);
  const moreHonors = r.honors.length - honors.length;
  m.font = shFont(400, 17);
  const traitLines = r.traits.length ? wrapLines(m, `特性　${r.traits.join('、')}`, INNER).length : 0;

  const RADAR_R = 128;
  const H = 300                                   // 抬頭 + 名次橫幅
    + RADAR_R * 2 + 78                            // 雷達圖
    + 4 * 74 + 24                                 // 四列數據
    + (r.worldCups.length ? 40 : 0)
    + (r.shirtRetired ? 40 : 0)
    + (honorLines ? 34 + honorLines * 30 : 0)
    + (moreHonors > 0 ? 26 : 0)
    + (traitLines ? 18 + traitLines * 26 : 0)
    + 96;                                         // 頁尾

  const cv = document.createElement('canvas');
  cv.width = SHARE_W * SHARE_SCALE;
  cv.height = Math.round(H) * SHARE_SCALE;
  const c = cv.getContext('2d');
  c.scale(SHARE_SCALE, SHARE_SCALE);
  c.textBaseline = 'alphabetic';

  // 底：從 panel 漸層到 bg，上緣壓一條金線
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, T.panel); g.addColorStop(0.55, T.bg); g.addColorStop(1, T.bg);
  c.fillStyle = g; c.fillRect(0, 0, SHARE_W, H);
  c.fillStyle = T.gold; c.fillRect(0, 0, SHARE_W, 5);

  const text = (str, x, y, o = {}) => {
    c.font = shFont(o.weight || 400, o.size || 18);
    c.fillStyle = o.color || T.ink;
    c.textAlign = o.align || 'left';
    c.fillText(str, x, y);
  };

  let y = 56;
  text('FOOTBALL LIFE ⚽', PAD, y, { size: 15, weight: 700, color: T.dim });
  text(`SEED ${S.seed}`, SHARE_W - PAD, y, { size: 15, color: T.dim, align: 'right' });

  y += 62;
  // 名字可能很長，量過之後才決定字級，不然會撞到右邊的背號
  let nameSize = 46;
  c.font = shFont(700, nameSize);
  while (c.measureText(p.name).width > INNER - 80 && nameSize > 24) {
    nameSize -= 2; c.font = shFont(700, nameSize);
  }
  c.textAlign = 'left'; c.fillStyle = T.ink;
  c.fillText(p.name, PAD, y);
  const nameW = c.measureText(p.name).width;
  text(`#${p.number}`, PAD + nameW + 12, y, { size: 24, weight: 700, color: T.amber });

  y += 32;
  const pos = DPOS[p.dpos || bestPos(p)]?.n || '';
  text(`${r.nation}出身・${r.origin}｜${pos}${r.arch ? `・${r.archEvolved || r.arch}` : ''}`,
    PAD, y, { size: 19, color: T.dim });

  // 名次橫幅
  y += 26;
  c.fillStyle = T.panel; c.strokeStyle = T.gold; c.lineWidth = 1.5;
  c.beginPath();
  // roundRect 是比較新的 API，舊瀏覽器退回直角
  if (c.roundRect) c.roundRect(PAD, y, INNER, 78, 12); else c.rect(PAD, y, INNER, 78);
  c.fill(); c.stroke();
  text(r.rank, PAD + 22, y + 50, { size: 34, weight: 700, color: T.gold });
  text('傳奇評分', SHARE_W - PAD - 22, y + 30, { size: 14, color: T.dim, align: 'right' });
  text(String(r.legacy), SHARE_W - PAD - 22, y + 58, { size: 28, weight: 700, color: T.amber, align: 'right' });

  // 雷達圖：與遊戲中的同一份畫法，金色軸 = 計入綜合評價的能力
  y += 78 + 52 + RADAR_R;
  const keys = GROUP_ABIL[p.group], n = keys.length, CX = SHARE_W / 2, CY = y;
  const pt = (i, rr) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [CX + Math.cos(a) * rr, CY + Math.sin(a) * rr];
  };
  c.strokeStyle = T.line; c.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach(f => {
    c.beginPath();
    keys.forEach((_, i) => { const [x, yy] = pt(i, RADAR_R * f); i ? c.lineTo(x, yy) : c.moveTo(x, yy); });
    c.closePath(); c.stroke();
  });
  keys.forEach((_, i) => {
    const [x, yy] = pt(i, RADAR_R);
    c.beginPath(); c.moveTo(CX, CY); c.lineTo(x, yy); c.stroke();
  });
  c.beginPath();
  keys.forEach((k, i) => {
    const [x, yy] = pt(i, RADAR_R * p.ab[k] / MAX_ABIL);
    i ? c.lineTo(x, yy) : c.moveTo(x, yy);
  });
  c.closePath();
  c.fillStyle = T.amber; c.globalAlpha = 0.22; c.fill(); c.globalAlpha = 1;
  c.strokeStyle = T.amber; c.lineWidth = 2.5; c.stroke();

  const counted = POS_WEIGHT[p.dpos || bestPos(p)] || {};
  keys.forEach((k, i) => {
    const [x, yy] = pt(i, RADAR_R + 30);
    const on = counted[k] !== undefined;
    text(ABIL_SHORT[k] || ABIL[k], x, yy - 4, { size: 17, color: on ? T.amber : T.dim, align: 'center' });
    text(String(p.ab[k]), x, yy + 18, { size: 21, weight: 700, color: on ? T.ink : T.dim, align: 'center' });
  });

  // 數據方格
  y += RADAR_R + 48;
  const stats = [
    ['生涯賽季', `${r.seasons} 季`], ['最高層級', TOP_LV_NAME[r.topLv] || '—'],
    ['出場', `${r.sum.apps} 場`], [isGK ? '零封' : '進球', String(isGK ? r.sum.cs : r.sum.goals)],
    ['助攻', String(r.sum.assists)], ['旅外', r.abroadSeasons ? `${r.abroadSeasons} 季` : '從未旅外'],
    [`國家隊・${r.natlTeam}`, `${r.caps} 場・${r.intlGoals} 球`], ['球迷聲望', String(r.fanRep)],
  ];
  const colW = INNER / 2;
  stats.forEach(([label, val], i) => {
    const x = PAD + (i % 2) * colW, ry = y + Math.floor(i / 2) * 74;
    c.strokeStyle = T.line; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, ry - 14); c.lineTo(x + colW - 14, ry - 14); c.stroke();
    text(label, x, ry + 10, { size: 14, color: T.dim });
    text(val, x, ry + 40, { size: 25, weight: 700 });
  });
  y += 4 * 74 + 4;

  text(`生涯薪資　${fmtMoney(r.salary)}`, PAD, y, { size: 20, weight: 700, color: T.amber });
  y += 20;

  if (r.worldCups.length) {
    y += 40;
    text(`★ 世界盃　${r.worldCups.join('、')}`, PAD, y, { size: 20, weight: 700, color: T.gold });
  }
  if (r.shirtRetired) {
    y += 40;
    text('★ 球衣退休・球場外立像', PAD, y, { size: 20, weight: 700, color: T.gold });
  }
  if (honorLines) {
    y += 34;
    text('生涯榮譽', PAD, y, { size: 14, color: T.dim });
    c.font = shFont(400, 19);
    honors.forEach(h => {
      wrapLines(c, h, INNER - 26).forEach((ln, i) => {
        y += 30;
        text(i ? `　${ln}` : `🏆 ${ln}`, PAD, y, { size: 19, color: T.gold });
      });
    });
    if (moreHonors > 0) { y += 26; text(`…等 ${r.honors.length} 項`, PAD, y, { size: 16, color: T.dim }); }
  }
  if (traitLines) {
    y += 18;
    c.font = shFont(400, 17);
    wrapLines(c, `特性　${r.traits.join('、')}`, INNER).forEach(ln => {
      y += 26; text(ln, PAD, y, { size: 17, color: T.dim });
    });
  }

  // 頁尾：把種子碼寫進圖裡，看到圖的人才能踢到同一段人生
  c.strokeStyle = T.line; c.lineWidth = 1;
  c.beginPath(); c.moveTo(PAD, H - 62); c.lineTo(SHARE_W - PAD, H - 62); c.stroke();
  text('同樣的種子碼，會長出同樣的一段人生', PAD, H - 36, { size: 15, color: T.dim });
  text(`?seed=${S.seed}`, SHARE_W - PAD, H - 36, { size: 15, weight: 700, color: T.amber, align: 'right' });
  return cv;
}

/** 產圖 → 自動塞剪貼簿 → 開浮層讓玩家預覽（行動裝置可長按存圖，也給一個下載鈕） */
export function openShareImage(S) {
  const cv = buildShareCanvas(S);
  const box = document.getElementById('share-ov');
  const fileName = `football-life-${S.player.name}-${S.seed}.png`;
  box.hidden = false;
  box.innerHTML = '';

  const img = document.createElement('img');
  img.alt = '生涯結算圖';
  img.src = cv.toDataURL('image/png');
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.textContent = '產生中…';
  const row = document.createElement('div');
  row.className = 'row';

  const dl = document.createElement('button');
  dl.className = 'btn';
  dl.textContent = '下載圖片';
  const close = document.createElement('button');
  close.className = 'btn';
  close.textContent = '關閉';
  close.onclick = () => { box.hidden = true; box.innerHTML = ''; };
  row.append(dl, close);
  box.append(img, tip, row);

  cv.toBlob(async blob => {
    dl.onclick = () => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    // 剪貼簿寫圖需要安全來源，Safari 又只認同步建立的 ClipboardItem —— 失敗就退回下載
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      tip.textContent = '已複製到剪貼簿 ✓　直接貼到聊天室或社群即可';
    } catch (e) {
      tip.textContent = '這個瀏覽器不給程式複製圖片，請用下載或長按存圖';
    }
  }, 'image/png');
}
