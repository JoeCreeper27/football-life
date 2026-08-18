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
  CB: { n: '中衛', sal: 0.98, group: 'DF', req: { def: 5, hea: 4, phy: 4, pac: -5 } },
  FB: { n: '邊後衛', sal: 1.00, group: 'DF', req: { sta: 5, pac: 4, def: 0 } },
  DM: { n: '後腰', sal: 1.02, group: 'MF', req: { def: 4, phy: 3, pas: -3 } },
  CM: { n: '中場', sal: 1.05, group: 'MF', req: { pas: 3, vis: 3, sta: 3 } },
  AM: { n: '前腰', sal: 1.15, group: 'MF', req: { vis: 5, pas: 4, dri: 3 } },
  W:  { n: '邊鋒', sal: 1.15, group: 'FW', req: { pac: 5, dri: 4 } },
  ST: { n: '中鋒', sal: 1.20, group: 'FW', req: { fin: 5, phy: 0, hea: 1 } },
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
  TW: { n: '台灣',   region: 'ASIA', dev: -3, natl: 34, uni: true, service: true,
        home: { 1: 'TPFL' } },
  JP: { n: '日本',   region: 'ASIA', dev: 1,  natl: 62, uni: true,
        home: { 1: 'JFL', 2: 'J3', 3: 'J2', 4: 'J1' } },
  KR: { n: '韓國',   region: 'ASIA', dev: 1,  natl: 58, uni: true, service: true,
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
  JHS:     { n: '國中足球隊',       tier: 0, par: 34, min: 0, g: 12, amateur: true },
  HS:      { n: '高中校隊',         tier: 0, par: 44, min: 0, g: 18, amateur: true },
  ACADEMY: { n: '足球學校青訓梯隊', tier: 0, par: 50, min: 0, g: 24, amateur: true },
  UNI:     { n: '大學足球隊',       tier: 0, par: 52, min: 0, g: 20, amateur: true },

  /* --- T1 半職業／業餘頂點 --- */
  TPFL:   { n: '台灣企業足球聯賽', tier: 1, region: 'ASIA', par: 55, min: 50, g: 27, base: 60, coef: 20, top: 'HOME' },
  JFL:    { n: '日本足球聯賽',     tier: 1, region: 'ASIA', par: 55, min: 50, g: 30, base: 70, coef: 24, top: 'HOME' },
  K4:     { n: 'K4 聯賽',          tier: 1, region: 'ASIA', par: 55, min: 50, g: 28, base: 65, coef: 22, top: 'HOME' },
  USL2:   { n: '美國業餘聯賽',     tier: 1, region: 'NAM',  par: 55, min: 50, g: 24, base: 75, coef: 24, top: 'HOME' },
  EUR_D5: { n: '歐洲第五級聯賽',   tier: 1, region: 'EUR',  par: 55, min: 50, g: 34, base: 70, coef: 24, top: 'HOME' },
  SAM_D3: { n: '南美地區聯賽',     tier: 1, region: 'SAM',  par: 55, min: 50, g: 26, base: 50, coef: 18, top: 'HOME' },

  /* --- T2 低階職業 --- */
  J3:     { n: 'J3 聯賽',          tier: 2, region: 'ASIA', par: 61, min: 63, g: 38, base: 180, coef: 60 },
  K3:     { n: 'K3 聯賽',          tier: 2, region: 'ASIA', par: 61, min: 63, g: 32, base: 170, coef: 58 },
  USL1:   { n: '美國三級聯賽',     tier: 2, region: 'NAM',  par: 61, min: 63, g: 32, base: 200, coef: 65 },
  EUR_D4: { n: '歐洲第四級聯賽',   tier: 2, region: 'EUR',  par: 61, min: 63, g: 42, base: 190, coef: 62 },
  BRA_C:  { n: '巴西丙級聯賽',     tier: 2, region: 'SAM',  par: 61, min: 63, g: 30, base: 150, coef: 52 },
  ARG_B:  { n: '阿根廷乙級聯賽',   tier: 2, region: 'SAM',  par: 61, min: 63, g: 34, base: 150, coef: 52 },

  /* --- T3 次級職業 --- */
  J2:     { n: 'J2 聯賽',          tier: 3, region: 'ASIA', par: 66, min: 69, g: 42, base: 420, coef: 150 },
  K2:     { n: 'K2 聯賽',          tier: 3, region: 'ASIA', par: 66, min: 69, g: 36, base: 400, coef: 145 },
  USLC:   { n: '美職次級聯賽',     tier: 3, region: 'NAM',  par: 66, min: 69, g: 34, base: 470, coef: 160 },
  EUR_D3: { n: '歐洲第三級聯賽',   tier: 3, region: 'EUR',  par: 66, min: 69, g: 44, base: 450, coef: 155 },
  BRA_B:  { n: '巴西乙級聯賽',     tier: 3, region: 'SAM',  par: 66, min: 69, g: 38, base: 380, coef: 135 },

  /* --- T4 洲際頂級 --- */
  J1:     { n: 'J1 聯賽',              tier: 4, region: 'ASIA', par: 71, min: 77, g: 38, base: 1100, coef: 420, top: 'TOP' },
  K1:     { n: 'K1 聯賽',              tier: 4, region: 'ASIA', par: 71, min: 77, g: 38, base: 1000, coef: 400, top: 'TOP' },
  MLS:    { n: '美國職業足球大聯盟',   tier: 4, region: 'NAM',  par: 71, min: 77, g: 34, base: 1500, coef: 520, top: 'TOP' },
  BRA_A:  { n: '巴西甲級聯賽',         tier: 4, region: 'SAM',  par: 71, min: 77, g: 38, base: 900,  coef: 360, top: 'TOP' },
  ARG_A:  { n: '阿根廷甲級聯賽',       tier: 4, region: 'SAM',  par: 71, min: 77, g: 30, base: 800,  coef: 330, top: 'TOP' },

  /* --- T5 歐洲跳板 --- */
  POR:     { n: '葡萄牙超級聯賽',   tier: 5, region: 'EUR', par: 75, min: 82, g: 34, base: 1800, coef: 720, top: 'EUR2' },
  NED:     { n: '荷蘭甲級聯賽',     tier: 5, region: 'EUR', par: 75, min: 82, g: 34, base: 1900, coef: 760, top: 'EUR2' },
  EUR_SPR: { n: '歐洲跳板聯賽',     tier: 5, region: 'EUR', par: 75, min: 82, g: 34, base: 1600, coef: 700, top: 'EUR2' },

  /* --- T6 五大次級 --- */
  CHAMP: { n: '英式次級聯賽',   tier: 6, region: 'EUR', par: 77, min: 85, g: 46, base: 2600, coef: 900, top: 'EUR2' },
  EU_D2: { n: '歐陸次級聯賽',   tier: 6, region: 'EUR', par: 77, min: 85, g: 38, base: 2300, coef: 850, top: 'EUR2' },

  /* --- T7 五大聯賽 --- */
  ENG: { n: '英格蘭超級聯賽', tier: 7, region: 'EUR', par: 80, min: 89, g: 38, base: 4600, coef: 3200, top: 'BIG5' },
  ESP: { n: '西班牙甲級聯賽', tier: 7, region: 'EUR', par: 80, min: 89, g: 38, base: 4400, coef: 3100, top: 'BIG5' },
  GER: { n: '德國甲級聯賽',   tier: 7, region: 'EUR', par: 80, min: 89, g: 34, base: 4200, coef: 3000, top: 'BIG5' },
  ITA: { n: '義大利甲級聯賽', tier: 7, region: 'EUR', par: 80, min: 89, g: 38, base: 3900, coef: 2900, top: 'BIG5' },
  FRA: { n: '法國甲級聯賽',   tier: 7, region: 'EUR', par: 80, min: 89, g: 34, base: 3800, coef: 2800, top: 'BIG5' },
};

