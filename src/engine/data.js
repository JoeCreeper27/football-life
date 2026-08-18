/**
 * 所有平衡數值集中在這個檔案。改平衡 = 改這裡，不動邏輯。
 * 球會與聯賽名稱全部為改編虛構名，避免 IP 風險。
 */

/* ---------------- 能力 ---------------- */
export const ABIL = {
  sta: '體能', fin: '射門', pas: '傳球', dri: '盤帶', pac: '速度',
  phy: '對抗', def: '防守', hea: '頭球', vis: '視野',
  ref: '撲救', aer: '制空', pos: '站位', dis: '腳下傳球',
};

export const POS_GROUP = { GK: '門將', DF: '後衛', MF: '中場', FW: '前鋒' };

/** 各大類可養成的能力 */
export const GROUP_ABIL = {
  GK: ['sta', 'ref', 'aer', 'pos', 'dis'],
  DF: ['sta', 'def', 'hea', 'phy', 'pac', 'pas', 'vis', 'dri', 'fin'],
  MF: ['sta', 'pas', 'vis', 'dri', 'def', 'phy', 'pac', 'fin', 'hea'],
  FW: ['sta', 'fin', 'pac', 'dri', 'phy', 'hea', 'pas', 'vis', 'def'],
};

/* ---------------- 細分位置 ---------------- */
export const DPOS = {
  GK: { n: '門將', sal: 0.92, group: 'GK' },
  CB: { n: '中衛', sal: 0.98, group: 'DF', req: { def: 4, hea: 3, phy: 3, pac: -4 } },
  FB: { n: '邊後衛', sal: 1.00, group: 'DF', req: { sta: 4, pac: 3, def: 0 } },
  DM: { n: '後腰', sal: 1.02, group: 'MF', req: { def: 3, phy: 2, pas: -2 } },
  CM: { n: '中場', sal: 1.05, group: 'MF', req: { pas: 2, vis: 2, sta: 2 } },
  AM: { n: '前腰', sal: 1.15, group: 'MF', req: { vis: 4, pas: 3, dri: 2 } },
  W:  { n: '邊鋒', sal: 1.15, group: 'FW', req: { pac: 4, dri: 3 } },
  ST: { n: '中鋒', sal: 1.20, group: 'FW', req: { fin: 4, phy: 0, hea: 1 } },
};

/** 每個位置的能力權重，決定同一組能力對不同位置的意義 */
export const POS_WEIGHT = {
  GK: { ref: .40, pos: .25, aer: .20, dis: .10, sta: .05 },
  CB: { def: .34, hea: .22, phy: .20, pac: .12, pas: .07, sta: .05 },
  FB: { pac: .24, sta: .22, def: .22, pas: .16, dri: .11, phy: .05 },
  DM: { def: .30, pas: .22, phy: .18, vis: .16, sta: .14 },
  CM: { pas: .28, vis: .24, sta: .18, dri: .14, def: .10, phy: .06 },
  AM: { vis: .28, pas: .24, dri: .22, fin: .18, pac: .08 },
  W:  { pac: .28, dri: .28, fin: .18, pas: .14, sta: .12 },
  ST: { fin: .38, pac: .18, phy: .16, hea: .14, dri: .14 },
};

/** 位置的產能基準（每 38 場的期望值，會再乘 d 與出場率） */
export const POS_OUTPUT = {
  GK: { g: 0.0, a: 0.2, cs: 9 },
  CB: { g: 2.0, a: 1.0, cs: 9 },
  FB: { g: 1.5, a: 4.0, cs: 8 },
  DM: { g: 1.5, a: 2.5, cs: 0 },
  CM: { g: 4.0, a: 5.0, cs: 0 },
  AM: { g: 8.0, a: 9.0, cs: 0 },
  W:  { g: 9.0, a: 8.0, cs: 0 },
  ST: { g: 15.0, a: 4.0, cs: 0 },
};

/* ---------------- 聯賽階梯 ---------------- */
export const LV = {
  HS:    { n: '全國高中足球聯賽', par: 26, min: 0,  g: 18, amateur: true },
  UNI:   { n: '大專公開一級',     par: 32, min: 0,  g: 20, amateur: true },
  TPFL:  { n: '台灣企業足球聯賽', par: 40, min: 34, g: 27, base: 60,   coef: 20,   top: 'TPFL' },
  J3:    { n: 'J3 聯賽',          par: 45, min: 42, g: 38, base: 180,  coef: 60 },
  J2:    { n: 'J2 聯賽',          par: 50, min: 47, g: 42, base: 420,  coef: 150 },
  J1:    { n: 'J1 聯賽',          par: 56, min: 53, g: 38, base: 1100, coef: 420,  top: 'ASIA' },
  EUR2:  { n: '歐洲跳板聯賽',     par: 58, min: 55, g: 34, base: 1600, coef: 700,  top: 'EUR2' },
  CHAMP: { n: '英式次級聯賽',     par: 60, min: 57, g: 46, base: 2600, coef: 900,  top: 'EUR2' },
  BIG5:  { n: '五大聯賽',         par: 65, min: 62, g: 38, base: 4000, coef: 3000, top: 'BIG5' },
};

