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
# http://localhost:5173/share-preview.html   # 分享圖排版工作台（改 src/share.js 存檔即重繪）
```

沒有測試框架、沒有 linter。**平衡模擬就是這個專案的測試**：任何改動數值或規則的 PR，都應該跑 `npm run sim` 並把結果與 README「目前的平衡狀況」表格對照。模擬會印出各指標的實際值 vs 目標區間，以及 `未正常結束` 的局數（>0 代表流程有 bug，例如狀態機卡住或 `pending` 沒有對應的 bot 分支）。

推 `main` 會觸發 `.github/workflows/deploy.yml` 自動 build 並部署到 GitHub Pages。

## 架構

三層，**嚴格單向相依**：`data.js`（純資料）← `state.js` / `sim.js`（純計算）← `flow.js`（狀態機）← `main.js` / `share.js`（DOM）。

- `src/engine/**` 零 DOM 相依，必須能在 Node 裡跑。這是 `tools/balance-sim.js`（以及未來的 Kotlin 移植、server 端 seed 重放驗證排行榜）能成立的前提。**不要在 engine 裡碰 `document`、`localStorage`、`window`。**
- `src/main.js` 只認得 `{tone, title, html}` 卡片與 `pending.type`（`choice` / `train` / `alloc`），完全不知道遊戲規則。
- `src/share.js` 是另一個碰 DOM 的檔案：生涯結算的分享長圖（純 canvas 手繪）。
  它只吃一份 `state`（`buildShareCanvas(S)`），**不讀 `document` 以外的全域狀態**，
  所以 `share-preview.html` 可以餵假資料進去單獨看排版 —— 改排版一律在那頁上改，
  不要為了看一眼而真的打完一輪生涯。正式 `vite build` 只吃 `index.html`，預覽頁不會被包進去。
- 用 `hidden` 控制顯示的元素，若作者樣式給了 `display`（例如浮層的 `display:flex`），一定要補 `[hidden]{display:none}` —— 作者樣式優先度高過瀏覽器預設的 `[hidden]`，否則元素永遠關不掉。
- 任何「點開才看得到」的面板都要用 `position:fixed` 浮層。`main.js` 每張卡片都會呼叫 `scrollBottom()`，放在文件流裡的面板在長生涯中一定會被捲出畫面（能力細項就踩過這個坑）。
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
潛力上限固定在 `POT_MIN`–`POT_MAX`（50–90，體能保底 `POT_STA_MIN` 60）。**壓窄是刻意的** ——
散得太開的話出生就決定一切（實測 r 曾達 0.888）。

**軟上限而非硬牆**：突破天賦上限的成本很低，但 `OVER_CAP_PULL` 會讓超出的部分每年被拉回 18%。
「推得上去、守不住」才是設計，不要改回用天價成本擋 —— 那會讓玩家覺得 2、30 點才加 1 分。

能力分成 `PHYSICAL`（速度／體能／對抗）與其餘技術類：體能類 26 歲起成本 ×1.35。
**沒有能力是完全練不動的**（`isGrowable()` 恆真），唯一的年齡硬限制是
`canExceedCap()`：速度過了 `PAC_LOCK_AGE`（30）只能練回上限，不能再突破。

衰退走 `DECLINE` 表（小數累進，取年齡符合的最後一段），**25 歲就開始、每一項都會掉**，
只是 `phys`（體能類）與 `tech`（技術類）差一個量級（38 歲時 2.40 vs 0.75）。
掉幅再乘上體能修正（體能越好掉得越慢）與 35 歲後的年齡加成，而體能本身也在掉 ——
這個正回饋就是老將斷崖式衰退的來源。超出天賦上限的部分另外再被 `OVER_CAP_PULL` 拉回。

`STAGE_TRAIN` 是訓練環境表：足球學校體能 ×1.7／技術 ×0.8，高中校隊反過來 ×0.95／×1.5。
兩條路的綜合評價刻意調到幾乎相同（差別在風格與升學退路），改動時要用「固定位置、只換路徑」
的對照來驗 —— 位置本身的能力權重差異很容易被誤讀成環境效果。

`diceSpec` 還會依上季出場率與評分加減骰子，所以**出場率有兩層意義**：當季數據，以及下一季的成長。

季前不是直接加點，而是把每顆骰指派給訓練項目（`pending.type === 'train'`）。
門將的能力是 6 項（體能／撲救／制空／站位／長傳準確／短傳反應），與外場完全不重疊。
**外場與門將是兩張表**（`TRAINING` / `TRAINING_GK`，用 `trainingTable(group)` 取）——
門將的能力組完全不同，共用一張表會讓半數選項的權重指到他沒有的能力而白白蒸發。
新增或修改訓練時，一定要確認該表的每個權重都落在對應 `GROUP_ABIL` 裡。
每個項目餵養多個能力，**權重會先正規化**（除以該項目的權重總和）—— 不然餵越多能力的項目就越強，
玩家只會一直選同一項。`STAGE_TRAIN[stage].fixed` 是必修課表（足球學校＝體能＋戰術），
會自動吃掉前幾顆骰；自主加練的代價寫成 `s._extraRisk`（當季生效），
**不要改用 `p.injury.nextRisk`** —— 那個會跨季累積，年年加練會滾成 99% 必然受傷。

`SYNERGY` / `SYNERGY_GK` 是連帶成長表（環狀圖，每個能力剛好帶動兩個），實作在
`addAb(p, k, points, spill)` 裡。**門將的能力組與外場幾乎沒有交集，一定要走 `SYNERGY_GK`**，
否則整套對門將失效；而且門將 5 項能力全部計入 `ovr`，環比外場緊，比例要壓低（12% vs 20%），
不然門將會結構性強過所有外場位置。注意站位是門將專屬能力，外場沒有這一項。
帶動的點數一樣走蓄力槽，
而且**只帶到天賦上限為止**（突破天賦要靠專門訓練）。因為 spill 寫在 `addAb` 內，
UI 的暫存 draft 會自動跟引擎一致 —— 但 draft 一定要帶 `age` 與 `arch`，`abCost` 兩者都要讀。
連帶成長會一次動到多項，所以加點介面的「復原」存的是整份快照，不是單一能力。

### 能力量表是 FIFA 式 1–99（`MAX_ABIL`）

`docs/SPEC.md` 寫的 20–80 球探量表已經不適用了 —— 改成 FIFA 尺度是為了讓玩家對數字有直覺，
頂級球員的相關能力落在 90 上下。

體型（`BUILD`）在開局隨機抽，同時調整初始值與潛力上限，外場與門將吃不同的清單（`up`/`down` vs `gkUp`/`gkDown`）。

潛力有兩層：**天賦係數 `talent`**（每人一個，把所有潛力一起推）＋ **分項洗牌**（決定強項在哪，
用 `weightedOrder` 偏向該位置吃重的能力）。天賦係數是關鍵 —— 只靠分項洗牌的話，`ovr` 是加權平均，
一定會被那幾項平庸能力拖住，數學上永遠到不了 90。要調「有沒有機會出現 90 分球員」就是調這裡。

**能力尺度、`LV.par`、`callThreshold` 三者是綁在一起的**，任何讓整體能力上移的改動都要同步檢查：

| 忘了調 | 症狀 |
|---|---|
| `LV` 的 `par`/`min` | 聯賽門檻形同虛設，人人都能上五大 |
| `callThreshold`（`flow.js`） | 強國門檻高過玩家碰得到的 ovr → 法國人永遠選不上國家隊；或反過來人人都是國腳 |
| `accrueLoad` 的 explosive 除數 | 韌帶量表爆得特別快，重傷率飆到 90%+ |
| `sim.js` 吃 `d` 的係數（perf / rating / cs） | `d` 的散布跟著尺度放大，評分與數據一起通膨 |
| `CONF.abilScale` | 事件卡的 ±2 在寬尺度上變得無感 |

`ovr` 是**只算該位置權重內能力**的加權平均，所以「練了不計分的能力」是玩家最容易踩的坑。
`dpos` 要轉職業才登錄，在那之前一律走 `bestPos(p)`（該大類裡最適合這身能力的位置）——
**不要退回 `defaultPos`**，那會讓速度型前鋒在養成期被當成中鋒評價，畢業時直接被刷掉。
UI 端有對應的提示（雷達圖亮黃色的軸才計入綜合），改動權重表時記得一起檢查。

`ARCHETYPE` 是 18 歲時依能力分布長出來的，不是開局選的。選定後有四個效果：
`abCost` 主修 ×0.7／非主修 ×1.3、主修 `pot` +4、`sim.js` 的 `POS_OUTPUT` 乘上 `out`、
解鎖 `cond: isArch('key')` 的專屬事件卡。`ageBias: 'early'` 的原型 31 歲後產能斷崖。

### 事件卡

抽卡在 `flow.js:drawEvent`：先過 `for` 與 `cond`，再依 `weight` 加權抽樣，`once` 卡記在
`s.career.seenEvents`。效果表 `g`/`b` 裡能力代碼、`inj`、`rand`、`fanRep` 走同一條路徑
（`applyEffects`）；比這更複雜的副作用寫在 `fx(s, win, api)`，`api` 由 `fxApi()` 提供
（`fine` / `suspend` / `shiftRole` / `unlock` / `card`），**不要讓 data.js 直接碰 flow 的內部結構**。

有 `opts` 的卡是分岔型：不賭成功率，而是讓玩家在兩條路之間選。

事件卡的 `gpot` 會抬高天賦上限（不是能力值），這是傳奇球星指導與一般訓練的本質差異。
**抬上限時一定要連其餘能力一起小幅提升**：`ovr` 是 5–6 項的加權平均，只抬 1–2 項的話峰值只會差 1.7 分，玩家完全感覺不到。

新增負面特性時一定要同時給 `cure` 文案並在 `flow.js:cureTraits` 加上解除條件（`cureTraits` 會直接印 `cure`，漏寫就會顯示 undefined）——
每張負面卡都要有出路，否則玩家會覺得是被懲罰而不是被講了一個故事。

### 數值模型

一切繫於單一標量 `d = 位置加權能力 − 聯賽 par`（`sim.js:dValue`），推導出賽季數據、評分、薪資、獎項機率。足球版在此之上多一條獨立軸：

`squadGap = ovr − (聯賽 par + 球會 tier 加成 + 位置競爭)` → 陣中地位 → 出場率 → 乘進所有數據、負荷與續約。**「能力夠了也不一定有球踢」是與棒球版最大的差異，改動時不要把這條軸簡化掉。**

注意 `tier` 這個字在程式裡有兩個意思：`LV[x].tier` 是聯賽層級（1–7），`club.tier` / `TIER` 是球會等級（豪門～保級）。函式參數用 `clubTier` 區分。

平衡數值全部集中在 `data.js`（`LV` 聯賽階梯、`TIER` 球會等級、`SQUAD` 地位門檻、`POS_WEIGHT` / `POS_OUTPUT`、`DPOS` 位置門檻、`EVENTS`、`TRAITS`、`CONF`）。**調平衡改表，不改邏輯**；如果發現得改 `flow.js` 才調得動某個數字，通常代表那個數字該搬進 `data.js`。

**任何「只在變好時才出現、且沒有代價」的選項都是假選擇**，玩家一定會選它。位置轉型踩過這個坑（原本是純上位選擇），現在改成有成功率與失敗代價的賭注。新增決策點時要先問：不選它的人得到什麼？

隱藏特性一律透過 `unlock(s, ctx, key)` 解鎖（會自動去重並印卡）；觸發條件不對玩家顯示，計數放在 `s.career.counters`。

## 需要注意的事

- **`balance-sim.js` 的 bot 會影響量測結果本身**：它若只挑固定幾種訓練，能力分散的位置（中鋒吃五項）會被餓死，量出來的平衡是假的。bot 現在每指派一顆骰就依剩餘缺口重算。改動訓練表之後，記得先用「四個位置的峰值 ovr 是否收斂」驗證 bot，再看平衡數字。
- **平衡只調到一半**，實測見 README 表格。五大聯賽登陸率（8.8%）、重傷率（55%）與各國分布都在目標內，但「登上洲際頂級以上 ~97%」仍偏高，入手點是 `LV` 第 3–4 層的 `min`。改動時記得跑單國模式對表。
- **18 歲的水準由起始值決定，生涯峰值由後段成本決定，兩者可以分開調**。實測：下修起始值 5 點會讓 18 歲 ovr 掉 3 分，但峰值只動 0.3（生涯點數足夠爬到天花板）；下修潛力帶也幾乎不影響峰值（會被「突破潛力」那條路徑吸收）。要壓峰值就調 `GROWTH` 後三段的 `cost` 與突破潛力的成本。
- **要讓頂尖摸到 90，唯一有效的槓桿是 `abCost` 的天花板餘裕折扣**（離上限越遠越便宜）。直接加骰子會讓所有人一起變強、五大登陸率失控；加潛力則會被「突破潛力」那條路徑吸收。折扣讓有天賦的人爬得上去、沒天賦的人早早卡住，同一份點數預算就能拉開差距。
- **突破潛力上限的成本是天賦差距的守門員**。曾經因為太便宜（固定 ×2/×3），球員平均突破上限 8 分、P95 突破 22 分，把 P5=59～P95=95 的天賦分布壓成 12 分區間 —— 低天賦球員照樣爬到洲際頂級，這才是「洲際頂級 96%」的真正成因（不是級距太窄）。現在成本隨超出幅度加速。
- **`par` 是聯賽平均水準、`min` 是進入門檻，`min > par` 是刻意的**（外來補強本來就要高於平均）。`d = ovr − par` 驅動評分，`squadGap = ovr − (par + 球會加成 + 位置競爭)` 驅動出場率 —— 這兩個數字必須一起看：曾經因為 `par` 被推到能力分布頂端、加成又疊上去，導致「在荷甲豪門當核心需要 ovr 103」這種不可能的門檻。改任一邊都要用 `ovr 85 在各級各等級球會會是什麼地位` 這種表來驗算。
- 評分尺度 `6.05 + d * 0.085`：目前單季評分平均 6.92、P90 7.21。獎項門檻（最佳陣容 7.4、年度最佳 7.7、世界足球先生 8.0）是跟著這條線設的，動係數就要一起檢查獎項還拿不拿得到。
- `docs/develop.md` 是 M1 規格書（成長節奏、原型、事件庫），已實作完畢；裡面的「現況」數字是改版前的，別拿來對表。
- 養成階段共 6 年（國中 3 + 高中／足球學校 3），成長階段則由年齡決定（見上）。
- 球會名一律用**改編虛構名**（「泰晤士紅軍」「馬德里白衫」），聯賽用描述性名稱（「英格蘭超級聯賽」「歐洲跳板聯賽」）而非官方商標名，規避 FIFA/UEFA 與肖像權。國家用真實國名沒問題，但代表隊一律寫「◯◯代表隊」。新增資料時照做。
- 授權為 CC BY-NC 4.0，玩法架構致敬 yakyulife，改動時保留 NOTICE.md 的標示。
- `docs/SPEC.md` 是完整規格書（含尚未實作的 M1–M6：合約與解約金、租借買斷、位置轉型、感情線、洲際盃、分享長圖、PWA）。實作新系統前先看該章節，數值與命名多半已經定好了。