export const MAX_TIER = 7;

/** 能力上限：FIFA 式 1–99 量表（頂級球員相關能力約 90） */
export const MAX_ABIL = 99;

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
    { n: '高雄陽光', t: 3 }, { n: '花蓮山海', t: 3 }, { n: '台北電神', t: 1 }, { n: '中山U31', t: 3 },
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
  1: { n: '豪門',       bonus: 5, champ: 34, sal: 1.6 },
  2: { n: '爭冠／歐戰', bonus: 3, champ: 14, sal: 1.2 },
  3: { n: '中游',       bonus: 0, champ: 4,  sal: 1.0 },
  4: { n: '保級',       bonus: -3, champ: 1, sal: 0.8 },
};

/* ---------------- 陣中地位 ---------------- */
export const SQUAD = [
  { k: 'KEY',      n: '絕對核心', gap: 6,   minLo: .88, minHi: .95 },
  { k: 'STARTER',  n: '主力',     gap: 3,   minLo: .74, minHi: .88 },
  { k: 'ROTATION', n: '輪替',     gap: -1,  minLo: .44, minHi: .70 },
  { k: 'BENCH',    n: '替補',     gap: -5,  minLo: .16, minHi: .40 },
  { k: 'STAND',    n: '看台席',   gap: -99, minLo: .00, minHi: .10 },
];

/** 地位高低比較用（數字越大越好），事件卡的 cond 常常要判斷「地位 ≤ 替補」 */
export const ROLE_RANK = { KEY: 4, STARTER: 3, ROTATION: 2, BENCH: 1, STAND: 0 };

/* ==================================================================== */
/* 成長四階段：總點數控制住，但重壓在 24 歲前                              */
/* ==================================================================== */

/**
 * 每個階段的骰數、骰面區間與成本倍率。
 * 潛力期骰面開到 8，是為了製造「這顆 8 要灌哪」的取捨；
 * 巔峰期之後幾乎練不動，玩家的注意力自然轉向數據、榮譽與轉會。
 */
export const GROWTH = [
  { until: 18, n: 3, lo: 3, hi: 11, cost: 1.0, n2: '潛力期' },
  { until: 25, n: 3, lo: 2, hi: 8,  cost: 1.0, n2: '成長期' },
  { until: 31, n: 2, lo: 1, hi: 6,  cost: 1.4, n2: '巔峰期' },
  { until: 99, n: 1, lo: 1, hi: 5,  cost: 1.9, n2: '維持期' },
];

export const growthPhase = age => GROWTH.find(g => age <= g.until);

/**
 * 體能類能力：25 歲之後成本加倍（練得動但很吃力），33 歲之後完全練不動。
 * 其餘（傳球、視野、站位、射門、頭球、盤帶、防守……）一輩子都還能練 ——
 * 這就是為什麼技術型中場四十歲還能先發，而速度型邊鋒三十出頭就得轉型。
 */
export const PHYSICAL = ['pac', 'sta', 'phy'];
export const PHYSICAL_HARD_AGE = 26;   // 起，成本 ×2
export const PHYSICAL_LOCK_AGE = 33;   // 起，練不動

/**
 * 非均勻衰退表：取年齡符合的最後一段。
 * 只有體能類會掉，技術類完全不掉 —— 這是「技術型長青」的機制來源。
 */
export const DECLINE = [
  { from: 29, pac: 1, sta: 1 },
  { from: 32, pac: 1, sta: 1, phy: 1 },
  { from: 35, pac: 2, sta: 2, phy: 1, ref: 1 },
  { from: 38, pac: 2, sta: 2, phy: 1, ref: 1, hea: 1 },
];

/**
 * 連帶成長：練一項能力會帶動相關的其他項，比例是該項點數的一部分。
 * 現實裡沒有人能只練體能而速度和對抗完全不動 —— 重訓、衝刺、對抗訓練本來就重疊。
 * 帶動的點數一樣走蓄力槽，所以不會憑空跳級，只是累積得比較快。
 */
export const SYNERGY = {
  sta: { pac: .20, phy: .20 },   // 體能 → 速度、對抗
  dri: { pac: .20, pas: .20 },   // 盤帶 → 速度、傳球
  pac: { sta: .20, dri: .20 },   // 速度 → 體能、盤帶
  pas: { vis: .20, fin: .20 },   // 傳球 → 視野、射門
  fin: { pas: .20, hea: .20 },   // 射門 → 傳球、頭球
  hea: { fin: .20, phy: .20 },   // 頭球 → 射門、對抗
  phy: { hea: .20, sta: .20 },   // 對抗 → 頭球、體能
  // 站位是門將專屬能力，外場沒有這一項，所以原本指向站位的兩條邊改接：
  def: { phy: .20, hea: .20 },   // 防守 → 對抗、頭球
  vis: { pas: .20, def: .20 },   // 視野 → 傳球、防守（閱讀比賽同時幫出球與補位）
};

