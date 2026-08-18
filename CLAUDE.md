# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

專案語言為繁體中文（zh-TW）：程式碼註解、卡片文案、UI 字串、commit message 一律用繁中，識別字用英文。

## 常用指令

```bash
npm run dev                                 # Vite 開發伺服器
npm run build                               # 產出 dist/index.html（單檔，inline 全部 JS/CSS）
npm run sim                                 # 平衡模擬 2000 局（balanced 策略、隨機國家）
node tools/balance-sim.js 500 aggressive    # 局數與策略：balanced | safe | aggressive
node tools/balance-sim.js 600 balanced TW   # 第三個參數鎖定出身國家
python3 -m http.server 8000                 # 免安裝直接跑（純 ES modules，index.html 直接 import src/main.js）
```

沒有測試框架、沒有 linter。**平衡模擬就是這個專案的測試**：任何改動數值或規則的 PR，都應該跑 `npm run sim` 並把結果與 README「目前的平衡狀況」表格對照。模擬會印出各指標的實際值 vs 目標區間，以及 `未正常結束` 的局數（>0 代表流程有 bug，例如狀態機卡住或 `pending` 沒有對應的 bot 分支）。

推 `main` 會觸發 `.github/workflows/deploy.yml` 自動 build 並部署到 GitHub Pages。

## 架構

三層，**嚴格單向相依**：`data.js`（純資料）← `state.js` / `sim.js`（純計算）← `flow.js`（狀態機）← `main.js`（DOM）。

- `src/engine/**` 零 DOM 相依，必須能在 Node 裡跑。這是 `tools/balance-sim.js`（以及未來的 Kotlin 移植、server 端 seed 重放驗證排行榜）能成立的前提。**不要在 engine 裡碰 `document`、`localStorage`、`window`。**
- `src/main.js` 是唯一碰 DOM 的檔案，只認得 `{tone, title, html}` 卡片與 `pending.type`（`choice` / `alloc`），完全不知道遊戲規則。
- 配色靠 `body[data-stage]`（由 `board()` 設定：養成階段用 `club.stage`，職業期用 `PRO_<地區>`）切換 CSS 變數。**底色只能掛在 `body`**，`html` 一旦有底色就會蓋掉整頁的階段配色。

### 引擎對外只有兩個函式

```js
const s = createState(seed, { name, number, group });  // group: GK|DF|MF|FW
s.step = 'YEAR_START';
let r = run(s);                    // 推進到下一個決策點
r = answer(s, r.pending.options[0].v);
// r = { cards, pending, state }；s 是就地變更（mutable），不是 immutable reducer
```

`loop()` 會一直呼叫 `STEPS[s.step]` 直到 `s.pending` 被設定或 `s.done`（上限 400 步的 guard）。

### 新增流程步驟的慣例（`flow.js`）

每個步驟是 `STEPS.NAME = (s, ctx, input) => {...}`，並且**必須**在結束前設定 `s.step` 指向下一步，否則會無限迴圈直到 guard 中斷。

需要玩家決策的步驟寫成同一個函式的兩段式：

```js
STEPS.FOO = (s, ctx, input) => {
  if (input === undefined) {
    return ask(s, { type: 'choice', title, options }, 'FOO');  // resume 回自己
  }
  // input 是玩家選的 option.v（choice）或 { abilKey: 點數 }（alloc）
  s.step = 'NEXT';
};
```

`input` 只餵給 loop 的第一個步驟，之後的步驟拿到 `undefined`。跨步驟的暫存值放在 `s._` 開頭的欄位（如 `s._ev` 剩餘事件卡數、`s._card` 當前卡名），用完要設回 `undefined` —— 這些會被序列化進存檔，所以不能塞函式或 DOM 節點。

輸出用 `card(ctx, tone, title, html)`；tone 可用 `''` / `good` / `bad` / `gold` / `info`。分隔線用 `ctx.cards.push({ divider })`。

### 決定論（最重要的不變量）

所有遊戲隨機都必須走 `ctx.rng`（`int` / `pick` / `chance` / `gauss` / `shuffle`），因為「同種子 ＋ 同選擇 ＝ 同一段人生」是這個產品的傳播支點。

- 純視覺效果（動畫、粒子）用 `Math.random()`，**不要**污染這條序列。
- 存檔 = `JSON.stringify(state)`，靠 `s.cursor` 快轉還原 RNG 位置；`loop()` 結尾的 `syncCursor` 負責寫回。
- **任何新增／刪除／重排 `rng` 呼叫的改動都會讓舊種子結果漂移，舊分享連結失效。** 這種改動要更新 CHANGELOG（`state.js` 的 `SCHEMA_VERSION` 也在那裡）。
- `balance-sim.js` 的 `playOne()` 用 `Math.random()` 選位置大類，所以模擬結果每次都不同——這是刻意的，不要「修」成 seeded。

### 生涯階梯是「層級 × 地區」，不是一條線

`LV` 裡每個聯賽都有 `tier`（1–7，7 = 五大聯賽）與 `region`（ASIA/EUR/SAM/NAM）。
**沒有 `LADDER` 陣列了** —— 同一層有多個地區的聯賽，用 `leaguesAt(tier)` 取。

