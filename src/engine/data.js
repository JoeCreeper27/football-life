/**
 * 所有平衡數值集中在這個檔案。改平衡 = 改這裡，不動邏輯。
 * 國家、球會與聯賽名稱全部為改編虛構名，避免 IP 風險。
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

/* ==================================================================== */
/* 國家：決定起點聯賽、青訓水準、國家隊實力、有沒有大學足球這條路          */
/* ==================================================================== */

/**
 * dev  青訓水準（影響起始能力與潛力，−3 ~ +3）
 * natl 國家隊實力基準（決定徵召門檻與世界盃晉級率）
 * uni  是否有大學足球這條升學路線
 * home 該國國內聯賽：{ 聯賽層級: 聯賽 id }。沒有列出的層級代表必須旅外
 */
export const NATIONS = {
  TW: { n: '台灣',   region: 'ASIA', dev: -3, natl: 34, uni: true,
        home: { 1: 'TPFL' } },
  JP: { n: '日本',   region: 'ASIA', dev: 1,  natl: 62, uni: true,
        home: { 1: 'JFL', 2: 'J3', 3: 'J2', 4: 'J1' } },
  KR: { n: '韓國',   region: 'ASIA', dev: 1,  natl: 58, uni: true,
        home: { 1: 'K4', 2: 'K3', 3: 'K2', 4: 'K1' } },
  US: { n: '美國',   region: 'NAM',  dev: 1,  natl: 60, uni: true,
        home: { 1: 'USL2', 2: 'USL1', 3: 'USLC', 4: 'MLS' } },
  BR: { n: '巴西',   region: 'SAM',  dev: 3,  natl: 88, uni: false,
        home: { 1: 'SAM_D3', 2: 'BRA_C', 3: 'BRA_B', 4: 'BRA_A' } },
  AR: { n: '阿根廷', region: 'SAM',  dev: 3,  natl: 86, uni: false,
        home: { 1: 'SAM_D3', 2: 'ARG_B', 4: 'ARG_A' } },
  GB: { n: '英國',   region: 'EUR',  dev: 2,  natl: 80, uni: false,
        home: { 1: 'EUR_D5', 2: 'EUR_D4', 3: 'EUR_D3', 6: 'CHAMP', 7: 'ENG' } },
  ES: { n: '西班牙', region: 'EUR',  dev: 3,  natl: 86, uni: false,
        home: { 1: 'EUR_D5', 2: 'EUR_D4', 3: 'EUR_D3', 6: 'EU_D2', 7: 'ESP' } },
  DE: { n: '德國',   region: 'EUR',  dev: 3,  natl: 84, uni: false,
        home: { 1: 'EUR_D5', 2: 'EUR_D4', 3: 'EUR_D3', 6: 'EU_D2', 7: 'GER' } },
  IT: { n: '義大利', region: 'EUR',  dev: 2,  natl: 82, uni: false,
        home: { 1: 'EUR_D5', 2: 'EUR_D4', 3: 'EUR_D3', 6: 'EU_D2', 7: 'ITA' } },
  FR: { n: '法國',   region: 'EUR',  dev: 3,  natl: 85, uni: false,
        home: { 1: 'EUR_D5', 2: 'EUR_D4', 3: 'EUR_D3', 6: 'EU_D2', 7: 'FRA' } },
  PT: { n: '葡萄牙', region: 'EUR',  dev: 2,  natl: 78, uni: false,
        home: { 1: 'EUR_D5', 2: 'EUR_D4', 3: 'EUR_D3', 5: 'POR' } },
  NL: { n: '荷蘭',   region: 'EUR',  dev: 2,  natl: 76, uni: false,
        home: { 1: 'EUR_D5', 2: 'EUR_D4', 3: 'EUR_D3', 5: 'NED' } },
};

/** 開場選單順序 */
export const NATION_ORDER = ['TW', 'JP', 'KR', 'US', 'BR', 'AR', 'GB', 'ES', 'DE', 'IT', 'FR', 'PT', 'NL'];

export const REGION = { ASIA: '亞洲', EUR: '歐洲', SAM: '南美', NAM: '北美' };