/**
 * 門將的能力組只有 5 項（體能／撲救／制空／站位／腳下傳球），
 * 上面那張表裡的速度、對抗、防守、視野他們一項都沒有 —— 直接套用等於整套失效。
 * 因此門將走自己的環，規則一樣是「一個能力影響兩個」。
 * 比例壓到 .12：門將 5 項能力全部計入 ovr，這個環比外場緊得多，
 * 用同樣的 .20 會讓門將結構性地強過所有外場位置。
 */
export const SYNERGY_GK = {
  sta: { ref: .12, aer: .12 },   // 體能 → 撲救、制空
  ref: { pos: .12, aer: .12 },   // 撲救 → 站位、制空
  aer: { ref: .12, sta: .12 },   // 制空 → 撲救、體能
  pos: { ref: .12, dis: .12 },   // 站位 → 撲救、腳下傳球
  dis: { pos: .12, sta: .12 },   // 腳下傳球 → 站位、體能
};

/* ==================================================================== */
/* 原型：不是開局選的，是前幾年加點長出來的                                */
/* ==================================================================== */

/**
 * pos    可登記此原型的細分位置
 * major  主修能力：成本 ×0.7、選定時 pot +4、加點介面置頂
 * out    產能係數，乘在 POS_OUTPUT 上
 * ageBias late = 衰退對產能影響小（不吃速度的打法）
 * evolve 走到極致後的進化型，純榮譽向
 */
export const ARCHETYPE = {
  poacher: {
    n: '禁區之狐', pos: ['ST'], major: ['fin', 'hea', 'vis'],
    req: p => p.ab.fin >= 65 && p.ab.fin - p.ab.pac >= 12,
    out: { g: 1.35, a: 0.6, cs: 1 }, ageBias: 'late',
    d: '不吃速度，衰退期照樣進球',
    evolve: { key: 'clinical', n: '冷血終結者', cond: s => sumStat(s, 'goals') >= 120 },
  },
  speedster: {
    n: '速度殺手', pos: ['ST', 'W'], major: ['pac', 'fin', 'dri'],
    req: p => p.ab.pac >= 72 && p.ab.pac - p.ab.phy >= 12,
    out: { g: 1.2, a: 0.9, cs: 1 }, ageBias: 'early',
    d: '巔峰期最強，31 歲後產能斷崖',
  },
  complete: {
    n: '全能中鋒', pos: ['ST'], major: ['phy', 'hea', 'fin', 'pas'],
    req: p => p.ab.phy >= 65 && p.ab.hea >= 65,
    out: { g: 1.0, a: 1.3, cs: 1 }, ageBias: 'mid',
    d: '平衡型，做球給隊友的戲份多',
  },
  falseNine: {
    n: '偽九號', pos: ['ST', 'AM'], major: ['vis', 'pas', 'dri', 'fin'],
    req: p => p.ab.vis >= 69 && p.ab.vis - p.ab.phy >= 12,
    out: { g: 0.85, a: 1.6, cs: 1 }, ageBias: 'late',
    d: '退到中場拿球，可與前腰互轉',
  },
  magician: {
    n: '邊路魔術師', pos: ['W'], major: ['dri', 'pac', 'vis'],
    req: p => p.ab.dri >= 72 && p.ab.dri - p.ab.fin >= 11,
    out: { g: 0.8, a: 1.5, cs: 1 }, ageBias: 'early',
    d: '過人集錦讓球迷聲望長最快',
    evolve: { key: 'standing', n: '看台起立者', cond: s => s.career.fanRep >= 85 },
  },
  cutInside: {
    n: '內切射手', pos: ['W'], major: ['fin', 'dri', 'pac'],
    req: p => p.ab.fin >= 69 && p.ab.dri >= 65,
    out: { g: 1.3, a: 0.9, cs: 1 }, ageBias: 'mid',
    d: '慣用腳與所在邊路相反，內切起腳',
  },
  engine: {
    n: '中場發動機', pos: ['CM', 'DM'], major: ['sta', 'phy', 'def', 'pas'],
    req: p => p.ab.sta >= 72 && p.ab.sta - p.ab.vis >= 11,
    out: { g: 1.0, a: 1.0, cs: 1 }, ageBias: 'early',
    minutes: 0.08, load: 1.2,
    d: '出場率 +8%，但韌帶負荷 ×1.2',
  },
  maestro: {
    n: '中場大師', pos: ['CM'], major: ['pas', 'vis'],
    req: p => p.ab.pas >= 74 && p.ab.vis >= 69,
    out: { g: 1.0, a: 1.4, cs: 1 }, ageBias: 'late',
    d: '不吃速度體能，評分天花板最高',
    evolve: { key: 'metronome', n: '節拍器', cond: s => sumStat(s, 'apps') >= 300 && avgRating(s) >= 7.3 },
  },
  tenCore: {
    n: '十號核心', pos: ['AM'], major: ['vis', 'pas', 'dri'],
    req: p => p.ab.vis >= 74 && p.ab.pas >= 69,
    out: { g: 1.1, a: 1.6, cs: 1 }, ageBias: 'mid',
    d: '球隊圍著你轉，金球獎權重最高',
  },
  shield: {
    n: '防守屏障', pos: ['DM'], major: ['def', 'phy', 'hea'],
    req: p => p.ab.def >= 72 && p.ab.def - p.ab.dri >= 12,
    out: { g: 1.0, a: 0.7, cs: 1.15 }, ageBias: 'late',
    d: '獎項少但續約最穩',
  },
  rock: {
    n: '中衛磐石', pos: ['CB'], major: ['def', 'hea', 'phy'],
    req: p => p.ab.def >= 72 && p.ab.hea >= 65,
    out: { g: 1.0, a: 1.0, cs: 1.3 }, ageBias: 'late',
    captain: 2,
    d: '零封 ×1.3，隊長袖標機率 ×2',
  },
  ballplaying: {
    n: '出球中衛', pos: ['CB'], major: ['pas', 'vis', 'def'],
    req: p => p.ab.pas >= 65 && p.ab.def >= 65,
    out: { g: 1.0, a: 1.4, cs: 1.1 }, ageBias: 'late',
    d: '現代足球最搶手的型',
  },
  attackingFB: {
    n: '助攻邊衛', pos: ['FB'], major: ['sta', 'pac', 'dri', 'pas'],
    req: p => p.ab.sta >= 69 && p.ab.pac >= 69,
    out: { g: 1.0, a: 1.5, cs: 1.0 }, ageBias: 'early',
    d: '衰退期被迫轉中衛的經典劇本',
  },
  shotstopper: {
    n: '撲救之神', pos: ['GK'], major: ['ref', 'pos'],
    req: p => p.ab.ref >= 74,
    out: { g: 1, a: 1, cs: 1.35 }, ageBias: 'late',
    d: '評分波動大，單場英雄戲份多',
    evolve: { key: 'unbeatable', n: '不可逾越', cond: s => bestStat(s, 'cs') >= 18 },
  },
  sweeper: {
    n: '門線清道夫', pos: ['GK'], major: ['dis', 'aer', 'pos'],
    req: p => p.ab.dis >= 65 && p.ab.aer >= 65,
    out: { g: 1, a: 1, cs: 1.1 }, ageBias: 'late',
    d: '出球型門將，豪門偏好',
  },
};