`NATIONS[x].home` 是「該國在各層級的國內聯賽」，決定 `isHomeLeague()` / `isAbroad()`。
台灣只有 `{1:'TPFL'}`，所以台灣球員想上第 2 層以上一定得旅外 —— 這是各國難度差異的主要來源，
不要為了「讓每個國家都能在國內爬到頂」而補齊 `home`，那會把整個設計拆掉。

轉會選項的 value 帶參數：`up:` 升級、`side:` 同級跨地區、`down:` 降級、`home:` 返鄉、`pro:` 首份合約，
在 `END_MOVE` / `graduate` 裡用前綴解析。新增選項時沿用這個格式，`balance-sim.js` 的 bot 也是靠前綴分派的。
目的地清單一律經過 `diversify()`，它會國內優先再各地區輪流取 —— 這是為了讓選單不會整排都是同一洲。

`ageWindow(p, lvId)`（在 `state.js`）決定旅外窗口：層級越高關得越早，本區球員 +3、移民 +2~3。

### 成長曲線與原型

`GROWTH`（`data.js`）是四階段表，`flow.js:diceSpec` 依年齡取骰數與骰面，`state.js:abCost`
乘上該階段的 `cost`。**這兩處合起來就是整條成長曲線**，改任一邊都要重跑模擬。
29 歲後 `isGrowable()` 只放行 `LATE_GROWABLE` 裡的技術類能力。

`ARCHETYPE` 是 18 歲時依能力分布長出來的，不是開局選的。選定後有四個效果：
`abCost` 主修 ×0.7／非主修 ×1.3、主修 `pot` +4、`sim.js` 的 `POS_OUTPUT` 乘上 `out`、
解鎖 `cond: isArch('key')` 的專屬事件卡。`ageBias: 'early'` 的原型 31 歲後產能斷崖。

### 事件卡

抽卡在 `flow.js:drawEvent`：先過 `for` 與 `cond`，再依 `weight` 加權抽樣，`once` 卡記在
`s.career.seenEvents`。效果表 `g`/`b` 裡能力代碼、`inj`、`rand`、`fanRep` 走同一條路徑
（`applyEffects`）；比這更複雜的副作用寫在 `fx(s, win, api)`，`api` 由 `fxApi()` 提供
（`fine` / `suspend` / `shiftRole` / `unlock` / `card`），**不要讓 data.js 直接碰 flow 的內部結構**。

有 `opts` 的卡是分岔型：不賭成功率，而是讓玩家在兩條路之間選。

新增負面特性時一定要同時給 `cure` 文案並在 `flow.js:cureTraits` 加上解除條件 ——
每張負面卡都要有出路，否則玩家會覺得是被懲罰而不是被講了一個故事。

### 數值模型

一切繫於單一標量 `d = 位置加權能力 − 聯賽 par`（`sim.js:dValue`），推導出賽季數據、評分、薪資、獎項機率。足球版在此之上多一條獨立軸：

`squadGap = ovr − (聯賽 par + 球會 tier 加成 + 位置競爭)` → 陣中地位 → 出場率 → 乘進所有數據、負荷與續約。**「能力夠了也不一定有球踢」是與棒球版最大的差異，改動時不要把這條軸簡化掉。**

注意 `tier` 這個字在程式裡有兩個意思：`LV[x].tier` 是聯賽層級（1–7），`club.tier` / `TIER` 是球會等級（豪門～保級）。函式參數用 `clubTier` 區分。

平衡數值全部集中在 `data.js`（`LV` 聯賽階梯、`TIER` 球會等級、`SQUAD` 地位門檻、`POS_WEIGHT` / `POS_OUTPUT`、`DPOS` 位置門檻、`EVENTS`、`TRAITS`、`CONF`）。**調平衡改表，不改邏輯**；如果發現得改 `flow.js` 才調得動某個數字，通常代表那個數字該搬進 `data.js`。

隱藏特性一律透過 `unlock(s, ctx, key)` 解鎖（會自動去重並印卡）；觸發條件不對玩家顯示，計數放在 `s.career.counters`。

## 需要注意的事

- **平衡只調到一半**，實測見 README 表格。五大聯賽登陸率（6.2%）與各國分布已經在目標內，但「登上洲際頂級以上 ~87%」與「重傷率 ~86%」仍偏高，入手點是 `LV` 第 3–4 層的 `min` 與 `CONF.baseInjury`。改動時記得跑單國模式對表。
- `docs/develop.md` 是 M1 規格書（成長節奏、原型、事件庫），已實作完畢；裡面的「現況」數字是改版前的，別拿來對表。
- 養成階段共 6 年（國中 3 + 高中／足球學校 3），成長階段則由年齡決定（見上）。
- 球會名一律用**改編虛構名**（「泰晤士紅軍」「馬德里白衫」），聯賽用描述性名稱（「英格蘭超級聯賽」「歐洲跳板聯賽」）而非官方商標名，規避 FIFA/UEFA 與肖像權。國家用真實國名沒問題，但代表隊一律寫「◯◯代表隊」。新增資料時照做。
- 授權為 CC BY-NC 4.0，玩法架構致敬 yakyulife，改動時保留 NOTICE.md 的標示。
- `docs/SPEC.md` 是完整規格書（含尚未實作的 M1–M6：合約與解約金、租借買斷、位置轉型、感情線、洲際盃、分享長圖、PWA）。實作新系統前先看該章節，數值與命名多半已經定好了。
