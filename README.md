# FootballLife ⚽ 足球人生模擬器

從台灣高中足球隊出發，經企業聯賽 → 日本 → 歐洲跳板聯賽 → 五大聯賽，
最終目標是把台灣代表隊帶進世界盃。純文字生涯養成，種子化，每一個決定都算數。

> 玩法概念致敬 [yakyulife](https://github.com/LeoGGcat/yakyulife)（CC BY-NC 4.0），詳見 [NOTICE.md](NOTICE.md)。

---

## 快速開始

**不需要安裝任何東西就能玩**（純 ES modules）：

```bash
python3 -m http.server 8000
# 開 http://localhost:8000
```

要用 Vite 開發與建置成單一 HTML：

```bash
npm install
npm run dev      # 開發伺服器
npm run build    # 產出 dist/index.html（單檔，可直接丟 GitHub Pages）
npm run sim      # 跑 2000 局平衡模擬
```

推上 `main` 後 GitHub Actions 會自動建置並部署到 Pages
（Settings → Pages → Source 選 **GitHub Actions**）。

---

## 架構

```
src/
├─ engine/            ★ 純函式，零 DOM 相依，可在 Node 裡跑
│  ├─ rng.js          種子化亂數（mulberry32）
│  ├─ data.js         所有平衡數值：能力、位置、聯賽、球會、事件卡、特性
│  ├─ state.js        狀態建立、能力成長、綜合評價、陣中地位
│  ├─ sim.js          出場時間、賽季數據、傷病、薪資、衰退
│  └─ flow.js         年度流程狀態機
├─ main.js            UI：記錄流 + 選項按鈕 + 狀態列
tools/balance-sim.js  蒙地卡羅平衡模擬
docs/SPEC.md          完整開發規格書
```

### 引擎介面只有兩個函式

```js
import { createState } from './src/engine/state.js';
import { run, answer } from './src/engine/flow.js';

const s = createState('abc123', { name: '王小明', number: 10, group: 'FW' });
s.step = 'YEAR_START';

let r = run(s);                  // 推進到下一個決策點
r = answer(s, r.pending.options[0].v);   // 回答後繼續推進
// r = { cards: [...], pending: {...} | null, state }
```

`cards` 是純資料（`{tone, title, html}`），UI 層才決定怎麼畫。
因此同一份引擎可以：

- 在瀏覽器跑遊戲
- 在 Node 裡跑萬次模擬調平衡
- 之後移植 Kotlin 做 Android，或放在 server 上用 `{seed, actionLog}` 重放驗證排行榜成績（防作弊）

### 決定論

所有遊戲隨機都走 `Rng`，並記錄 `cursor`。因此：

- 同種子 ＋ 同選擇 ＝ 同一段人生，`?seed=xxx` 就是可分享的劇本
- 存檔只要存 `{seed, cursor, state}` 就能完整還原
- 純視覺效果請用 `Math.random()`，**不要**污染這條序列

⚠️ 任何新增／刪除 `rng` 呼叫的規則改動都會讓舊種子結果漂移。發版時請更新 CHANGELOG。

---

## 核心機制

| 系統 | 說明 |
|---|---|
| **陣中地位** | `squadGap = 綜合 − (聯賽基準 + 球會等級 + 位置競爭)` → 核心／主力／輪替／替補／看台席，決定出場率。**能力夠了也不一定有球踢**，這是與棒球版最大的差異 |
| **球會等級** | 豪門／爭冠／中游／保級，獨立於聯賽等級。豪門板凳 vs 中游主力是每季的真實抉擇 |
| **能力養成** | 20–80 球探量表、OOTP 式潛力天花板、階梯成本、蓄力槽（未滿一級不蒸發，扣值 1:1 立即生效） |
| **韌帶量表** | 由 `(速度+對抗) × 踢法 × 出場負荷` 累積；爆表時二選一：動手術（報銷一年、速度回春）或打封閉硬撐（55%，失敗重大斷裂） |
| **非均勻衰退** | 31 歲起速度體能大跌、閱讀比賽的能力不跌 → 天然導出「速度型早退、技術型長青」與位置轉型 |
| **世界盃** | 台灣代表隊整體實力每屆隨機，個人能力最多提供 +10% 加成。晉級會內賽是全遊戲最大的情緒高點 |

---

## 目前的平衡狀況（M0，尚未調校）

`npm run sim` 的實測結果與目標值差距如下，**這是下一步的主要工作**：

| 指標 | 目前 | 目標 |
|---|---|---|
| 登上五大聯賽 | ~27% | 6–10% |
| 登上 J1／歐洲以上 | ~100% | 25–45% |
| 一輩子沒離開台灣 | 0% | 25–50% |
| 25 歲前退出足球 | 0% | 10–22% |
| 生涯至少一次重傷 | ~93% | 40–65% |

**根因**：能力成長曲線太快（`abCost` 低值區太便宜 ＋ 每季骰數偏多），
導致綜合評價輕鬆突破各級門檻，整個階梯形同虛設。

建議的調整順序：

1. `data.js` → 調 `LV.par/min`，拉開各級距離
2. `state.js` → `abCost()` 低值區改成 2 點起跳，或 `flow.js` 的季前骰數改成 2–5 顆
3. `sim.js` → `injuryRisk()` 降基礎值，重傷判定改成需連續高負荷才觸發
4. 每次改完跑 `npm run sim 2000` 對表

---

## Roadmap

- [x] **M0** 引擎骨架、年度流程、可玩到引退
- [ ] **M1** 平衡調校（見上表）、賽季數據更細（黃紅牌、關鍵傳球）
- [ ] **M2** 完整合約系統：解約金條款、自由轉會、經紀人、買斷選項
- [ ] **M3** 位置轉型事件、更多隱藏特性、感情線
- [ ] **M4** 洲際盃獨立賽制、國家隊完整循環、歸化劇本
- [ ] **M5** 結算分享長圖（兩段式 canvas）、四套主題、PWA
- [ ] **M6** Kotlin 引擎移植（Android）或 server 排行榜

---

## 授權

CC BY-NC 4.0。可自由分享、改作，須標示來源，不得商業利用。