/**
 * 出身：三條路各有明確的機制差異，不只是換皮
 *   ab        起始能力調整
 *   potTop    最高潛力項的天花板調整
 *   callAdj   國家隊徵召門檻調整（負數 = 更容易入選）
 *   windowAdj 旅外年齡窗口調整
 */
export const ORIGINS = {
  local:     { n: '純本地', d: '在地出生長大的本地族裔', fx: '國家隊徵召門檻 −3，在地認同高', ab: 0, potTop: 0, callAdj: -3, windowAdj: 0 },
  mixed:     { n: '混血',   d: '雙重血統，父母來自不同國家', fx: '最高潛力 +3；18 歲時可選擇代表哪一國', ab: 0, potTop: 3, callAdj: 0, windowAdj: 0 },
  immigrant: { n: '移民',   d: '移民／僑民家庭，在異鄉長大', fx: '起始能力 −2、15 歲前少一顆骰；旅外年齡窗口 +3', ab: -2, potTop: 0, callAdj: 2, windowAdj: 3 },
};

/* ==================================================================== */
/* 聯賽階梯：tier 1–7，同一層可以有多個地區的聯賽                          */
/* ==================================================================== */

/**
 * tier   升遷層級（1 最低，7 = 五大聯賽）
 * region 所在區域，決定旅外年齡窗口寬鬆與否
 * par    該層級的能力基準（單標量 d = 加權能力 − par 的支點）
 * min    進入門檻
 * top    傳奇評分分桶：BIG5 > EUR2 > TOP > HOME
 */