/** 31 歲後速度掉到門檻下時的轉型路線 */
export const ARCH_SWITCH = {
  speedster: { to: 'poacher', t: '你跑不過他們了，但你比他們早兩秒知道球會落在哪。' },
  magician: { to: 'tenCore', t: '從邊線移進中路，用腦子踢球。' },
  attackingFB: { to: 'rock', t: '往後退一條線，把經驗換成位置感。' },
  engine: { to: 'shield', t: '跑不動了，那就站在對的地方。' },
  cutInside: { to: 'poacher', t: '不再從邊路內切，直接住進禁區。' },
};

const sumStat = (s, k) => s.career.seasons.reduce((a, x) => a + (x[k] || 0), 0);
const bestStat = (s, k) => s.career.seasons.reduce((a, x) => Math.max(a, x[k] || 0), 0);
const avgRating = (s) => {
  const r = s.career.seasons.filter(x => x.apps > 0);
  return r.length ? r.reduce((a, x) => a + x.rating, 0) / r.length : 0;
};

/* ==================================================================== */
/* 事件卡                                                                */
/* ==================================================================== */

/**
 * for    '*' 全體 / 'GK' / 'OUT' 外場 / 'PRO' 職業階段 / 'ABROAD' 旅外中
 * cond   額外觸發條件 (s) => boolean
 * weight 加權抽樣的權重，預設 1
 * once   整局只會出現一次（記在 s.career.seenEvents）
 * g / b  成功／失敗的效果表：能力代碼、inj 受傷率、rand 隨機能力、fanRep 球迷聲望
 * fx     (s, win, api) 副作用：禁賽、罰款、強制轉會、解除袖標……
 * opts   有這個欄位就不是賭成功率，而是讓玩家在兩條路之間選（各自有 g 與 fx）
 */