/** 升遷路線：從哪一級可以往哪裡走 */
export const LADDER = ['TPFL', 'J3', 'J2', 'J1', 'EUR2', 'CHAMP', 'BIG5'];

/* ---------------- 球會（虛構名） ---------------- */
export const CLUBS = {
  HS: ['海線工商', '中山高中', '仁義高中', '北港高工', '花東體中'],
  UNI: ['臨海大學', '中州科大', '國立體大', '南方大學'],
  TPFL: [
    { n: '基隆港灣', t: 2 }, { n: '桃園航源', t: 1 }, { n: '台中未來', t: 2 },
    { n: '高雄陽光', t: 3 }, { n: '花蓮山海', t: 3 }, { n: '台北電神', t: 1 },
  ],
  J3: [{ n: '琉球太陽', t: 2 }, { n: '岩手北狼', t: 3 }, { n: '鳥取沙丘', t: 3 }],
  J2: [{ n: '長崎白鯨', t: 1 }, { n: '甲府武田', t: 2 }, { n: '水戶葵', t: 3 }],
  J1: [{ n: '橫濱潮聲', t: 1 }, { n: '大阪緋櫻', t: 1 }, { n: '仙台七夕', t: 3 }, { n: '廣島紫火', t: 2 }],
  EUR2: [{ n: '里斯本海鷹', t: 1 }, { n: '布魯日藍運河', t: 2 }, { n: '阿姆斯特丹銀鬱金香', t: 1 }, { n: '哥本哈根北獅', t: 3 }],
  CHAMP: [{ n: '默西河鋼鐵', t: 2 }, { n: '約克白玫瑰', t: 3 }, { n: '南岸海鷗', t: 2 }],
  BIG5: [
    { n: '泰晤士紅軍', t: 1 }, { n: '馬德里白衫', t: 1 }, { n: '巴伐利亞南星', t: 1 },
    { n: '亞平寧黑白軍', t: 2 }, { n: '塞納河王子', t: 1 }, { n: '威悉河綠狼', t: 3 },
    { n: '安達魯西亞紅白', t: 3 }, { n: '默西河藍調', t: 2 },
  ],
};

/** 球會等級：對陣中門檻的加成、冠軍率、薪資係數 */
export const TIER = {
  1: { n: '豪門',       bonus: 6, champ: 34, sal: 1.6 },
  2: { n: '爭冠／歐戰', bonus: 3, champ: 14, sal: 1.2 },
  3: { n: '中游',       bonus: 0, champ: 4,  sal: 1.0 },
  4: { n: '保級',       bonus: -3, champ: 1, sal: 0.8 },
};

/* ---------------- 陣中地位 ---------------- */
export const SQUAD = [
  { k: 'KEY',      n: '絕對核心', gap: 5,   minLo: .88, minHi: .95 },
  { k: 'STARTER',  n: '主力',     gap: 2,   minLo: .74, minHi: .88 },
  { k: 'ROTATION', n: '輪替',     gap: -1,  minLo: .44, minHi: .70 },
  { k: 'BENCH',    n: '替補',     gap: -4,  minLo: .16, minHi: .40 },
  { k: 'STAND',    n: '看台席',   gap: -99, minLo: .00, minHi: .10 },
];