export const LV = {
  /* --- 養成階段（非職業） --- */
  JHS:     { n: '國中足球隊',       tier: 0, par: 18, min: 0, g: 12, amateur: true },
  HS:      { n: '高中校隊',         tier: 0, par: 26, min: 0, g: 18, amateur: true },
  ACADEMY: { n: '足球學校青訓梯隊', tier: 0, par: 32, min: 0, g: 24, amateur: true },
  UNI:     { n: '大學足球隊',       tier: 0, par: 34, min: 0, g: 20, amateur: true },

  /* --- T1 半職業／業餘頂點 --- */
  TPFL:   { n: '台灣企業足球聯賽', tier: 1, region: 'ASIA', par: 40, min: 34, g: 27, base: 60, coef: 20, top: 'HOME' },
  JFL:    { n: '日本足球聯賽',     tier: 1, region: 'ASIA', par: 40, min: 34, g: 30, base: 70, coef: 24, top: 'HOME' },
  K4:     { n: 'K4 聯賽',          tier: 1, region: 'ASIA', par: 40, min: 34, g: 28, base: 65, coef: 22, top: 'HOME' },
  USL2:   { n: '美國業餘聯賽',     tier: 1, region: 'NAM',  par: 40, min: 34, g: 24, base: 75, coef: 24, top: 'HOME' },
  EUR_D5: { n: '歐洲第五級聯賽',   tier: 1, region: 'EUR',  par: 40, min: 34, g: 34, base: 70, coef: 24, top: 'HOME' },
  SAM_D3: { n: '南美地區聯賽',     tier: 1, region: 'SAM',  par: 40, min: 34, g: 26, base: 50, coef: 18, top: 'HOME' },

  /* --- T2 低階職業 --- */
  J3:     { n: 'J3 聯賽',          tier: 2, region: 'ASIA', par: 45, min: 42, g: 38, base: 180, coef: 60 },
  K3:     { n: 'K3 聯賽',          tier: 2, region: 'ASIA', par: 45, min: 42, g: 32, base: 170, coef: 58 },
  USL1:   { n: '美國三級聯賽',     tier: 2, region: 'NAM',  par: 45, min: 42, g: 32, base: 200, coef: 65 },
  EUR_D4: { n: '歐洲第四級聯賽',   tier: 2, region: 'EUR',  par: 45, min: 42, g: 42, base: 190, coef: 62 },
  BRA_C:  { n: '巴西丙級聯賽',     tier: 2, region: 'SAM',  par: 45, min: 42, g: 30, base: 150, coef: 52 },
  ARG_B:  { n: '阿根廷乙級聯賽',   tier: 2, region: 'SAM',  par: 45, min: 42, g: 34, base: 150, coef: 52 },

  /* --- T3 次級職業 --- */
  J2:     { n: 'J2 聯賽',          tier: 3, region: 'ASIA', par: 50, min: 47, g: 42, base: 420, coef: 150 },
  K2:     { n: 'K2 聯賽',          tier: 3, region: 'ASIA', par: 50, min: 47, g: 36, base: 400, coef: 145 },
  USLC:   { n: '美職次級聯賽',     tier: 3, region: 'NAM',  par: 50, min: 47, g: 34, base: 470, coef: 160 },
  EUR_D3: { n: '歐洲第三級聯賽',   tier: 3, region: 'EUR',  par: 50, min: 47, g: 44, base: 450, coef: 155 },
  BRA_B:  { n: '巴西乙級聯賽',     tier: 3, region: 'SAM',  par: 50, min: 47, g: 38, base: 380, coef: 135 },

  /* --- T4 洲際頂級 --- */
  J1:     { n: 'J1 聯賽',              tier: 4, region: 'ASIA', par: 56, min: 53, g: 38, base: 1100, coef: 420, top: 'TOP' },
  K1:     { n: 'K1 聯賽',              tier: 4, region: 'ASIA', par: 56, min: 53, g: 38, base: 1000, coef: 400, top: 'TOP' },
  MLS:    { n: '美國職業足球大聯盟',   tier: 4, region: 'NAM',  par: 56, min: 53, g: 34, base: 1500, coef: 520, top: 'TOP' },
  BRA_A:  { n: '巴西甲級聯賽',         tier: 4, region: 'SAM',  par: 56, min: 53, g: 38, base: 900,  coef: 360, top: 'TOP' },
  ARG_A:  { n: '阿根廷甲級聯賽',       tier: 4, region: 'SAM',  par: 56, min: 53, g: 30, base: 800,  coef: 330, top: 'TOP' },

  /* --- T5 歐洲跳板 --- */
  POR:     { n: '葡萄牙超級聯賽',   tier: 5, region: 'EUR', par: 58, min: 55, g: 34, base: 1800, coef: 720, top: 'EUR2' },
  NED:     { n: '荷蘭甲級聯賽',     tier: 5, region: 'EUR', par: 58, min: 55, g: 34, base: 1900, coef: 760, top: 'EUR2' },
  EUR_SPR: { n: '歐洲跳板聯賽',     tier: 5, region: 'EUR', par: 58, min: 55, g: 34, base: 1600, coef: 700, top: 'EUR2' },

  /* --- T6 五大次級 --- */
  CHAMP: { n: '英式次級聯賽',   tier: 6, region: 'EUR', par: 60, min: 57, g: 46, base: 2600, coef: 900, top: 'EUR2' },
  EU_D2: { n: '歐陸次級聯賽',   tier: 6, region: 'EUR', par: 60, min: 57, g: 38, base: 2300, coef: 850, top: 'EUR2' },

  /* --- T7 五大聯賽 --- */
  ENG: { n: '英格蘭超級聯賽', tier: 7, region: 'EUR', par: 65, min: 62, g: 38, base: 4600, coef: 3200, top: 'BIG5' },
  ESP: { n: '西班牙甲級聯賽', tier: 7, region: 'EUR', par: 65, min: 62, g: 38, base: 4400, coef: 3100, top: 'BIG5' },
  GER: { n: '德國甲級聯賽',   tier: 7, region: 'EUR', par: 65, min: 62, g: 34, base: 4200, coef: 3000, top: 'BIG5' },
  ITA: { n: '義大利甲級聯賽', tier: 7, region: 'EUR', par: 65, min: 62, g: 38, base: 3900, coef: 2900, top: 'BIG5' },
  FRA: { n: '法國甲級聯賽',   tier: 7, region: 'EUR', par: 65, min: 62, g: 34, base: 3800, coef: 2800, top: 'BIG5' },
};