const last = s => s.career.seasons[s.career.seasons.length - 1];
const lastRating = s => (last(s) ? last(s).rating : 0);
const role = s => ROLE_RANK[s.club.role] ?? 2;
const isArch = k => s => s.player.arch === k;
const atPos = (...ps) => s => ps.includes(s.player.dpos);

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
  { n: '記者會失言', for: 'PRO', cond: s => LV[s.club.lv].tier >= 3, gt: '幽默化解了尖銳提問', bt: '一句話上了頭版，更衣室氣氛僵了', g: { sta: 1 }, b: { rand: -2, sta: -1 } },
  { n: '社群媒體風波', for: 'PRO', cond: s => s.career.fanRep >= 45, gt: '一則貼文圈粉無數', bt: '舊貼文被翻出來炎上', g: { sta: 1 }, b: { rand: -2 } },
  { n: '更衣室內鬨', for: 'PRO', gt: '你出面把話講開了', bt: '被貼上刺頭標籤', g: { vis: 1, sta: 1 }, b: { rand: -2 } },
  { n: '青訓小將挑戰你的位置', for: 'PRO', cond: s => s.player.age >= 26, gt: '你用表現讓他坐回板凳', bt: '訓練賽被完全壓制', g: { rand: 2 }, b: { rand: -2 } },
  { n: '飲食與睡眠管理', for: '*', gt: '體脂下降，回復速度變快', bt: '作息亂掉，整季昏昏沉沉', g: { sta: 2 }, b: { sta: -2, inj: 4 } },
  { n: '客場長征與時差', for: 'PRO', gt: '調整得宜，落地就進入狀況', bt: '整整兩週沒睡好', g: { sta: 1 }, b: { sta: -2, inj: 5 } },
  { n: '老將的一句話', for: '*', gt: '一句話點醒夢中人', bt: '學了不適合自己的東西', g: { rand: 2 }, b: { rand: -2 } },
  { n: '季中低潮', for: '*', gt: '靠自我調整走了出來', bt: '低潮拖了一個月', g: { vis: 1, sta: 1 }, b: { fin: -2, sta: -1 } },
  { n: '語言與新環境', for: 'ABROAD', gt: '你開始用當地語言在場上喊人', bt: '聽不懂戰術會議，訓練賽站錯位', g: { vis: 2, sta: 1 }, b: { vis: -2, sta: -1 } },
  { n: '思鄉', for: 'ABROAD', gt: '把想家的力氣全放到球場上', bt: '整季心不在焉', g: { rand: 2 }, b: { rand: -2, inj: 4 } },
  { n: '當地媒體的檢視', for: 'ABROAD', gt: '一場好球讓報紙改口叫你自己人', bt: '被寫成「便宜的外籍球員」', g: { fin: 1, dri: 1 }, b: { rand: -2 } },

  /* ---------- 第一類：球迷文化 ---------- */
  { n: '球迷幫你寫了 chant', for: 'PRO', once: true, cond: s => s.club.yearsAtClub >= 2 && s.career.fanRep >= 60,
    gt: '全場一起唱你的名字，你假裝沒聽到，但耳朵是紅的', bt: '那首歌是拿你上週的失誤編的',
    g: { fanRep: 15 }, b: { fanRep: -10, vis: -1 } },
  { n: '看台打出你的 tifo', for: 'PRO', once: true, cond: s => s.career.fanRep >= 75,
    gt: '整個看台攤開一面畫著你的巨幅畫布', bt: 'tifo 上畫的是別人，你在角落',
    g: { fanRep: 10 }, b: { fanRep: -3 } },
  { n: '名字出現在圍巾上', for: 'PRO', cond: s => s.club.yearsAtClub >= 3 && s.career.fanRep >= 70,
    gt: '球場外的攤販開始賣印著你名字的圍巾', bt: '攤販說你的名字太難寫了',
    g: { fanRep: 8 }, b: { fanRep: -2 } },
  { n: '被自家球迷噓下場', for: 'PRO', cond: s => role(s) <= 1 || lastRating(s) < 6.5,
    gt: '你舉手道歉，看台安靜了下來', bt: '換人時的噓聲蓋過了廣播',
    g: { fanRep: -5 }, b: { fanRep: -20, sta: -1 } },
  { n: '客場全場噓你，你進球了', for: 'PRO', cond: s => s.career.clubHistory?.length > 0,
    gt: '你把手指放在嘴上，全場安靜', bt: '慶祝過頭吃了黃牌',
    g: { fanRep: 20 }, b: { fanRep: 5 } },
  { n: '球衣銷量爆量', for: 'PRO', cond: s => s.career.fanRep >= 70,
    gt: '球衣賣到缺貨，分紅入帳', bt: '賣得普通，分紅意思意思',
    g: { fanRep: 5 }, b: {},
    fx: (s, win, api) => { const cut = Math.round(api.salary * (win ? 0.15 : 0.03)); s.career.salaryTotal += cut; api.card('', '球衣分紅', `額外收入 ${cut} 萬。`); } },
  { n: '賽後把球衣丟給看台的小孩', for: 'PRO',
    gt: '那個孩子哭了，照片隔天上了報', bt: '球衣丟到一半被大人搶走，引發混亂',
    g: { fanRep: 6 }, b: { fanRep: -2 } },
  { n: '回到前東家不慶祝', for: 'PRO', cond: s => (s.career.clubHistory || []).length >= 2,
    gt: '你低頭舉手，兩邊看台都給了掌聲', bt: '你忍不住慶祝了，那面看台再也沒原諒你',
    g: { fanRep: 10 }, b: { fanRep: -25 } },
  { n: '訓練基地外等你的球迷', for: 'PRO',
    gt: '你停下車簽了一小時', bt: '趕時間，車子直接開過去了',
    g: { fanRep: 5, sta: -1 }, b: { fanRep: -8 } },
  { n: '社群粉絲破百萬', for: 'PRO', cond: s => s.career.fanRep >= 65 && LV[s.club.lv].tier >= 4,
    gt: '代言邀約開始進來', bt: '被酸只會經營形象',
    g: { fanRep: 5 }, b: { fanRep: -5 } },
  { n: '球迷票選年度最佳', for: 'PRO', cond: s => s.career.fanRep >= 80,
    gt: '你拿下了球迷票選的年度最佳球員', bt: '票數輸給了隊上的新援',
    g: { fanRep: 5 }, b: { fanRep: -3 },
    fx: (s, win) => { if (win) s.career.honors.push(`${s.career.year} 球迷票選年度最佳`); } },
  { n: '死忠球迷在你低潮時掛布條力挺', for: 'PRO', cond: s => s.career.fanRep >= 70 && lastRating(s) < 6.6,
    gt: '「我們等你回來」六個字掛在看台上', bt: '布條隔天就被拆了',
    g: { sta: 2, fanRep: 3 }, b: { fanRep: -3 } },

  /* ---------- 第二類：更衣室與私生活 ---------- */
  { n: '和隊友的伴侶傳出緋聞', for: 'PRO', once: true, weight: 0.4, cond: s => s.player.age >= 22,
    gt: '澄清成功，只是一場誤會', bt: '照片說明不了什麼，但更衣室已經回不去了',
    g: { fanRep: -5 }, b: { fanRep: -30 },
    fx: (s, win, api) => { if (!win) { s.player.traits.captain = false; s._forceMove = true; api.unlock('cancer'); } } },
  { n: '訓練場和隊友打起來', for: 'PRO', once: true,
    gt: '被視為有種，更衣室反而服你', bt: '被罰款禁賽，標籤撕不掉',
    g: { phy: 2 }, b: { fanRep: -10 },
    fx: (s, win, api) => { if (!win) api.suspend(3); } },
  { n: '夜店被拍到', for: 'PRO', cond: s => s.player.age <= 30,
    gt: '公關處理得宜，新聞隔天就沒了', bt: '凌晨四點的照片配上昨天的比分',
    g: { fanRep: 2 }, b: { sta: -2, fanRep: -12 },
    fx: (s, win, api) => { if (!win) api.fine(0.05); } },
  { n: '賭博成癮', for: 'PRO', once: true, weight: 0.3, cond: s => s.career.salaryTotal >= 1000,
    gt: '你及時收手，沒有人知道', bt: '帳戶見底，你連自己輸了多少都算不出來',
    g: {}, b: { sta: -3 },
    fx: (s, win, api) => { if (!win) { s.career.salaryTotal = Math.round(s.career.salaryTotal * 0.8); api.card('bad', '代價', '生涯薪資 −20%。'); } } },
  { n: '遲到罰款', for: 'PRO',
    gt: '教練笑笑帶過', bt: '這已經是這季第三次了',
    g: {}, b: { fanRep: -3 },
    fx: (s, win, api) => { if (!win) { s.club.minutes = Math.max(0, s.club.minutes - 0.15); api.card('bad', '冷凍', '被冷凍兩個月，本季出場率 −15%。'); } } },
  { n: '和教練公開頂嘴', for: 'PRO', cond: s => role(s) <= 2,
    gt: '教練反而欣賞你的火氣，給了你機會', bt: '你被丟進了不會上場的那份名單',
    g: {}, b: {},
    fx: (s, win, api) => { if (win) api.shiftRole(1); else { s.club.minutes = 0.05; api.card('bad', '冷宮', '本季出場率剩下 5%。'); } } },
  { n: '爭主罰點球', for: 'PRO', cond: atPos('ST', 'AM', 'W'),
    gt: '你搶過球，罰進了', bt: '你搶過球，然後罰丟了',
    g: { fin: 2, fanRep: 8 }, b: { fanRep: -12 } },
  { n: '隊內薪資曝光', for: 'PRO',
    gt: '你剛好是低薪高貢獻，球迷全站你這邊', bt: '你是隊上最高薪，而數據不會說謊',
    g: { fanRep: 10 }, b: { fanRep: -15 } },
  { n: '新教練上任，你不在計畫內', for: 'PRO', cond: s => s.club.yearsAtClub >= 3,
    gt: '你用整個季前把他說服了', bt: '你被掛牌了',
    g: {}, b: {},
    fx: (s, win, api) => { if (win) api.shiftRole(1); else s._forceMove = true; } },
  { n: '更衣室領袖退休，接班問題', for: 'PRO', once: true, cond: s => s.club.yearsAtClub >= 4 && s.player.age >= 27,
    gt: '袖標交到你手上', bt: '袖標給了別人',
    g: {}, b: { fanRep: -3 },
    fx: (s, win, api) => { if (win) api.unlock('captain'); } },

  /* ---------- 第三類：場上時刻 ---------- */
  { n: '補時絕殺', for: 'PRO', cond: s => s.club.minutes >= 0.4,
    gt: '球進的瞬間全隊衝向角旗', bt: '你打在門柱上，終場哨響',
    g: { fanRep: 15 }, b: { fin: -1 },
    fx: (s, win) => { if (win) s._bonusGoals = (s._bonusGoals || 0) + 1; } },
  { n: '對死敵的帽子戲法', for: 'PRO', weight: 0.5, cond: atPos('ST', 'W', 'AM'),
    gt: '德比戰，三球，你的名字被寫進隊史', bt: '德比戰你一次射正都沒有',
    g: { fanRep: 25 }, b: { fanRep: -8 },
    fx: (s, win) => { if (win) { s._bonusGoals = (s._bonusGoals || 0) + 3; s.career.honors.push(`${s.career.year} 德比戰帽子戲法`); } } },
  { n: '烏龍球', for: 'PRO', cond: atPos('CB', 'FB', 'GK'),
    gt: '賽後隊友一個個過來拍你的頭', bt: '那顆球在慢動作重播裡播了一整週',
    g: { fanRep: -3 }, b: { fanRep: -15, pos: -1 } },
  { n: '慶祝脫球衣吃第二張黃', for: 'PRO',
    gt: '值得。那球值得。', bt: '球隊少打一人，最後被扳平',
    g: { fanRep: 10 }, b: { fanRep: -5 },
    fx: (s, win, api) => { if (!win) api.suspend(1); } },
  { n: '假摔被鏡頭抓到', for: 'PRO', cond: atPos('W', 'AM', 'ST'),
    gt: '裁判沒看到，事後也沒人追究', bt: '四個角度的重播，你一個都躲不掉',
    g: {}, b: { fanRep: -18 },
    fx: (s, win, api) => { if (!win) api.unlock('diver'); } },
  { n: '點球大戰主動舉手', for: 'PRO', weight: 0.6,
    gt: '你走上去，罰進了，球隊晉級', bt: '你走上去，然後看著門將撲出來',
    g: { fanRep: 20 }, b: { fanRep: -20, fin: -2 },
    fx: (s, win, api) => { if (win && s.career.counters.clutch++ >= 2) api.unlock('bigmatch'); } },
  { n: '爭議紅牌後炮轟裁判', for: 'PRO',
    gt: '球迷站在你這邊，罰款你自己付', bt: '協會加重處分',
    g: { fanRep: 12 }, b: {},
    fx: (s, win, api) => { if (win) api.fine(0.02); else api.suspend(4); } },
  { n: '門將上去頂角球', for: 'GK', once: true, weight: 0.3,
    gt: '門將進球。整個球場瘋了。', bt: '你還在對方禁區，對面已經射空門了',
    g: { fanRep: 30 }, b: { fanRep: -10 },
    fx: (s, win) => { if (win) s.career.honors.push(`${s.career.year} 門將破門`); } },
  { n: '單場零封＋撲點', for: 'GK',
    gt: '你把點球撲了出來，全場零封', bt: '點球進了，零封也沒了',
    g: { fanRep: 12, ref: 1 }, b: { fanRep: -4 } },
  { n: '對方球星在你頭上過人成集錦', for: 'PRO', cond: atPos('CB', 'FB', 'DM'),
    gt: '第二次交手你把他防死了', bt: '那個動作變成了你的 meme',
    g: { def: 2 }, b: { fanRep: -12, def: -1 } },
  { n: '世界波遠射', for: 'PRO',
    gt: '三十五碼，死角，年度最佳進球候選', bt: '三十五碼，飛進了看台第八排',
    g: { fanRep: 15 }, b: { fanRep: -2 } },
  { n: '賽季最後一輪保級生死戰', for: 'PRO', cond: s => s.club.tier === 4,
    gt: '保級成功，草皮上全是躺著的人', bt: '降級了。更衣室沒有人說話。',
    g: { fanRep: 20, sta: -2 }, b: { fanRep: -10 },
    fx: (s, win) => { if (!win) s._forceMove = true; } },

  /* ---------- 第四類：合約與轉會 ---------- */
  { n: '經紀人未經同意放話', for: 'PRO', cond: s => s.player.age >= 23,
    gt: '你公開切割，換掉了經紀人', bt: '你被寫成不忠誠的那個人',
    g: {}, b: { fanRep: -10 },
    fx: (s, win, api) => { if (!win) api.unlock('puppet'); } },
  { n: '拒絕續約被下放二隊', for: 'PRO', cond: s => s.club.yearsAtClub >= 2,
    gt: '你硬撐到了自由身，簽字費入袋', bt: '一整季沒有比賽',
    g: {}, b: {},
    fx: (s, win, api) => {
      if (win) { const b = Math.round(api.salary * 0.5); s.career.salaryTotal += b; api.card('good', '簽字費', `自由身簽約，入袋 ${b} 萬。`); }
      else { s.club.minutes = 0; api.card('bad', '二隊', '整季在二隊，出場率 0%。'); }
    } },
  { n: '前東家送上榮譽通道', for: 'PRO', cond: s => (s.career.clubHistory || []).length >= 1 && s.career.fanRep >= 70,
    gt: '舊隊友在通道兩側排開，為你鼓掌', bt: '沒有人記得你來過',
    g: { fanRep: 10, sta: 1 }, b: { fanRep: -2 } },
  { n: '搶 10 號球衣', for: 'PRO', cond: s => s.club.yearsAtClub >= 2,
    gt: '10 號是你的了', bt: '10 號給了剛簽下的新援',
    g: { fanRep: 8 }, b: { fanRep: -3 } },
  { n: '冬窗豪門詢問', for: 'PRO', cond: s => role(s) >= 3,
    gt: '談成了，你提前拿到了升級的機會', bt: '談判破裂，消息卻已經傳開',
    g: { fanRep: 4 }, b: { fanRep: -5 },
    fx: (s, win) => { if (win) s._winterOffer = true; } },
  { n: '母隊召回租借', for: 'PRO', cond: s => !!s.club.loanFrom,
    gt: '母隊看到了數據，把你召回並升為主力', bt: '回去繼續坐板凳',
    g: {}, b: {},
    fx: (s, win, api) => { if (win) api.shiftRole(1); else api.shiftRole(-1); } },

  /* ---------- 第五類：本土劇本 ---------- */
  { n: '企業聯賽的白天工作', for: 'PRO', cond: s => s.club.lv === 'TPFL',
    opts: [
      { t: '加班賺錢', s: '收入 +30%、體能 −2', g: { sta: -2 }, fx: (s, a) => { const b = Math.round(a.salary * 0.3); s.career.salaryTotal += b; a.card('', '加班', `多賺了 ${b} 萬，但練球時間被吃掉了。`); } },
      { t: '準時去練球', s: '能力 +1、收入 −20%', g: { rand: 1 }, fx: (s, a) => { const c = Math.round(a.salary * 0.2); s.career.salaryTotal = Math.max(0, s.career.salaryTotal - c); a.card('', '取捨', `少賺 ${c} 萬，換到了完整的訓練。`); } },
    ] },
  { n: '家人反對你踢球', for: '*', once: true, cond: s => s.club.stage !== 'PRO' && s.player.age <= 19,
    gt: '你把他們帶到球場邊，他們看完了整場', bt: '晚餐桌上沒有人說話',
    g: { sta: 2 }, b: {},
    fx: (s, win, api) => { if (win) s.career.counters.persuaded = 1; else s._diceDebuff = 1; } },
  { n: '母校學弟來看你比賽', for: 'PRO', cond: s => s.career.fanRep >= 55,
    gt: '整排穿著母校球衣的孩子在看台上喊你的名字', bt: '你那場踢得很糟',
    g: { fanRep: 5, sta: 1 }, b: { fanRep: -3 } },
  { n: '加油團包遊覽車來客場', for: 'PRO', cond: s => LV[s.club.lv].tier <= 2,
    gt: '客場看台上有一整區是為你來的', bt: '遊覽車在高速公路上拋錨了',
    g: { fanRep: 10 }, b: { fanRep: -2 } },
  { n: '旅外第一年語言不通', for: 'ABROAD', once: true,
    opts: [
      { t: '先去學語言', s: '視野 +2，但當季表現下滑', g: { vis: 2 }, fx: (s) => { s.player.injury.seasonFactor *= 0.9; } },
      { t: '專心練球', s: '專項 +2，但更衣室孤立', g: { rand: 2, fanRep: -5 }, fx: () => {} },
    ] },
  { n: '媒體只在你進球時出現', for: 'ABROAD',
    opts: [
      { t: '配合採訪', s: '聲望 +8、體能 −1', g: { fanRep: 8, sta: -1 }, fx: () => {} },
      { t: '拒絕受訪', s: '媒體轉黑、聲望 −5', g: { fanRep: -5 }, fx: () => {} },
    ] },
  { n: '代表隊集訓與俱樂部衝突', for: 'PRO', cond: s => s.career.caps > 0,
    opts: [
      { t: '回國報到', s: '聲望 +12、受傷率 +8', g: { fanRep: 12, inj: 8 }, fx: () => {} },
      { t: '留隊備戰', s: '陣中地位 +1 檔，代表隊冷凍', g: {}, fx: (s, a) => { a.shiftRole(1); s.career.counters.snubbed = (s.career.counters.snubbed || 0) + 1; } },
    ] },
  { n: '成為第一位在此進球的同胞', for: 'ABROAD', once: true, cond: s => LV[s.club.lv].tier >= 5,
    gt: '全國版面。你的名字後面第一次跟著國名。', bt: '整季沒能破蛋',
    g: { fanRep: 25 }, b: { fanRep: -5 },
    fx: (s, win, api) => { if (win) api.unlock('pioneer'); } },
  { n: '回家鄉辦足球夏令營', for: 'PRO', cond: s => s.player.age >= 28 && s.career.fanRep >= 70,
    gt: '三百個孩子報名，你一個個記住了名字', bt: '場地沒租到，活動取消',
    g: { fanRep: 10 }, b: { fanRep: -3 },
    fx: (s, win) => { if (win) s.career.counters.camp = 1; } },

  /* ---------- 第六類：原型專屬 ---------- */
  { n: '越位線上的博弈', for: 'PRO', weight: 1.5, cond: isArch('poacher'),
    gt: '你比防線早半步啟動了六次，中了四次', bt: '六次啟動，五次越位',
    g: { vis: 3 }, b: { vis: -1, fanRep: -4 } },
  { n: '一場比賽只碰七次球但進兩球', for: 'PRO', weight: 1.5, cond: isArch('poacher'),
    gt: '數據派說你消失，比分說你贏了', bt: '這次只有七次觸球，沒有進球',
    g: { fanRep: 12, fin: 1 }, b: { fanRep: -8 } },
  { n: '一腳直塞撕裂防線', for: 'PRO', weight: 1.5, cond: isArch('maestro'),
    gt: '那球穿過了四個人', bt: '被斷球打反擊，失分',
    g: { pas: 3 }, b: { pas: -1, fanRep: -4 } },
  { n: '被批評跑動不足', for: 'PRO', weight: 1.5, cond: isArch('maestro'),
    gt: '你用傳球成功率回答了所有人', bt: '數據攤開來，你確實跑得最少',
    g: { vis: 2 }, b: { fanRep: -8 } },
  { n: '彩虹過人上了全球集錦', for: 'PRO', weight: 1.5, cond: isArch('magician'),
    gt: '那個動作被剪進了年度十佳', bt: '你在自家禁區前嘗試了同一個動作',
    g: { fanRep: 20, dri: 2 }, b: { fanRep: -10 } },
  { n: '被對方邊衛用犯規戰術鎖死', for: 'PRO', weight: 1.5, cond: isArch('magician'),
    gt: '你硬是從六次犯規裡站起來，過掉了他', bt: '整場被踢了六次，教練提早換你下場',
    g: { phy: 2 }, b: { dri: -2, inj: 8 } },
  { n: '單場跑動 13 公里', for: 'PRO', weight: 1.5, cond: isArch('engine'),
    gt: '全隊跑動第一，教練把你當標竿', bt: '跑完了，但膝蓋在抗議',
    g: { sta: 3 }, b: { sta: -1 },
    fx: (s, win) => { if (win) s.player.injury.load += 8; } },
  { n: '單場 11 次撲救', for: 'GK', weight: 1.5, cond: isArch('shotstopper'),
    gt: '十一次撲救，零封。這場是你一個人贏的。', bt: '撲了九次，還是丟了三球',
    g: { ref: 3, fanRep: 15 }, b: { fanRep: -6 } },
  { n: '衝出禁區外解圍', for: 'GK', weight: 1.5, cond: isArch('sweeper'),
    gt: '你在中線附近把球解掉了', bt: '你在中線附近被過掉了，紅牌',
    g: { pos: 2 }, b: { fanRep: -10 },
    fx: (s, win, api) => { if (!win) api.suspend(1); } },
  { n: '帶傷打完全場', for: 'PRO', weight: 1.5, cond: isArch('rock'),
    gt: '纏著繃帶頂完最後一顆角球', bt: '硬撐的代價比想像中大',
    g: { phy: 2, fanRep: 12, inj: 12 }, b: { inj: 15, sta: -2 } },
  { n: '兩頭跑的代價', for: 'PRO', weight: 1.5, cond: isArch('attackingFB'),
    gt: '上下九十分鐘，你還有力氣送出助攻', bt: '第七十分鐘之後你就跑不回來了',
    g: { sta: 2 }, b: { def: -2 },
    fx: (s, win) => { if (win) s.player.injury.load += 10; } },
  { n: '和隊上最快的人賽跑', for: 'PRO', weight: 1.5, cond: isArch('speedster'),
    gt: '你贏了，全隊起鬨', bt: '起跑第三步，大腿後側就報警了',
    g: { pac: 2 }, b: { pac: -1, inj: 12 } },
  { n: '教練把整套戰術繞著你設計', for: 'PRO', weight: 1.5, cond: isArch('tenCore'),
    gt: '球隊的每一次進攻都從你腳下開始', bt: '球隊的每一次失敗也都算在你頭上',
    g: {}, b: { fanRep: -16 },
    fx: (s, win, api) => { if (win) { api.shiftRole(1); s.club.minutes = Math.min(0.95, s.club.minutes + 0.1); } } },
  { n: '為隊友做球而非自己射門', for: 'PRO', weight: 1.5, cond: isArch('complete'),
    gt: '你把空門讓給了狀態低迷的隊友', bt: '你該傳的時候自己射了',
    g: { pas: 2, fanRep: 8 }, b: { fanRep: -6 } },
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
  secondwind: { n: '第二春',   tone: 'gold', fx: '成功轉型，生涯延長並重新拿回主力位置' },
  idol:     { n: '看台之神',   tone: 'gold', fx: '球迷聲望 ≥90，這座球場永遠記得你' },
  glass:    { n: '玻璃人',     tone: 'bad',  fx: '受傷機率下限 40%' },
  benched:  { n: '板凳生涯',   tone: 'bad',  fx: '能力成長停滯，季初擲骰 −1 顆' },
  cancer:   { n: '更衣室毒瘤', tone: 'bad',  fx: '轉會機率大增、續約條件惡化',
              cure: '連兩季評分 ≥7.0 並換一支球隊' },
  socialko: { n: '社群災難',   tone: 'bad',  fx: '事件卡失敗率永久 +10%',
              cure: '球迷聲望回到 70 以上' },
  onetool:  { n: '只會這個',   tone: 'bad',  fx: '出場時間銳減，定位為功能型輪替' },
  diver:    { n: '假摔王',     tone: 'bad',  fx: '裁判不再相信你，聲望回升變慢',
              cure: '連兩季沒有再被抓到' },
  puppet:   { n: '經紀人傀儡', tone: 'bad',  fx: '轉會被經紀人牽著走，簽約條件變差',
              cure: '自己主動談成一次轉會' },
};

/* ---------------- 其他常數 ---------------- */
export const CONF = {
  startAge: 12,
  startYear: 2026,
  retireAge: 42,
  // declineAge 已由 DECLINE 表取代
  baseInjury: 4,
  eventCards: 3,
  aclCap: 95,
  abilScale: 1.35,   // 事件卡與衰退的能力增減換算到 1–99 尺度
  jhsYears: 3,
  hsYears: 3,
  uniYears: 4,
  fanRepStart: 50,
  fanRepOnMove: 55,   // 轉隊後新東家重新認識你
  fanRepLegend: 80,   // 離隊時達到這個聲望，這座球場永遠記得你
};