/* ---------------- 事件卡 ---------------- */
/** for: '*' 全體 / 'GK' / 'OUT' 外場 / 'PRO' 職業階段 */
export const EVENTS = [
  { n: '加練定位球', for: 'OUT', gt: '弧線繞過人牆，門將動都沒動', bt: '越練越沒手感，教練搖頭', g: { fin: 2 }, b: { fin: -2 } },
  { n: '健身房增肌', for: '*', gt: '對抗中站得住了', bt: '練過頭，身體變笨重', g: { phy: 2 }, b: { pac: -1, sta: -1 } },
  { n: '衝刺訓練', for: 'OUT', gt: '30 公尺測速跑出生涯最佳', bt: '大腿後側拉傷', g: { pac: 2 }, b: { pac: -1, inj: 10 } },
  { n: '一對一防守課', for: 'OUT', gt: '搶球時機抓得剛剛好', bt: '老是被過，信心受挫', g: { def: 2 }, b: { def: -2 } },
  { n: '影像分析會議', for: '*', gt: '看穿了對手的跑位習慣', bt: '想太多，場上反而慢半拍', g: { vis: 2, pos: 2 }, b: { vis: -2 } },
  { n: '傳球節奏訓練', for: 'OUT', gt: '出球速度快了半拍', bt: '傳球失誤率上升', g: { pas: 2 }, b: { pas: -2 } },
  { n: '一對一過人課', for: 'OUT', gt: '假動作騙倒了整條防線', bt: '太貪帶球，被隊友抱怨', g: { dri: 2 }, b: { dri: -2 } },
  { n: '角球攻防加練', for: '*', gt: '搶到第一點的能力變強了', bt: '空中對抗吃了幾次虧', g: { hea: 2 }, b: { hea: -2 } },
  { n: '撲救反應訓練', for: 'GK', gt: '近距離反應快得嚇人', bt: '重心亂了，撲救變慢', g: { ref: 2 }, b: { ref: -2 } },
  { n: '出擊時機判斷', for: 'GK', gt: '出擊時機抓得精準', bt: '幾次貿然出擊被吊門', g: { aer: 2 }, b: { pos: -2 } },
  { n: '門將腳下訓練', for: 'GK', gt: '長傳直接找到前鋒', bt: '禁區內出球被斷，丟了球', g: { dis: 2 }, b: { dis: -2 } },
  { n: '教練戰術改造', for: '*', gt: '新體系裡你變成關鍵齒輪', bt: '完全不適應新的要求', g: { rand: 2 }, b: { rand: -2 } },
  { n: '記者會失言', for: 'PRO', gt: '幽默化解了尖銳提問', bt: '一句話上了頭版，更衣室氣氛僵了', g: { sta: 1 }, b: { rand: -2, sta: -1 } },
  { n: '社群媒體風波', for: 'PRO', gt: '一則貼文圈粉無數', bt: '舊貼文被翻出來炎上', g: { sta: 1 }, b: { rand: -2 } },
  { n: '更衣室內鬨', for: 'PRO', gt: '你出面把話講開了', bt: '被貼上刺頭標籤', g: { vis: 1, sta: 1 }, b: { rand: -2 } },
  { n: '青訓小將挑戰你的位置', for: 'PRO', gt: '你用表現讓他坐回板凳', bt: '訓練賽被完全壓制', g: { rand: 2 }, b: { rand: -2 } },
  { n: '飲食與睡眠管理', for: '*', gt: '體脂下降，回復速度變快', bt: '作息亂掉，整季昏昏沉沉', g: { sta: 2 }, b: { sta: -2, inj: 4 } },
  { n: '客場長征與時差', for: 'PRO', gt: '調整得宜，落地就進入狀況', bt: '整整兩週沒睡好', g: { sta: 1 }, b: { sta: -2, inj: 5 } },
  { n: '老將的一句話', for: '*', gt: '一句話點醒夢中人', bt: '學了不適合自己的東西', g: { rand: 2 }, b: { rand: -2 } },
  { n: '季中低潮', for: '*', gt: '靠自我調整走了出來', bt: '低潮拖了一個月', g: { vis: 1, sta: 1 }, b: { fin: -2, sta: -1 } },
];

/* ---------------- 隱藏特性 ---------------- */
export const TRAITS = {
  golden:   { n: '金童',       tone: 'gold', fx: '訓練骰永久 4 點起、事件卡好結果機率 70%' },
  iron:     { n: '鐵人',       tone: 'gold', fx: '受傷機率上限 10%' },
  bigmatch: { n: '大場面先生', tone: 'gold', fx: '洲際賽事表現加成，冠軍機率 ×1.25' },
  oneclub:  { n: '一人一隊',   tone: 'gold', fx: '母隊續約係數 ≥×1.25、引退評價 +250' },
  captain:  { n: '隊長袖標',   tone: 'gold', fx: '陣中地位判定 +1 檔，更衣室事件免疫' },
  pioneer:  { n: '越洋拓荒者', tone: 'gold', fx: '首位登陸五大聯賽的台灣球員' },
  tempo:    { n: '節奏大師',   tone: 'gold', fx: '31 歲後 vis/pas 不受衰退影響' },
  national: { n: '國家隊之魂', tone: 'gold', fx: '國際賽不增加受傷風險、每次徵召保底 +2 點' },
  knee:     { n: '鋼鐵膝蓋',   tone: 'gold', fx: '韌帶量表上限翻倍、硬撐成功率 85%' },
  grinder:  { n: '努力仔',     tone: 'gold', fx: '天賦平庸卻站上了頂級舞台' },
  glass:    { n: '玻璃人',     tone: 'bad',  fx: '受傷機率下限 40%' },
  benched:  { n: '板凳生涯',   tone: 'bad',  fx: '能力成長停滯，季初擲骰 −1 顆' },
  cancer:   { n: '更衣室毒瘤', tone: 'bad',  fx: '轉會機率大增、續約條件惡化' },
  socialko: { n: '社群災難',   tone: 'bad',  fx: '事件卡失敗率永久 +10%' },
  onetool:  { n: '只會這個',   tone: 'bad',  fx: '出場時間銳減，定位為功能型輪替' },
};

/* ---------------- 其他常數 ---------------- */
export const CONF = {
  startAge: 15,
  startYear: 2026,
  retireAge: 42,
  declineAge: 31,
  baseInjury: 11,
  eventCards: 3,
  aclCap: 50,
};