export const MAX_TIER = 7;

/** 某一層級的所有聯賽 id */
export function leaguesAt(tier) {
  return Object.keys(LV).filter(k => LV[k].tier === tier);
}

/* ---------------- 球會（全部為虛構改編名） ---------------- */

/** 養成階段的隊名依所在區域抽取 */
export const YOUTH_CLUBS = {
  JHS: {
    ASIA: ['海線國中', '中山國中', '仁義國中', '北港國中'],
    EUR:  ['磨坊鎮中學', '舊城區學園', '北岸文法學校', '灰岩村中學'],
    SAM:  ['紅土區學校', '港灣社區學校', '山谷市立中學'],
    NAM:  ['橡樹嶺中學', '湖畔初中', '大草原中學'],
  },
  HS: {
    ASIA: ['海線工商', '中山高中', '仁義高中', '北港高工', '花東體中'],
    EUR:  ['聖橡樹公學', '運河區高校', '鐵道城中學', '南丘學園'],
    SAM:  ['紅土技術學校', '海岸市立高中', '內陸農牧學校'],
    NAM:  ['橡樹嶺高中', '湖畔高中', '大草原高中', '海灣預校'],
  },
  ACADEMY: {
    ASIA: ['東方之星足球學院', '青嶺足球學校', '黑潮青訓中心'],
    EUR:  ['白鹿角青訓學院', '運河少年學院', '鐵砧山足球學校', '南岸青訓營'],
    SAM:  ['紅土少年學院', '河岸貧民區球場', '綠松青訓工廠'],
    NAM:  ['大湖區發展學院', '陽光帶青訓中心', '西岸足球學園'],
  },
  UNI: {
    ASIA: ['臨海大學', '中州科大', '國立體大', '南方大學'],
    EUR:  ['舊石橋大學', '北方理工學院'],
    SAM:  ['首都大學', '河岸聯邦大學'],
    NAM:  ['大湖州立大學', '橡樹嶺大學', '西岸理工學院'],
  },
};

export const CLUBS = {
  /* T1 */
  TPFL: [
    { n: '基隆港灣', t: 2 }, { n: '桃園航源', t: 1 }, { n: '台中未來', t: 2 },
    { n: '高雄陽光', t: 3 }, { n: '花蓮山海', t: 3 }, { n: '台北電神', t: 1 },
  ],
  JFL: [{ n: '武藏野藍鳶', t: 2 }, { n: '高崎赤城', t: 3 }, { n: '奈良鹿鳴', t: 3 }],
  K4: [{ n: '楊平溪谷', t: 3 }, { n: '金浦金雕', t: 2 }, { n: '江陵松濤', t: 3 }],
  USL2: [{ n: '德梅因玉米浪', t: 3 }, { n: '塔科馬霧笛', t: 2 }, { n: '沙漠仙人掌', t: 3 }],
  EUR_D5: [{ n: '磨坊鎮聯', t: 3 }, { n: '舊礦區競技', t: 2 }, { n: '灰岩村體育會', t: 3 }],
  SAM_D3: [{ n: '紅土河競技', t: 3 }, { n: '山谷礦工', t: 2 }, { n: '港區藍白', t: 3 }],

  /* T2 */
  J3: [{ n: '琉球太陽', t: 2 }, { n: '岩手北狼', t: 3 }, { n: '鳥取沙丘', t: 3 }],
  K3: [{ n: '慶州古都', t: 2 }, { n: '木浦海風', t: 3 }, { n: '春川昭陽', t: 3 }],
  USL1: [{ n: '查爾斯頓潮汐', t: 2 }, { n: '大湖鋼城', t: 3 }, { n: '落磯山雷鳥', t: 3 }],
  EUR_D4: [{ n: '北岸造船', t: 2 }, { n: '麥田聯', t: 3 }, { n: '鐵道工人隊', t: 3 }],
  BRA_C: [{ n: '亞馬遜綠鸚', t: 2 }, { n: '內陸紅牛', t: 3 }, { n: '海岸燈塔', t: 3 }],
  ARG_B: [{ n: '拉普拉塔白條', t: 2 }, { n: '探戈區鐵匠', t: 3 }, { n: '南風競技', t: 3 }],

  /* T3 */
  J2: [{ n: '長崎白鯨', t: 1 }, { n: '甲府武田', t: 2 }, { n: '水戶葵', t: 3 }],
  K2: [{ n: '釜山海雲', t: 1 }, { n: '安養綠焰', t: 2 }, { n: '忠南白馬', t: 3 }],
  USLC: [{ n: '鳳凰城烈日', t: 1 }, { n: '聖安東尼星堡', t: 2 }, { n: '印城十一人', t: 3 }],
  EUR_D3: [{ n: '石橋城競技', t: 2 }, { n: '黑森林獵人', t: 2 }, { n: '東港碼頭', t: 3 }],
  BRA_B: [{ n: '聖保羅高地', t: 1 }, { n: '米納斯黑鑽', t: 2 }, { n: '巴伊亞浪花', t: 3 }],

  /* T4 */
  J1: [{ n: '橫濱潮聲', t: 1 }, { n: '大阪緋櫻', t: 1 }, { n: '廣島紫火', t: 2 }, { n: '仙台七夕', t: 3 }],
  K1: [{ n: '全州綠盾', t: 1 }, { n: '蔚山藍鯨', t: 1 }, { n: '水原青龍', t: 2 }, { n: '大邱天空', t: 3 }],
  MLS: [{ n: '洛城銀河星', t: 1 }, { n: '西雅圖翡翠', t: 1 }, { n: '邁阿密粉紅鶴', t: 2 }, { n: '亞特蘭大五芒星', t: 3 }],
  BRA_A: [{ n: '里約黑白旗', t: 1 }, { n: '聖保羅紅黑', t: 1 }, { n: '米納斯藍十字', t: 2 }, { n: '巴拉那綠松', t: 3 }],
  ARG_A: [{ n: '布宜諾紅藍', t: 1 }, { n: '河岸白紅', t: 1 }, { n: '科爾多瓦鋼鐵', t: 2 }, { n: '探戈紫羅蘭', t: 3 }],

  /* T5 */
  POR: [{ n: '里斯本海鷹', t: 1 }, { n: '波爾圖藍龍', t: 1 }, { n: '米尼奧紅十字', t: 2 }, { n: '大西洋群島隊', t: 3 }],
  NED: [{ n: '阿姆斯特丹銀鬱金香', t: 1 }, { n: '埃因霍紅白光', t: 1 }, { n: '鹿特丹港務', t: 2 }, { n: '北方農業區隊', t: 3 }],
  EUR_SPR: [{ n: '布魯日藍運河', t: 1 }, { n: '維也納金鷹', t: 2 }, { n: '哥本哈根北獅', t: 2 }, { n: '蘇黎世湖畔', t: 3 }],

  /* T6 */
  CHAMP: [{ n: '默西河鋼鐵', t: 2 }, { n: '南岸海鷗', t: 2 }, { n: '約克白玫瑰', t: 3 }, { n: '中部工廠隊', t: 3 }],
  EU_D2: [{ n: '魯爾區礦燈', t: 2 }, { n: '加泰海風', t: 2 }, { n: '亞平寧山城', t: 3 }, { n: '隆河谷紫衫', t: 3 }],

  /* T7 */
  ENG: [
    { n: '泰晤士紅軍', t: 1 }, { n: '曼徹斯特雨城', t: 1 }, { n: '倫敦北砲', t: 2 },
    { n: '默西河藍調', t: 2 }, { n: '南岸櫻桃紅', t: 3 },
  ],
  ESP: [
    { n: '馬德里白衫', t: 1 }, { n: '加泰隆尼亞紅藍', t: 1 }, { n: '巴斯克雄獅', t: 2 },
    { n: '安達魯西亞紅白', t: 3 },
  ],
  GER: [
    { n: '巴伐利亞南星', t: 1 }, { n: '魯爾黃黑牆', t: 1 }, { n: '萊比錫紅牛角', t: 2 },
    { n: '威悉河綠狼', t: 3 },
  ],
  ITA: [
    { n: '亞平寧黑白軍', t: 1 }, { n: '米蘭藍黑星', t: 1 }, { n: '羅馬狼徽', t: 2 },
    { n: '那不勒斯藍天', t: 2 }, { n: '亞得里亞紫百合', t: 3 },
  ],
  FRA: [
    { n: '塞納河王子', t: 1 }, { n: '馬賽藍白浪', t: 2 }, { n: '里昂金獅', t: 2 },
    { n: '布列塔尼紅隊', t: 3 },
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
/** for: '*' 全體 / 'GK' / 'OUT' 外場 / 'PRO' 職業階段 / 'ABROAD' 旅外中 */
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
  { n: '語言與新環境', for: 'ABROAD', gt: '你開始用當地語言在場上喊人', bt: '聽不懂戰術會議，訓練賽站錯位', g: { vis: 2, sta: 1 }, b: { vis: -2, sta: -1 } },
  { n: '思鄉', for: 'ABROAD', gt: '把想家的力氣全放到球場上', bt: '整季心不在焉', g: { rand: 2 }, b: { rand: -2, inj: 4 } },
  { n: '當地媒體的檢視', for: 'ABROAD', gt: '一場好球讓報紙改口叫你自己人', bt: '被寫成「便宜的外籍球員」', g: { fin: 1, dri: 1 }, b: { rand: -2 } },
];

/* ---------------- 隱藏特性 ---------------- */
export const TRAITS = {
  golden:   { n: '金童',       tone: 'gold', fx: '訓練骰永久 4 點起、事件卡好結果機率 70%' },
  iron:     { n: '鐵人',       tone: 'gold', fx: '受傷機率上限 10%' },
  bigmatch: { n: '大場面先生', tone: 'gold', fx: '洲際賽事表現加成，冠軍機率 ×1.25' },
  oneclub:  { n: '一人一隊',   tone: 'gold', fx: '母隊續約係數 ≥×1.25、引退評價 +250' },
  captain:  { n: '隊長袖標',   tone: 'gold', fx: '陣中地位判定 +1 檔，更衣室事件免疫' },
  pioneer:  { n: '越洋拓荒者', tone: 'gold', fx: '你的國家史上第一個踢五大聯賽的人' },
  tempo:    { n: '節奏大師',   tone: 'gold', fx: '31 歲後 vis/pas 不受衰退影響' },
  national: { n: '國家隊之魂', tone: 'gold', fx: '國際賽不增加受傷風險、每次徵召保底 +2 點' },
  knee:     { n: '鋼鐵膝蓋',   tone: 'gold', fx: '韌帶量表上限翻倍、硬撐成功率 85%' },
  grinder:  { n: '努力仔',     tone: 'gold', fx: '天賦平庸卻站上了頂級舞台' },
  academy:  { n: '學院派',     tone: 'gold', fx: '足球學校出身，一路踢進洲際頂級以上' },
  adapt:    { n: '適應者',     tone: 'gold', fx: '移民出身，在異國聯賽站穩主力' },
  naturalized: { n: '歸化之路', tone: 'gold', fx: '選擇代表另一個國家出賽' },
  glass:    { n: '玻璃人',     tone: 'bad',  fx: '受傷機率下限 40%' },
  benched:  { n: '板凳生涯',   tone: 'bad',  fx: '能力成長停滯，季初擲骰 −1 顆' },
  cancer:   { n: '更衣室毒瘤', tone: 'bad',  fx: '轉會機率大增、續約條件惡化' },
  socialko: { n: '社群災難',   tone: 'bad',  fx: '事件卡失敗率永久 +10%' },
  onetool:  { n: '只會這個',   tone: 'bad',  fx: '出場時間銳減，定位為功能型輪替' },
};

/* ---------------- 其他常數 ---------------- */
export const CONF = {
  startAge: 12,
  startYear: 2026,
  retireAge: 42,
  declineAge: 31,
  baseInjury: 11,
  eventCards: 3,
  aclCap: 50,
  jhsYears: 3,
  hsYears: 3,
  uniYears: 4,
};
