/**
 * 所有平衡數值集中在這個檔案。改平衡 = 改這裡，不動邏輯。
 * 國家、球會與聯賽名稱全部為改編虛構名，避免 IP 風險。
 */

/* ---------------- 能力 ---------------- */
export const ABIL = {
  sta: '體能', fin: '射門', pas: '傳球', dri: '盤帶', pac: '速度',
  phy: '對抗', def: '防守', hea: '頭球', vis: '視野',
  ref: '撲救', aer: '制空', pos: '站位', lng: '長傳準確', sht: '短傳反應',
};

export const POS_GROUP = { GK: '門將', DF: '後衛', MF: '中場', FW: '前鋒' };

/** 雷達圖用的單字縮寫，長名稱在小圖上會擠成一團 */
export const ABIL_SHORT = {
  sta: '體', fin: '射', pas: '傳', dri: '盤', pac: '速',
  phy: '抗', def: '守', hea: '頭', vis: '視',
  ref: '撲', aer: '制', pos: '位', lng: '長', sht: '短',
};

/**
 * 體型：開局隨機，不是玩家選的 —— 這是你拿到的身體，不是你挑的。
 * up 的能力初始值與潛力上限都有優勢，down 的兩者都吃虧。
 * 門將的身體需求和外場完全不同，所以另外一張表。
 */
export const BUILD = {
  tall:   { n: '高大', d: '對抗與制空有先天優勢，但轉身與爆發吃虧',
            up: ['phy', 'hea', 'def'], down: ['pac', 'sta', 'dri'],
            gkUp: ['ref', 'aer'],      gkDown: ['sht', 'sta'] },
  normal: { n: '中等', d: '沒有先天優勢，也沒有先天弱點',
            up: [], down: [], gkUp: [], gkDown: [] },
  small:  { n: '矮小', d: '速度、體能與盤帶有先天優勢，但對抗吃虧',
            up: ['pac', 'sta', 'dri'], down: ['phy', 'hea', 'def'],
            gkUp: ['sht', 'sta'],      gkDown: ['ref', 'aer'] },
};

export const BUILD_ROLL = ['tall', 'tall', 'normal', 'normal', 'normal', 'small', 'small'];

/** 體型對初始值與潛力上限的加減 */
export const BUILD_ADJ = { ab: 4, pot: 7, abDown: -3, potDown: -6 };

/** 各大類可養成的能力 */
export const GROUP_ABIL = {
  GK: ['sta', 'ref', 'aer', 'pos', 'lng', 'sht'],
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
  GK: { ref: .38, pos: .22, aer: .18, sht: .09, lng: .08, sta: .05 },
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
  // 非洲：國內階梯只到第 2 層，想再往上一定得旅外（與台灣同樣的設計）。
  // 沒有移民選項；本地與混血出身享有潛力加成（街頭足球文化與身體素質傳統）。
  NG: { n: '奈及利亞', region: 'AFR', dev: 1,  natl: 66, uni: false,
        noImmigrant: true, potBonus: 5,
        home: { 1: 'AFR_D3', 2: 'NPFL' } },
  CI: { n: '象牙海岸', region: 'AFR', dev: 1,  natl: 64, uni: false,
        noImmigrant: true, potBonus: 5,
        home: { 1: 'AFR_D3', 2: 'CIV1' } },
};

/** 開場選單順序 */
export const NATION_ORDER = ['TW', 'JP', 'KR', 'US', 'BR', 'AR', 'GB', 'ES', 'DE', 'IT', 'FR', 'PT', 'NL', 'NG', 'CI'];

export const REGION = { ASIA: '亞洲', EUR: '歐洲', SAM: '南美', NAM: '北美', AFR: '非洲' };

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
  immigrant: { n: '移民',   d: '移民／僑民家庭，在異鄉長大（部分國家不適用）', fx: '起始能力 −2、15 歲前少一顆骰；旅外年齡窗口 +3', ab: -2, potTop: 0, callAdj: 2, windowAdj: 3 },
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
  JHS:     { n: '國中足球隊',       tier: 0, par: 32, min: 0, g: 12, amateur: true },
  HS:      { n: '高中校隊',         tier: 0, par: 42, min: 0, g: 18, amateur: true },
  ACADEMY: { n: '足球學校青訓梯隊', tier: 0, par: 47, min: 0, g: 24, amateur: true },
  UNI:     { n: '大學足球隊',       tier: 0, par: 49, min: 0, g: 20, amateur: true },

  /* --- T1 半職業／業餘頂點 --- */
  TPFL:   { n: '台灣企業足球聯賽', tier: 1, region: 'ASIA', par: 52, min: 45, g: 27, base: 60, coef: 20, top: 'HOME' },
  JFL:    { n: '日本足球聯賽',     tier: 1, region: 'ASIA', par: 52, min: 45, g: 30, base: 70, coef: 24, top: 'HOME' },
  K4:     { n: 'K4 聯賽',          tier: 1, region: 'ASIA', par: 52, min: 45, g: 28, base: 65, coef: 22, top: 'HOME' },
  USL2:   { n: '美國業餘聯賽',     tier: 1, region: 'NAM',  par: 52, min: 45, g: 24, base: 75, coef: 24, top: 'HOME' },
  EUR_D5: { n: '歐洲第五級聯賽',   tier: 1, region: 'EUR',  par: 52, min: 45, g: 34, base: 70, coef: 24, top: 'HOME' },
  SAM_D3: { n: '南美地區聯賽',     tier: 1, region: 'SAM',  par: 52, min: 45, g: 26, base: 50, coef: 18, top: 'HOME' },
  AFR_D3: { n: '非洲地區聯賽',     tier: 1, region: 'AFR',  par: 52, min: 45, g: 26, base: 45, coef: 16, top: 'HOME' },

  /* --- T2 低階職業 --- */
  J3:     { n: 'J3 聯賽',          tier: 2, region: 'ASIA', par: 58, min: 60, g: 38, base: 180, coef: 60 },
  K3:     { n: 'K3 聯賽',          tier: 2, region: 'ASIA', par: 58, min: 60, g: 32, base: 170, coef: 58 },
  USL1:   { n: '美國三級聯賽',     tier: 2, region: 'NAM',  par: 58, min: 60, g: 32, base: 200, coef: 65 },
  EUR_D4: { n: '歐洲第四級聯賽',   tier: 2, region: 'EUR',  par: 58, min: 60, g: 42, base: 190, coef: 62 },
  BRA_C:  { n: '巴西丙級聯賽',     tier: 2, region: 'SAM',  par: 58, min: 60, g: 30, base: 150, coef: 52 },
  ARG_B:  { n: '阿根廷乙級聯賽',   tier: 2, region: 'SAM',  par: 58, min: 60, g: 34, base: 150, coef: 52 },
  NPFL:   { n: '奈及利亞職業聯賽', tier: 2, region: 'AFR',  par: 58, min: 60, g: 34, base: 130, coef: 46 },
  CIV1:   { n: '象牙海岸甲級聯賽', tier: 2, region: 'AFR',  par: 58, min: 60, g: 30, base: 125, coef: 44 },

  /* --- T3 次級職業 --- */
  J2:     { n: 'J2 聯賽',          tier: 3, region: 'ASIA', par: 63, min: 67, g: 42, base: 420, coef: 150 },
  K2:     { n: 'K2 聯賽',          tier: 3, region: 'ASIA', par: 63, min: 67, g: 36, base: 400, coef: 145 },
  USLC:   { n: '美職次級聯賽',     tier: 3, region: 'NAM',  par: 63, min: 67, g: 34, base: 470, coef: 160 },
  EUR_D3: { n: '歐洲第三級聯賽',   tier: 3, region: 'EUR',  par: 63, min: 67, g: 44, base: 450, coef: 155 },
  BRA_B:  { n: '巴西乙級聯賽',     tier: 3, region: 'SAM',  par: 63, min: 67, g: 38, base: 380, coef: 135 },

  /* --- T4 洲際頂級 --- */
  J1:     { n: 'J1 聯賽',              tier: 4, region: 'ASIA', par: 68, min: 78, g: 38, base: 1100, coef: 420, top: 'TOP' },
  K1:     { n: 'K1 聯賽',              tier: 4, region: 'ASIA', par: 68, min: 78, g: 38, base: 1000, coef: 400, top: 'TOP' },
  MLS:    { n: '美國職業足球大聯盟',   tier: 4, region: 'NAM',  par: 68, min: 78, g: 34, base: 1500, coef: 520, top: 'TOP' },
  BRA_A:  { n: '巴西甲級聯賽',         tier: 4, region: 'SAM',  par: 68, min: 78, g: 38, base: 900,  coef: 360, top: 'TOP' },
  ARG_A:  { n: '阿根廷甲級聯賽',       tier: 4, region: 'SAM',  par: 68, min: 78, g: 30, base: 800,  coef: 330, top: 'TOP' },

  /* --- T5 歐洲跳板 --- */
  POR:     { n: '葡萄牙超級聯賽',   tier: 5, region: 'EUR', par: 71, min: 78, g: 34, base: 1800, coef: 720, top: 'EUR2' },
  NED:     { n: '荷蘭甲級聯賽',     tier: 5, region: 'EUR', par: 71, min: 78, g: 34, base: 1900, coef: 760, top: 'EUR2' },
  EUR_SPR: { n: '歐洲跳板聯賽',     tier: 5, region: 'EUR', par: 71, min: 78, g: 34, base: 1600, coef: 700, top: 'EUR2' },

  /* --- T6 五大次級 --- */
  CHAMP: { n: '英式次級聯賽',   tier: 6, region: 'EUR', par: 73, min: 80, g: 46, base: 2600, coef: 900, top: 'EUR2' },
  EU_D2: { n: '歐陸次級聯賽',   tier: 6, region: 'EUR', par: 73, min: 80, g: 38, base: 2300, coef: 850, top: 'EUR2' },

  /* --- T7 五大聯賽 --- */
  ENG: { n: '英格蘭超級聯賽', tier: 7, region: 'EUR', par: 76, min: 82, g: 38, base: 4600, coef: 3200, top: 'BIG5' },
  ESP: { n: '西班牙甲級聯賽', tier: 7, region: 'EUR', par: 76, min: 82, g: 38, base: 4400, coef: 3100, top: 'BIG5' },
  GER: { n: '德國甲級聯賽',   tier: 7, region: 'EUR', par: 76, min: 82, g: 34, base: 4200, coef: 3000, top: 'BIG5' },
  ITA: { n: '義大利甲級聯賽', tier: 7, region: 'EUR', par: 76, min: 82, g: 38, base: 3900, coef: 2900, top: 'BIG5' },
  FRA: { n: '法國甲級聯賽',   tier: 7, region: 'EUR', par: 76, min: 82, g: 34, base: 3800, coef: 2800, top: 'BIG5' },
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
    AFR:  ['紅土區小學隊', '港市第一中學', '草原市立中學'],
  },
  HS: {
    ASIA: ['海線工商', '中山高中', '仁義高中', '北港高工', '花東體中'],
    EUR:  ['聖橡樹公學', '運河區高校', '鐵道城中學', '南丘學園'],
    SAM:  ['紅土技術學校', '海岸市立高中', '內陸農牧學校'],
    NAM:  ['橡樹嶺高中', '湖畔高中', '大草原高中', '海灣預校'],
    AFR:  ['港市技術學校', '首都體育中學', '內陸農校'],
  },
  ACADEMY: {
    ASIA: ['東方之星足球學院', '青嶺足球學校', '黑潮青訓中心'],
    EUR:  ['白鹿角青訓學院', '運河少年學院', '鐵砧山足球學校', '南岸青訓營'],
    SAM:  ['紅土少年學院', '河岸貧民區球場', '綠松青訓工廠'],
    NAM:  ['大湖區發展學院', '陽光帶青訓中心', '西岸足球學園'],
    AFR:  ['海岸青訓學院', '首都足球工廠', '紅土少年營'],
  },
  UNI: {
    ASIA: ['臨海大學', '中州科大', '國立體大', '南方大學'],
    EUR:  ['舊石橋大學', '北方理工學院'],
    SAM:  ['首都大學', '河岸聯邦大學'],
    NAM:  ['大湖州立大學', '橡樹嶺大學', '西岸理工學院'],
    AFR:  ['首都大學', '海岸理工學院'],
  },
};

export const CLUBS = {
  /* T1 半職業 */
  TPFL: [
    { n: '基隆黃蜂', t: 2 }, { n: '高雄鳳凰', t: 3 }, { n: '台中海豚', t: 1 },
    { n: '高雄電神', t: 1 }, { n: '花蓮山海', t: 3 }, { n: '台北陽光', t: 1 },
    { n: '新竹風城', t: 2 }, { n: '台南鐵人', t: 1 }, { n: '台南UP聯', t: 3 },
    { n: '中山U31', t: 4 }, { n: '台中海線', t: 2 }, { n: '宜蘭飛鳥', t: 4 },
  ],
  JFL: [
    { n: '武藏野藍鳶', t: 2 }, { n: '高崎赤城', t: 3 }, { n: '奈良鹿鳴', t: 3 },
    { n: '栃木雷電', t: 2 }, { n: '滋賀琵琶', t: 1 }, { n: '青森蘋果', t: 4 },
    { n: '福井恐龍', t: 3 },
  ],
  K4: [
    { n: '楊平溪谷', t: 3 }, { n: '金浦金雕', t: 2 }, { n: '江陵松濤', t: 3 },
    { n: '始興白鷺', t: 2 }, { n: '平澤港務', t: 1 }, { n: '驪州陶窯', t: 4 },
  ],
  USL2: [
    { n: '德梅因玉米浪', t: 3 }, { n: '塔科馬霧笛', t: 2 }, { n: '沙漠仙人掌', t: 3 },
    { n: '雪松激流', t: 2 }, { n: '長堤白浪', t: 1 }, { n: '奧克拉荷馬草原雷', t: 4 },
  ],
  EUR_D5: [
    { n: '磨坊鎮聯', t: 3 }, { n: '舊礦區競技', t: 2 }, { n: '灰岩村體育會', t: 3 },
    { n: '啤酒廠聯', t: 2 }, { n: '海堤鎮流浪者', t: 1 }, { n: '牧羊丘陵隊', t: 4 },
  ],
  SAM_D3: [
    { n: '紅土河競技', t: 3 }, { n: '山谷礦工', t: 2 }, { n: '港區藍白', t: 3 },
    { n: '甘蔗田聯合', t: 2 }, { n: '高原銀星', t: 1 }, { n: '雨林綠隊', t: 4 },
  ],
  AFR_D3: [
    { n: '紅土大道聯', t: 3 }, { n: '港口倉庫隊', t: 2 }, { n: '草原獵豹', t: 3 },
    { n: '棕櫚林體育會', t: 2 }, { n: '首都電力隊', t: 1 }, { n: '礦區鐵鎚', t: 4 },
  ],

  /* T2 低階職業 */
  J3: [
    { n: '琉球太陽', t: 2 }, { n: '岩手北狼', t: 3 }, { n: '鳥取沙丘', t: 3 },
    { n: '愛媛柑橘', t: 2 }, { n: '富山立山', t: 1 }, { n: '長野信濃', t: 2 },
    { n: '宮崎日向', t: 4 },
  ],
  K3: [
    { n: '慶州古都', t: 2 }, { n: '木浦海風', t: 3 }, { n: '春川昭陽', t: 3 },
    { n: '天安胡桃', t: 2 }, { n: '金泉尚武', t: 1 }, { n: '安東河回', t: 4 },
  ],
  USL1: [
    { n: '查爾斯頓潮汐', t: 2 }, { n: '大湖鋼城', t: 3 }, { n: '落磯山雷鳥', t: 3 },
    { n: '奧馬哈拓荒者', t: 2 }, { n: '里奇蒙鐵軌', t: 1 }, { n: '土桑沙狐', t: 4 },
  ],
  EUR_D4: [
    { n: '北岸造船', t: 2 }, { n: '麥田聯', t: 3 }, { n: '鐵道工人隊', t: 3 },
    { n: '紡織城競技', t: 2 }, { n: '燈塔岬流浪', t: 1 }, { n: '磚窯區聯', t: 4 },
  ],
  BRA_C: [
    { n: '亞馬遜綠鸚', t: 2 }, { n: '內陸紅牛', t: 3 }, { n: '海岸燈塔', t: 3 },
    { n: '咖啡園競技', t: 2 }, { n: '北河谷聯', t: 1 }, { n: '鹽湖白鷺', t: 4 },
  ],
  ARG_B: [
    { n: '拉普拉塔白條', t: 2 }, { n: '探戈區鐵匠', t: 3 }, { n: '南風競技', t: 3 },
    { n: '牧場紅星', t: 2 }, { n: '安地斯石城', t: 1 }, { n: '碼頭區聯', t: 4 },
  ],
  NPFL: [
    { n: '拉各斯海鷗', t: 1 }, { n: '卡諾風暴', t: 2 }, { n: '河州石油人', t: 2 },
    { n: '伊巴丹綠鷹', t: 3 }, { n: '阿布加中央', t: 1 }, { n: '三角洲聯', t: 3 },
    { n: '約斯高原隊', t: 4 },
  ],
  CIV1: [
    { n: '阿比讓黃綠', t: 1 }, { n: '象牙港競技', t: 2 }, { n: '亞穆蘇克羅王城', t: 2 },
    { n: '可可田聯合', t: 3 }, { n: '瀉湖藍星', t: 1 }, { n: '布瓦凱北方隊', t: 3 },
  ],

  /* T3 次級職業 */
  J2: [
    { n: '長崎白鯨', t: 1 }, { n: '甲府武田', t: 2 }, { n: '水戶葵', t: 3 },
    { n: '千葉海風', t: 1 }, { n: '岡山桃太郎', t: 2 }, { n: '山形藏王', t: 3 },
    { n: '熊本火國', t: 2 },
  ],
  K2: [
    { n: '釜山海雲', t: 1 }, { n: '安養綠焰', t: 2 }, { n: '忠南白馬', t: 3 },
    { n: '大田市民', t: 1 }, { n: '富川紅獅', t: 2 }, { n: '全南龍', t: 3 },
  ],
  USLC: [
    { n: '鳳凰城烈日', t: 1 }, { n: '聖安東尼星堡', t: 2 }, { n: '印城十一人', t: 3 },
    { n: '路易維爾城', t: 1 }, { n: '匹茲堡河鋼', t: 2 }, { n: '孟菲斯藍調', t: 3 },
  ],
  EUR_D3: [
    { n: '石橋城競技', t: 2 }, { n: '黑森林獵人', t: 2 }, { n: '東港碼頭', t: 3 },
    { n: '大教堂城聯', t: 1 }, { n: '銀礦山體育會', t: 3 }, { n: '運河區流浪', t: 1 },
    { n: '葡萄園聯', t: 4 }, { n: '威爾士紅龍', t: 2 }, 
  ],
  BRA_B: [
    { n: '聖保羅高地', t: 1 }, { n: '米納斯黑鑽', t: 2 }, { n: '巴伊亞浪花', t: 3 },
    { n: '塞阿拉狼', t: 1 }, { n: '朗多尼亞綠林', t: 2 }, { n: '聖卡塔琳娜藍', t: 3 },
  ],

  /* T4 洲際頂級 */
  J1: [
    { n: '橫濱潮聲', t: 1 }, { n: '大阪緋櫻', t: 1 }, { n: '廣島紫火', t: 2 },
    { n: '仙台七夕', t: 3 }, { n: '名古屋赤鯱', t: 1 }, { n: '川崎藍閃', t: 2 },
    { n: '鹿島鹿角', t: 2 }, { n: '湘南海風', t: 3 }, { n: '新潟天鵝', t: 4 },
  ],
  K1: [
    { n: '全州綠盾', t: 1 }, { n: '蔚山藍鯨', t: 1 }, { n: '水原青龍', t: 2 },
    { n: '大邱天空', t: 3 }, { n: '浦項製鐵', t: 1 }, { n: '首爾紫電', t: 2 },
    { n: '仁川機場城', t: 3 }, { n: '江原雪嶽', t: 4 },
  ],
  MLS: [
    { n: '洛城銀河星', t: 1 }, { n: '西雅圖翡翠', t: 1 }, { n: '邁阿密粉紅鶴', t: 2 },
    { n: '亞特蘭大五芒星', t: 3 }, { n: '紐約紅公牛', t: 1 }, { n: '波特蘭伐木者', t: 2 },
    { n: '奧斯汀綠樹', t: 2 }, { n: '芝加哥火焰', t: 3 }, { n: '聖荷西地震', t: 4 },
  ],
  BRA_A: [
    { n: '里約黑白旗', t: 1 }, { n: '聖保羅紅黑', t: 1 }, { n: '米納斯藍十字', t: 2 },
    { n: '巴拉那綠松', t: 3 }, { n: '瓜納巴拉紅黑', t: 1 }, { n: '巴伊亞藍紅', t: 2 },
    { n: '伯南布哥獅', t: 3 }, { n: '南大河三色', t: 2 },
  ],
  ARG_A: [
    { n: '布宜諾紅藍', t: 1 }, { n: '河岸白紅', t: 1 }, { n: '科爾多瓦鋼鐵', t: 2 },
    { n: '探戈紫羅蘭', t: 3 }, { n: '拉普拉塔學生', t: 2 }, { n: '羅薩里奧中央', t: 2 },
    { n: '阿韋亞內達紅', t: 1 }, { n: '門多薩山鷹', t: 4 },
  ],

  /* T5 歐洲跳板 */
  POR: [
    { n: '里斯本海鷹', t: 1 }, { n: '波爾圖藍龍', t: 1 }, { n: '米尼奧紅十字', t: 2 },
    { n: '大西洋群島隊', t: 3 }, { n: '里斯本獅心', t: 1 }, { n: '海岸城體育會', t: 2 },
    { n: '杜羅河谷聯', t: 3 }, { n: '阿爾加維陽光', t: 4 },
  ],
  NED: [
    { n: '阿姆斯特丹銀鬱金香', t: 1 }, { n: '埃因霍紅白光', t: 1 }, { n: '鹿特丹港務', t: 2 },
    { n: '北方農業區隊', t: 3 }, { n: '烏特勒支鐘樓', t: 2 }, { n: '海牙鸛鳥', t: 3 },
    { n: '恩斯赫德紅火', t: 2 }, { n: '茲沃勒藍浪', t: 4 },
  ],
  EUR_SPR: [
    { n: '布魯日藍運河', t: 1 }, { n: '維也納金鷹', t: 2 }, { n: '哥本哈根北獅', t: 2 },
    { n: '蘇黎世湖畔', t: 3 }, { n: '安特衛普鑽石', t: 1 }, { n: '薩爾茲堡紅牛角', t: 1 },
    { n: '奧胡斯白浪', t: 3 }, { n: '伯恩青年隊', t: 2 }, { n: '列日紅魔', t: 4 },
  ],

  /* T6 五大次級 */
  CHAMP: [
    { n: '默西河鋼鐵', t: 2 }, { n: '南岸海鷗', t: 2 }, { n: '約克白玫瑰', t: 3 },
    { n: '中部工廠隊', t: 3 }, { n: '泰恩河黑白軍', t: 1 }, { n: '布里斯托紅隊', t: 2 },
    { n: '德比郡公羊', t: 3 }, { n: '諾里奇金絲雀', t: 1 }, { n: '普利茅斯綠軍', t: 4 },
  ],
  EU_D2: [
    { n: '魯爾區礦燈', t: 2 }, { n: '加泰海風', t: 2 }, { n: '亞平寧山城', t: 3 },
    { n: '隆河谷紫衫', t: 3 }, { n: '漢薩港紅', t: 1 }, { n: '安達魯西亞白城', t: 2 },
    { n: '威尼托藍鷹', t: 3 }, { n: '諾曼第海鷗', t: 1 }, { n: '巴斯克鐵匠', t: 4 },
  ],

  /* T7 五大聯賽 */
  ENG: [
    { n: '泰晤士紅軍', t: 1 }, { n: '曼徹斯特雨城', t: 1 }, { n: '倫敦北砲', t: 2 },
    { n: '默西河藍調', t: 2 }, { n: '南岸櫻桃紅', t: 3 }, { n: '倫敦西區藍', t: 1 },
    { n: '白鹿巷雄雞', t: 2 }, { n: '伯明罕公園獅', t: 3 }, { n: '東倫敦鐵錘', t: 3 },
    { n: '海濱藍白軍', t: 4 },
  ],
  ESP: [
    { n: '馬德里白衫', t: 1 }, { n: '加泰隆尼亞紅藍', t: 1 }, { n: '巴斯克雄獅', t: 2 },
    { n: '安達魯西亞紅白', t: 3 }, { n: '馬德里紅白床單', t: 1 }, { n: '瓦倫西亞蝙蝠', t: 2 },
    { n: '塞維亞白紅', t: 2 }, { n: '加利西亞藍海', t: 3 }, { n: '馬約卡島隊', t: 4 },
  ],
  GER: [
    { n: '巴伐利亞南星', t: 1 }, { n: '魯爾黃黑牆', t: 1 }, { n: '萊比錫紅牛角', t: 2 },
    { n: '威悉河綠狼', t: 3 }, { n: '美因河雄鷹', t: 2 }, { n: '萊茵區藥廠', t: 1 },
    { n: '斯圖加特白紅', t: 3 }, { n: '柏林藍白熊', t: 3 }, { n: '弗萊堡黑森林', t: 4 },
  ],
  ITA: [
    { n: '亞平寧黑白軍', t: 1 }, { n: '米蘭藍黑星', t: 1 }, { n: '羅馬狼徽', t: 2 },
    { n: '那不勒斯藍天', t: 2 }, { n: '亞得里亞紫百合', t: 3 }, { n: '米蘭紅黑', t: 1 },
    { n: '都靈公牛', t: 3 }, { n: '拉齊奧白藍鷹', t: 2 }, { n: '熱那亞紅藍', t: 4 },
  ],
  FRA: [
    { n: '塞納河王子', t: 1 }, { n: '馬賽藍白浪', t: 2 }, { n: '里昂金獅', t: 2 },
    { n: '布列塔尼紅隊', t: 3 }, { n: '摩納哥紅白', t: 1 }, { n: '里爾北方獵犬', t: 2 },
    { n: '尼斯海鷲', t: 3 }, { n: '朗斯礦工紅金', t: 3 }, { n: '南特金黃', t: 4 },
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
  { until: 25, n: 3, lo: 2, hi: 8,  cost: 1.3, n2: '成長期' },
  { until: 31, n: 2, lo: 1, hi: 6,  cost: 2.0, n2: '巔峰期' },
  { until: 99, n: 1, lo: 1, hi: 5,  cost: 2.6, n2: '維持期' },
];

export const growthPhase = age => GROWTH.find(g => age <= g.until);

/**
 * 體能類能力：25 歲之後成本加倍（練得動但很吃力），33 歲之後完全練不動。
 * 其餘（傳球、視野、站位、射門、頭球、盤帶、防守……）一輩子都還能練 ——
 * 這就是為什麼技術型中場四十歲還能先發，而速度型邊鋒三十出頭就得轉型。
 */
export const PHYSICAL = ['pac', 'sta', 'phy'];

/**
 * 訓練項目：玩家不再直接點能力，而是選「這一季要練什麼」。
 * 每個項目會餵養多個能力（權重 = 每點骰值換算成幾點能力），
 * 所以練射門也會順便長一點速度，練戰術會同時長視野與站位。
 * for: '*' 全體 / 'OUT' 外場 / 'GK' 門將
 */
export const TRAINING = {
  fitness:  { n: '體能訓練',     ab: { sta: 1.00, pac: 0.45 } },
  weights:  { n: '重量訓練',     ab: { phy: 1.00, sta: 0.40 } },
  sprint:   { n: '衝刺訓練',     ab: { pac: 1.00, sta: 0.40 } },
  tactics:  { n: '戰術訓練',     ab: { vis: 1.00, def: 0.20, pas: 0.20 } },
  passing:  { n: '傳球練習',     ab: { pas: 1.00, vis: 0.30, fin: 0.10 } },
  shooting: { n: '射門練習',     ab: { fin: 1.00, pas: 0.30 } },
  setpiece: { n: '罰球練習',   ab: { fin: 0.80, pas: 0.30, hea: 0.30 } },
  marking:  { n: '盯防訓練',   ab: { def: 1.00, phy: 0.40 } },
  aerial:   { n: '空中對抗',     ab: { hea: 1.00, phy: 0.50 } },
  rondo:    { n: '搶圈抓鬼', ab: { pas: 0.80, dri: 0.20, vis: 0.30, def: 0.20 } },
  juggling: { n: '挑球訓練',     ab: { dri: 0.80, fin: 0.20, pas: 0.30, vis: 0.20 } },
  dribble:  { n: '過人練習',   ab: { dri: 1.00, pac: 0.30, fin: 0.10 } },
};

/**
 * 門將的能力組完全不同（體能／撲救／制空／站位／腳下傳球），
 * 所以同名訓練對門將的意義也不一樣 —— 重量訓練練的是制空的爭頂能力，
 * 衝刺訓練練的是門線上的爆發反應。分成兩張表才不會有練不到的權重白白蒸發。
 */
export const TRAINING_GK = {
  fitness:  { n: '體能訓練',   ab: { sta: 1.00 } },
  weights:  { n: '重量訓練',   ab: { aer: 0.80, sta: 0.20 } },
  tactics:  { n: '戰術訓練',   ab: { pos: 0.70, lng: 0.20 } },
  aerial:   { n: '空中對抗',   ab: { aer: 0.70, ref: 0.30 } },
  reflex:   { n: '撲救訓練',   ab: { ref: 1.00, pos: 0.40 } },
  handling: { n: '長傳調度',   ab: { lng: 1.00, pos: 0.20 } },
  shortpass:{ n: '短傳出球',   ab: { sht: 1.00, lng: 0.30 } },
  command:  { n: '制空指揮',   ab: { aer: 1.00, pos: 0.50 } },
};

/** 這名球員該用哪一張訓練表 */
export const trainingTable = group => (group === 'GK' ? TRAINING_GK : TRAINING);

export const TRAINING_ORDER = Object.keys(TRAINING);

/** 這個位置可以選的訓練項目 */
export function trainingFor(group) {
  return Object.keys(trainingTable(group));
}

/**
 * 訓練環境：決定訓練骰數與「練什麼比較有效率」。
 * 足球學校把人練成運動員（體能類 ×1.6），校隊與大學把人練成球員（技術類 ×1.3）——
 * 這是「進足球學校 vs 留校隊」真正的機制差異，不只是骰子多寡。
 * boost 會乘在分配到該類能力的點數上。
 */
export const STAGE_TRAIN = {
  JHS:     { dice: -1, phy: 1.0, tec: 1.0, fixed: [], d: '一週練三次，什麼都碰一點' },
  HS:      { dice: 0,  phy: 0.95, tec: 1.5, fixed: [], d: '課業與球隊兼顧，體能練得少，技術與默契磨得很細；課表自己排' },
  ACADEMY: { dice: 1,  phy: 1.7, tec: 0.8, fixed: ['fitness', 'tactics'], d: '學院有固定課表：體能與戰術是每天的必修，剩下的時間才輪到你自己安排' },
  UNI:     { dice: 0,  phy: 0.9, tec: 1.35, fixed: ['tactics'], d: '對抗強度不足，但戰術課排得很滿' },
  PRO:     { dice: 0,  phy: 1.0, tec: 1.0, fixed: [], d: '' },
};
export const PHYSICAL_HARD_AGE = 26;   // 起，體能類成本 ×1.35
export const PAC_LOCK_AGE = 30;        // 起，速度只能練回上限，不能再突破

/** 天賦上限的範圍。壓窄是為了讓「出生那一刻」不再決定整段生涯 */
export const POT_MIN = 50;
export const POT_MAX = 90;
export const POT_STA_MIN = 60;         // 體能保底：決定你能不能一直踢下去

/**
 * 非均勻衰退表：取年齡符合的最後一段，數值是每年掉的點數（小數會累進到滿 1 才扣）。
 * 技術類也會掉，但幅度差一個量級（速度 2.1／年 vs 視野 0.15／年），
 * 而且要到 38 歲才開始 —— 這是「速度型早退、技術型長青」的機制來源。
 * 實際掉幅還會再乘上體能修正：體能越好衰退越慢。
 */
export const DECLINE = [
  { from: 25, phys: 0.30, tech: 0.05 },
  { from: 29, phys: 0.85, tech: 0.15 },
  { from: 32, phys: 1.30, tech: 0.30 },
  { from: 35, phys: 1.90, tech: 0.50 },
  { from: 38, phys: 2.40, tech: 0.75 },
];

/**
 * 超過天賦上限的部分，每年會被額外拉回這個比例。
 * 這是 B 方案的核心：突破上限不再靠天價成本擋，而是「推得上去、但守不住」——
 * 想長期停在 90，就得年年把掉下來的再練回去。
 */
export const OVER_CAP_PULL = 0.18;

export const TECHNICAL = ['pas', 'vis', 'pos', 'lng', 'sht'];

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
  def: { phy: .20, sta: .20 },   // 防守 → 對抗、體能
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
  pos: { ref: .12, lng: .12 },   // 站位 → 撲救、長傳準確
  lng: { sht: .12, pos: .12 },   // 長傳準確 → 短傳反應、站位
  sht: { ref: .12, lng: .12 },   // 短傳反應 → 撲救、長傳準確
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
    n: '門線清道夫', pos: ['GK'], major: ['lng', 'sht', 'pos'],
    req: p => p.ab.lng >= 65 && p.ab.aer >= 65,
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
  { n: '角球攻防加練', for: 'OUT', gt: '搶到第一點的能力變強了', bt: '空中對抗吃了幾次虧', g: { hea: 2 }, b: { hea: -2 } },
  { n: '撲救反應訓練', for: 'GK', gt: '近距離反應快得嚇人', bt: '重心亂了，撲救變慢', g: { ref: 2 }, b: { ref: -2 } },
  { n: '出擊時機判斷', for: 'GK', gt: '出擊時機抓得精準', bt: '幾次貿然出擊被吊門', g: { aer: 2 }, b: { pos: -2 } },
  { n: '門將長傳訓練', for: 'GK', gt: '一腳長傳直接找到前鋒', bt: '長傳老是找不到人，控球權一直送出去', g: { lng: 2 }, b: { lng: -2 } },
  { n: '後場短傳配合', for: 'GK', gt: '被逼搶時你總能把球傳出去', bt: '禁區內出球被斷，丟了球', g: { sht: 2 }, b: { sht: -2 } },
  { n: '教練戰術改造', for: '*', gt: '新體系裡你變成關鍵齒輪', bt: '完全不適應新的要求', g: { rand: 2 }, b: { rand: -2 } },
  { n: '記者會失言', acts: ['低調道歉', '照原訂行程受訪', '再開一場記者會反擊'], for: 'PRO', cond: s => LV[s.club.lv].tier >= 3, gt: '幽默化解了尖銳提問', bt: '一句話上了頭版，更衣室氣氛僵了', g: { sta: 1 }, b: { rand: -2, sta: -1 } },
  { n: '社群媒體風波', acts: ['關閉留言', '發一則聲明', '直播把話講清楚'], for: 'PRO', cond: s => s.career.fanRep >= 45, gt: '一則貼文圈粉無數', bt: '舊貼文被翻出來炎上', g: { sta: 1 }, b: { rand: -2 } },
  { n: '更衣室內鬨', for: 'PRO', gt: '你出面把話講開了', bt: '被貼上刺頭標籤', g: { vis: 1, sta: 1 }, b: { rand: -2 } },
  { n: '青訓小將挑戰你的位置', for: 'PRO', cond: s => s.player.age >= 26, gt: '你用表現讓他坐回板凳', bt: '訓練賽被完全壓制', g: { rand: 2 }, b: { rand: -2 } },
  { n: '飲食與睡眠管理', for: '*', gt: '體脂下降，回復速度變快', bt: '作息亂掉，整季昏昏沉沉', g: { sta: 2 }, b: { sta: -2, inj: 4 } },
  { n: '客場長征與時差', for: 'PRO', gt: '調整得宜，落地就進入狀況', bt: '整整兩週沒睡好', g: { sta: 1 }, b: { sta: -2, inj: 5 } },
  { n: '老將的一句話', for: '*', gt: '一句話點醒夢中人', bt: '學了不適合自己的東西', g: { rand: 2 }, b: { rand: -2 } },
  { n: '季中低潮', for: '*', gt: '靠自我調整走了出來', bt: '低潮拖了一個月', g: { vis: 1, sta: 1 }, b: { fin: -2, sta: -1 } },
  { n: '語言與新環境', for: 'ABROAD', gt: '你開始用當地語言在場上喊人', bt: '聽不懂戰術會議，訓練賽站錯位', g: { vis: 2, sta: 1 }, b: { vis: -2, sta: -1 } },
  { n: '思鄉', for: 'ABROAD', gt: '把想家的力氣全放到球場上', bt: '整季心不在焉', g: { rand: 2 }, b: { rand: -2, inj: 4 } },
  { n: '當地媒體的檢視', for: 'ABROAD', gt: '一場好球讓報紙改口叫你自己人', bt: '被寫成「便宜的外籍球員」', g: { fin: 1, dri: 1 }, b: { rand: -2 } },

  /* ---------- 街頭足球：養成期與低階聯賽限定 ---------- */
  { n: '在公園踢街球', acts: ['踢半小時就走', '踢到天黑', '跟大人隊尬到底'], for: '*', weight: 1.4,
    cond: s => s.club.stage !== 'PRO' || LV[s.club.lv].tier <= 2,
    gt: '水泥地上沒有裁判也沒有戰術，只有你和球。過人變得像呼吸一樣自然',
    bt: '地面不平，落地時腳踝拐了一下，腫得像麵包',
    g: { dri: 3, fin: 2 }, b: { inj: 12, sta: -2 } },
  { n: '街頭五人制對決', acts: ['打安全球', '正常對抗', '一個人單挑三個'], for: 'OUT', weight: 1.2,
    cond: s => s.club.stage !== 'PRO' || LV[s.club.lv].tier <= 2,
    gt: '場地小到只能把球黏在腳上，出球快了半拍',
    bt: '對面那個大人根本不是來踢球的，你被鏟了一腳',
    g: { dri: 2, pas: 2 }, b: { inj: 10, pac: -1 } },
  { n: '被街頭老手電爆', acts: ['看完就走', '硬著頭皮再上', '單挑到他認輸'], for: '*', weight: 1.0,
    cond: s => s.club.stage !== 'PRO' && s.player.age <= 17,
    gt: '你看懂了他的節奏，最後一球從他胯下穿過去',
    bt: '整個下午你連球都碰不到，回家路上一句話都沒說',
    g: { vis: 2, dri: 2 }, b: { sta: -1, fin: -1 } },

  /* ---------- 第一類：球迷文化 ---------- */
  { n: '球迷幫你寫了 chant', acts: ['假裝沒聽到', '賽後揮手致意', '跟著一起唱'], for: 'PRO', once: true, cond: s => s.club.yearsAtClub >= 2 && s.career.fanRep >= 60,
    gt: '全場一起唱你的名字，你假裝沒聽到，但耳朵是紅的', bt: '那首歌是拿你上週的失誤編的',
    g: { fanRep: 15 }, b: { fanRep: -10, vis: -1 } },
  { n: '看台打出你的 tifo', for: 'PRO', once: true, cond: s => s.career.fanRep >= 75,
    gt: '整個看台攤開一面畫著你的巨幅畫布', bt: 'tifo 上畫的是別人，你在角落',
    g: { fanRep: 10 }, b: { fanRep: -3 } },
  { n: '名字出現在圍巾上', for: 'PRO', cond: s => s.club.yearsAtClub >= 3 && s.career.fanRep >= 70,
    gt: '球場外的攤販開始賣印著你名字的圍巾', bt: '攤販說你的名字太難寫了',
    g: { fanRep: 8 }, b: { fanRep: -2 } },
  { n: '被自家球迷噓下場', acts: ['低頭走進通道', '舉手道歉', '走向看台把話說清楚'], for: 'PRO', cond: s => role(s) <= 1 || lastRating(s) < 6.5,
    gt: '你舉手道歉，看台安靜了下來', bt: '換人時的噓聲蓋過了廣播',
    g: { fanRep: -5 }, b: { fanRep: -20, sta: -1 } },
  { n: '客場全場噓你，你進球了', for: 'PRO', cond: s => s.career.clubHistory?.length > 0,
    gt: '你把手指放在嘴上，全場安靜', bt: '慶祝過頭吃了黃牌',
    g: { fanRep: 20 }, b: { fanRep: 5 } },
  { n: '球衣銷量爆量', acts: ['低調不宣傳', '配合球會行銷', '自己開直播賣'], for: 'PRO', cond: s => s.career.fanRep >= 70,
    gt: '球衣賣到缺貨，分紅入帳', bt: '賣得普通，分紅意思意思',
    g: { fanRep: 5 }, b: {},
    fx: (s, win, api) => { const cut = Math.round(api.salary * (win ? 0.15 : 0.03)); s.career.salaryTotal += cut; api.card('', '球衣分紅', `額外收入 ${cut} 萬。`); } },
  { n: '賽後把球衣丟給看台的小孩', for: 'PRO',
    gt: '那個孩子哭了，照片隔天上了報', bt: '球衣丟到一半被大人搶走，引發混亂',
    g: { fanRep: 6 }, b: { fanRep: -2 } },
  { n: '回到前東家不慶祝', for: 'PRO', cond: s => (s.career.clubHistory || []).length >= 2,
    gt: '你低頭舉手，兩邊看台都給了掌聲', bt: '你忍不住慶祝了，那面看台再也沒原諒你',
    g: { fanRep: 10 }, b: { fanRep: -25 } },
  { n: '訓練基地外等你的球迷', acts: ['揮手後上車', '停下來簽幾張', '簽到最後一個人為止'], for: 'PRO',
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
  { n: '和隊友的伴侶傳出緋聞', acts: ['拒絕說明', '接受媒體採訪', '召開記者會澄清'], for: 'PRO', once: true, weight: 0.4, cond: s => s.player.age >= 22,
    gt: '澄清成功，只是一場誤會', bt: '照片說明不了什麼，但更衣室已經回不去了',
    g: { fanRep: -5 }, b: { fanRep: -30 },
    fx: (s, win, api) => { if (!win) { s.player.traits.captain = false; s._forceMove = true; api.unlock('cancer'); } } },
  { n: '訓練場和隊友打起來', acts: ['當場收手', '把話講開', '誰也不讓'], for: 'PRO', once: true,
    gt: '被視為有種，更衣室反而服你', bt: '被罰款禁賽，標籤撕不掉',
    g: { phy: 2 }, b: { fanRep: -10 },
    fx: (s, win, api) => { if (!win) api.suspend(3); } },
  { n: '夜店被拍到', acts: ['交給公關處理', '自己出面說明', '公開反嗆狗仔'], for: 'PRO', cond: s => s.player.age <= 30,
    gt: '公關處理得宜，新聞隔天就沒了', bt: '凌晨四點的照片配上昨天的比分',
    g: { fanRep: 2 }, b: { sta: -2, fanRep: -12 },
    fx: (s, win, api) => { if (!win) api.fine(0.05); } },
  { n: '賭博成癮', acts: ['找人談、先停手', '限制額度慢慢戒', '一把翻本'], for: 'PRO', once: true, weight: 0.3, cond: s => s.career.salaryTotal >= 1000,
    gt: '你及時收手，沒有人知道', bt: '帳戶見底，你連自己輸了多少都算不出來',
    g: {}, b: { sta: -3 },
    fx: (s, win, api) => { if (!win) { s.career.salaryTotal = Math.round(s.career.salaryTotal * 0.8); api.card('bad', '代價', '生涯薪資 −20%。'); } } },
  { n: '遲到罰款', for: 'PRO',
    gt: '教練笑笑帶過', bt: '這已經是這季第三次了',
    g: {}, b: { fanRep: -3 },
    fx: (s, win, api) => { if (!win) { s.club.minutes = Math.max(0, s.club.minutes - 0.15); api.card('bad', '冷凍', '被冷凍兩個月，本季出場率 −15%。'); } } },
  { n: '和教練公開頂嘴', acts: ['私下溝通', '在會議上表態', '直接嗆回去'], for: 'PRO', cond: s => role(s) <= 2,
    gt: '教練反而欣賞你的火氣，給了你機會', bt: '你被丟進了不會上場的那份名單',
    g: {}, b: {},
    fx: (s, win, api) => { if (win) api.shiftRole(1); else { s.club.minutes = 0.05; api.card('bad', '冷宮，球鞋飛過來', '本季出場率剩下 5%。'); } } },
  { n: '爭主罰點球', acts: ['讓給隊上一號射手', '照排定順序', '搶過球自己罰'], for: 'PRO', cond: atPos('ST', 'AM', 'W'),
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
  { n: '補時絕殺', acts: ['安全球先做保護', '照常起腳', '直接遠射'], for: 'PRO', cond: s => s.club.minutes >= 0.4,
    gt: '球進的瞬間全隊衝向角旗', bt: '你打在門柱上，終場哨響',
    g: { fanRep: 15 }, b: { fin: -1 },
    fx: (s, win) => { if (win) s._bonusGoals = (s._bonusGoals || 0) + 1; } },
  { n: '對死敵的帽子戲法', acts: ['低調處理慶祝', '正常慶祝', '跑到客場看台前慶祝'], for: 'PRO', weight: 0.5, cond: atPos('ST', 'W', 'AM'),
    gt: '德比戰，三球，你的名字被寫進隊史', bt: '德比戰你一次射正都沒有',
    g: { fanRep: 25 }, b: { fanRep: -8 },
    fx: (s, win) => { if (win) { s._bonusGoals = (s._bonusGoals || 0) + 3; s.career.honors.push(`${s.career.year} 德比戰帽子戲法`); } } },
  { n: '烏龍球', acts: ['賽後不談這件事', '受訪時承認失誤', '主動扛下所有責任'], for: 'PRO', cond: atPos('CB', 'FB', 'GK'),
    gt: '賽後隊友一個個過來拍你的頭', bt: '那顆球在慢動作重播裡播了一整週',
    g: { fanRep: -3 }, b: { fanRep: -15, pos: -1 } },
  { n: '慶祝脫球衣吃第二張黃', acts: ['克制住不脫', '照自己的方式慶祝', '脫了再說'], for: 'PRO',
    gt: '值得。那球值得。', bt: '球隊少打一人，最後被扳平',
    g: { fanRep: 10 }, b: { fanRep: -5 },
    fx: (s, win, api) => { if (!win) api.suspend(1); } },
  { n: '假摔被鏡頭抓到', acts: ['當作沒事', '賽後說明是碰到了', '公開否認到底'], for: 'PRO', cond: atPos('W', 'AM', 'ST'),
    gt: '裁判沒看到，事後也沒人追究', bt: '四個角度的重播，你一個都躲不掉',
    g: {}, b: { fanRep: -18 },
    fx: (s, win, api) => { if (!win) api.unlock('diver'); } },
  { n: '點球大戰主動舉手', acts: ['排在第五順位', '排中間順位', '第一個站出來'], for: 'PRO', weight: 0.6,
    gt: '你走上去，罰進了，球隊晉級', bt: '你走上去，然後看著門將撲出來',
    g: { fanRep: 20 }, b: { fanRep: -20, fin: -2 },
    fx: (s, win, api) => { if (win && s.career.counters.clutch++ >= 2) api.unlock('bigmatch'); } },
  { n: '爭議紅牌後炮轟裁判', acts: ['忍住不回應', '賽後訪問點到為止', '社群發文開炮'], for: 'PRO',
    gt: '球迷站在你這邊，罰款你自己付', bt: '協會加重處分',
    g: { fanRep: 12 }, b: {},
    fx: (s, win, api) => { if (win) api.fine(0.02); else api.suspend(4); } },
  { n: '門將上去頂角球', acts: ['留在自家禁區', '壓到中線接應', '直接衝進對方禁區'], for: 'GK', once: true, weight: 0.3,
    gt: '門將進球。整個球場瘋了。', bt: '你還在對方禁區，對面已經射空門了',
    g: { fanRep: 30 }, b: { fanRep: -10 },
    fx: (s, win) => { if (win) s.career.honors.push(`${s.career.year} 門將破門`); } },
  { n: '單場零封＋撲點', acts: ['冷靜受訪', '和後防線一起慶祝', '對著看台振臂大吼'], for: 'GK',
    gt: '你把點球撲了出來，全場零封', bt: '點球進了，零封也沒了',
    g: { fanRep: 12, ref: 1 }, b: { fanRep: -4 } },
  { n: '對方球星在你頭上過人成集錦', for: 'PRO', cond: atPos('CB', 'FB', 'DM'),
    gt: '第二次交手你把他防死了', bt: '那個動作變成了你的 meme',
    g: { def: 2 }, b: { fanRep: -12, def: -1 } },
  { n: '世界波遠射', acts: ['穩穩做球給隊友', '看情況起腳', '三十五碼直接轟'], for: 'PRO',
    gt: '三十五碼，死角，年度最佳進球候選', bt: '三十五碼，飛進了看台第八排',
    g: { fanRep: 15 }, b: { fanRep: -2 } },
  { n: '賽季最後一輪保級生死戰', acts: ['穩守求和', '照計畫踢', '全隊壓上去搏'], for: 'PRO', cond: s => s.club.tier === 4,
    gt: '保級成功，草皮上全是躺著的人', bt: '降級了。更衣室沒有人說話。',
    g: { fanRep: 20, sta: -2 }, b: { fanRep: -10 },
    fx: (s, win) => { if (!win) s._forceMove = true; } },

  /* ---------- 第四類：合約與轉會 ---------- */
  { n: '經紀人未經同意放話', acts: ['私下警告', '公開切割', '當場解約'], for: 'PRO', cond: s => s.player.age >= 23,
    gt: '你公開切割，換掉了經紀人', bt: '你被寫成不忠誠的那個人',
    g: {}, b: { fanRep: -10 },
    fx: (s, win, api) => { if (!win) api.unlock('puppet'); } },
  { n: '拒絕續約被下放二隊', acts: ['先簽短約保住位置', '按兵不動等談判', '硬撐到自由身'], for: 'PRO', cond: s => s.club.yearsAtClub >= 2,
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


  /* ---------- 第七類：命運與機會（觸發率低、影響大） ---------- */
  { n: '巴西足球精靈的指點', for: 'PRO', once: true, weight: 0.138,
    cond: s => LV[s.club.lv].region === 'SAM' || s.player.nation === 'BR',
    acts: ['遠遠看著學', '訓練後留下來請教', '厚著臉皮天天纏著他'],
    gt: '他只說了一句「球要黏在腳上，不是踩在腳下」，然後你花了三個月才懂',
    bt: '他看了你兩眼就走了，你連話都沒說上',
    gpot: { dri: 6, vis: 3 },
    g: { dri: 6, fin: 4, vis: 3, fanRep: 8 }, b: { fanRep: -3 } },
  { n: '德國中場大師的私人課', for: 'PRO', once: true, weight: 0.138,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'DE',
    acts: ['照課表走', '要求加場', '請他從頭教起'],
    gt: '他要你在腦子裡先跑完整場比賽，再用腳把它踢出來',
    bt: '你跟不上他的節奏，兩堂課之後他就沒再約你',
    gpot: { vis: 6, pas: 4 },
    g: { vis: 6, pas: 5, pos: 3, fanRep: 6 }, b: { fanRep: -3 } },
  { n: '阿根廷球王的邀請', for: 'PRO', once: true, weight: 0.121,
    cond: s => LV[s.club.lv].region === 'SAM' || s.player.nation === 'AR' || s.player.natlPick === 'AR',
    acts: ['禮貌婉拒', '接受邀約', '主動要求對位單挑'],
    gt: '他在後院的水泥地上跟你一對一。你一次都沒過掉他，但你懂了什麼叫重心',
    bt: '你太緊張，整晚踢得像個外行',
    gpot: { dri: 7, fin: 3 },
    g: { dri: 7, pac: 3, fin: 3, fanRep: 10 }, b: { fanRep: -5, sta: -2 } },
  { n: '日本三球王的邊路突破', for: 'PRO', once: true, weight: 0.121,
    cond: s => LV[s.club.lv].region === 'ASIA' || ['JP', 'KR', 'TW'].includes(s.player.nation),
    acts: ['先練基本假動作', '一對一實戰練習', '整季只練邊路突破'],
    gt: '「不要看球，看他的重心。」他從邊線切進來的那一步，防守者永遠慢半拍',
    bt: '你把動作學了個形，實戰裡一次都沒過掉人',
    gpot: { dri: 6, fin: 3 },
    g: { dri: 7, fin: 4, pac: 2, fanRep: 8 }, b: { dri: -3, fanRep: -3 } },
  { n: '義大利鏈式防守的傳人', for: 'PRO', once: true, weight: 0.121,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'IT',
    acts: ['看錄影就好', '跟著跑位練習', '整季當他的影子'],
    gt: '他教你的不是怎麼搶球，是怎麼讓對方無球可傳',
    bt: '你學得太表面，反而站錯了好幾次位',
    gpot: { def: 6, pos: 3 },
    g: { def: 6, pos: 4, hea: 3, fanRep: 5 }, b: { def: -2, fanRep: -3 } },
  { n: '義大利小將的門線課', for: 'GK', once: true, weight: 0.165,
    acts: ['觀摩就好', '接受特訓', '要求加倍訓練量'],
    gt: '「不要撲球，等球來找你。」十七歲就先發的人，教你的第一課是耐心',
    bt: '你太急著表現，反而養成了壞習慣',
    gpot: { pos: 6, ref: 4 },
    g: { pos: 6, ref: 5, aer: 3, fanRep: 7 }, b: { ref: -2, fanRep: -3 } },
  { n: '葡萄牙武僧的體能課', for: 'PRO', once: true, weight: 0.121,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'PT',
    acts: ['跟著跑就好', '照他的菜單練', '加倍訓練量'],
    gt: '他四十歲還在跑十二公里。你終於懂了什麼叫做「自律不是天賦」',
    bt: '你照著他的量練，第三週就倒下了',
    gpot: { sta: 6, phy: 3 },
    g: { sta: 6, phy: 4, pac: 2, fanRep: 5 }, b: { sta: -3, inj: 10 } },
  { n: '巴西外星人的門前嗅覺', for: 'PRO', once: true, weight: 0.11,
    cond: s => LV[s.club.lv].region === 'SAM' || s.player.nation === 'BR',
    acts: ['看影片研究', '一對一請教', '整季跟著他練射門'],
    gt: '「不要想怎麼射，想門將會往哪邊倒。」那年你的射正率翻倍',
    bt: '你學了動作，沒學到那半秒的判斷',
    gpot: { fin: 7, pac: 3 },
    g: { fin: 7, pac: 3, dri: 2, fanRep: 8 }, b: { fanRep: -3 } },
  { n: '英國追風少年的加速課', for: 'PRO', once: true, weight: 0.121,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'GB',
    acts: ['做基礎爆發訓練', '跟他對跑', '每天加練衝刺'],
    gt: '他教你的不是跑得快，是第一步怎麼比別人早半拍',
    bt: '你在對跑的第四趟拉傷了大腿',
    gpot: { pac: 7, dri: 3 },
    g: { pac: 7, dri: 3, sta: 2, fanRep: 6 }, b: { pac: -2, inj: 12 } },
  { n: '英國圓月彎刀的傳中課', for: 'PRO', once: true, weight: 0.121,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'GB',
    acts: ['練基本弧線', '每天加練兩百球', '把定位球全接下來'],
    gt: '球在空中拐了一個彎，落在你想要的那平方公尺裡',
    bt: '兩百球下來，腳背腫了，弧線還是沒出來',
    gpot: { pas: 7, fin: 3 },
    g: { pas: 7, fin: 3, vis: 2, fanRep: 6 }, b: { pas: -2, sta: -2 } },
  { n: '埃及法老的內切', for: 'PRO', once: true, weight: 0.121,
    cond: s => LV[s.club.lv].region === 'AFR' || ['NG', 'CI'].includes(s.player.nation),
    acts: ['練慣用腳收球', '練內切起腳', '整季只走同一邊'],
    gt: '從邊路內切、左腳一收，球就往遠角去了。這條路他走了上千次',
    bt: '防守者早就知道你要內切，你被逼到底線',
    gpot: { fin: 6, dri: 4 },
    g: { fin: 7, dri: 5, pac: 2, fanRep: 9 }, b: { dri: -3, fanRep: -3 } },
  { n: '象牙海岸魔獸的對抗課', for: 'PRO', once: true, weight: 0.121,
    cond: s => LV[s.club.lv].region === 'AFR' || ['NG', 'CI'].includes(s.player.nation),
    acts: ['先練核心', '跟他做對抗', '直接要求肉搏對練'],
    gt: '「背身的時候，你要讓對方覺得他在推一面牆。」',
    bt: '你被他撞飛了三次，肋骨痛了一個月',
    gpot: { phy: 7, hea: 3 },
    g: { phy: 7, hea: 4, fin: 2, fanRep: 7 }, b: { phy: -2, inj: 12 } },
  { n: '荷蘭冰王子的冷靜', for: 'PRO', once: true, weight: 0.11,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'NL',
    acts: ['聽他講就好', '模擬單刀練習', '要求高壓情境特訓'],
    gt: '「單刀的時候，時間是你的，不是門將的。」你的心跳從此慢了下來',
    bt: '你太在意技巧，反而更緊張了',
    gpot: { fin: 6, vis: 3 },
    g: { fin: 6, vis: 4, pos: 2, fanRep: 6 }, b: { fin: -3 } },
  { n: '飛翔的荷蘭人的凌空', for: 'PRO', once: true, weight: 0.11,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'NL',
    acts: ['練基本停球', '練凌空抽射', '在比賽裡直接試'],
    gt: '球還在空中，他已經知道自己要往哪裡倒。那一球飛了二十年',
    bt: '你在正式比賽試了凌空，球飛到了看台',
    gpot: { fin: 6, vis: 3 },
    g: { fin: 7, vis: 4, hea: 2, fanRep: 8 }, b: { fin: -3, fanRep: -4 } },
  { n: '台灣魔獸的重訓菜單', for: 'PRO', once: true, weight: 0.138,
    cond: s => s.player.nation === 'TW' || s.player.natlPick === 'TW',
    acts: ['照一般課表', '跟著他的量', '再加一倍'],
    gt: '在資源最少的地方，他用重訓房把自己練成了另一種球員',
    bt: '你練壞了肩膀',
    gpot: { phy: 6, sta: 3 },
    g: { phy: 6, sta: 4, hea: 2, fanRep: 8 }, b: { phy: -2, inj: 10 } },
  { n: '土耳其火槍兵的遠射', for: 'PRO', once: true, weight: 0.11,
    cond: s => LV[s.club.lv].region === 'EUR',
    acts: ['先練腳背觸球', '每天五十球', '比賽裡直接開火'],
    gt: '三十碼外，球在他腳下像被點燃一樣',
    bt: '你射了十七次，十六次飛出球場',
    gpot: { fin: 6, phy: 3 },
    g: { fin: 6, phy: 3, pac: 2, fanRep: 7 }, b: { fin: -3, fanRep: -4 } },
  { n: '台灣隊長的更衣室課', for: 'PRO', once: true, weight: 0.138,
    cond: s => s.player.nation === 'TW' || s.player.natlPick === 'TW',
    acts: ['安靜觀察', '學著開口', '主動接下責任'],
    gt: '「在這裡當隊長，要先讓大家相信這件事值得做。」',
    bt: '你想學他，但沒有人聽你的',
    gpot: { vis: 5, pas: 3 },
    g: { vis: 5, pas: 3, sta: 2, fanRep: 12 }, b: { fanRep: -8 },
    fx: (s, win, api) => { if (win && s.player.age >= 24) api.unlock('captain'); } },
  { n: '阿根廷風之子的節奏', for: 'PRO', once: true, weight: 0.11,
    cond: s => LV[s.club.lv].region === 'SAM' || s.player.nation === 'AR',
    acts: ['練變速跑', '跟著他帶球', '在對抗中硬過'],
    gt: '他不是跑得比較快，是他知道什麼時候該慢下來',
    bt: '你只學會了快，沒學會慢',
    gpot: { dri: 6, pac: 3 },
    g: { dri: 6, pac: 4, vis: 2, fanRep: 7 }, b: { dri: -2 } },
  { n: '韓國三肺的跑動課', for: 'PRO', once: true, weight: 0.121,
    cond: s => LV[s.club.lv].region === 'ASIA' || s.player.nation === 'KR',
    acts: ['照隊上的量', '跟著他跑滿全場', '賽後再加練'],
    gt: '別人跑十公里，他跑十三公里，而且第九十分鐘還在衝',
    bt: '你跟了兩個月，然後過度訓練',
    gpot: { sta: 7, def: 3 },
    g: { sta: 7, def: 3, pac: 2, fanRep: 6 }, b: { sta: -4, inj: 10 } },
  { n: '德國獅王的指揮', for: 'GK', once: true, weight: 0.154,
    acts: ['觀摩站位', '接受指揮訓練', '整季由你喊防線'],
    gt: '「門將不是最後一道防線，是第一個發動的人。」',
    bt: '你喊錯了兩次，後衛開始不聽你的',
    gpot: { pos: 6, aer: 4 },
    g: { pos: 6, aer: 4, lng: 3, fanRep: 8 }, b: { pos: -3, fanRep: -5 } },
  { n: '法國槍王的跑位', for: 'PRO', once: true, weight: 0.11,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'FR',
    acts: ['看錄影學跑位', '跟著練無球移動', '整季照他的方式跑'],
    gt: '他在越位線上待了九十分鐘，然後只用了一次就贏下比賽',
    bt: '你越位了十一次',
    gpot: { fin: 6, vis: 3 },
    g: { fin: 6, vis: 4, pac: 2, fanRep: 7 }, b: { fin: -2, fanRep: -4 } },
  { n: '法國忍者龜的第一步', for: 'PRO', once: true, weight: 0.11,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'FR',
    acts: ['練起步姿勢', '跟他對跑', '直接在對抗中衝'],
    gt: '他的前十公尺沒有人跟得上，而且到了門前還能冷靜收腳',
    bt: '你跟著衝了三次，三次都被追上，還拉傷了',
    gpot: { pac: 7, fin: 4 },
    g: { pac: 7, fin: 5, dri: 2, fanRep: 8 }, b: { pac: -2, inj: 10 } },
  { n: '西班牙小白的第一腳觸球', for: 'PRO', once: true, weight: 0.11,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'ES',
    acts: ['練停球', '練接球轉身', '在逼搶中練'],
    gt: '「第一腳決定了下一腳。」他接球的方向永遠已經是出球的方向',
    bt: '你在逼搶中丟了太多球，信心掉了',
    gpot: { pas: 6, vis: 4 },
    g: { pas: 6, vis: 4, dri: 3, fanRep: 7 }, b: { pas: -3, fanRep: -3 } },
  { n: '葡萄牙山羊的自我要求', for: 'PRO', once: true, weight: 0.099,
    cond: s => LV[s.club.lv].region === 'EUR' || s.player.nation === 'PT',
    acts: ['跟著練', '照他的作息過一季', '把整個生活方式換掉'],
    gt: '他的訓練沒有什麼祕密，只是每一天都做到最後一組',
    bt: '你撐了三個月，然後回到原本的作息',
    gpot: { fin: 5, sta: 4, phy: 3 },
    g: { fin: 5, phy: 4, sta: 4, pac: 2, fanRep: 12 }, b: { sta: -3, fanRep: -5 } },

  { n: '伴侶與隊友的背叛', for: 'PRO', once: true, weight: 0.18,
    cond: s => s.player.age >= 24 && s.career.fanRep >= 40,
    acts: ['自己一個人消化', '找心理師談', '衝進更衣室理論'],
    gt: '你把自己關在健身房三個月。回來的時候，眼神不一樣了',
    bt: '你整季都在狀況外，訓練場上像個影子',
    g: { phy: 4, sta: 3, fanRep: -5 },
    b: { vis: -7, pas: -5, sta: -5, fanRep: -18 },
    fx: (s, win, api) => { if (!win) { s.player.traits.captain = false; api.card('bad', '一蹶不振', '那一年的比賽你幾乎沒有記憶。'); } } },
  { n: '父親在看台上倒下', for: 'PRO', once: true, weight: 0.15,
    cond: s => s.player.age >= 22,
    acts: ['請假回家', '踢完這場再說', '把這場獻給他'],
    gt: '他在病房裡看完了你的進球集錦。那一季你為兩個人在踢',
    bt: '你在醫院走廊裡聽到終場比分。那年你再也沒有進過球',
    g: { fin: 4, vis: 3, fanRep: 15 }, b: { fin: -6, sta: -4, fanRep: -6 } },
  { n: '車禍', for: '*', once: true, weight: 0.12,
    acts: ['保守治療', '照醫囑復健', '搶著提前歸隊'],
    gt: '所有人都說你回不來了，但你八個月後站上了草皮',
    bt: '骨頭接回去了，速度沒有',
    g: { fanRep: 20, sta: -3 }, b: { pac: -12, sta: -6, fanRep: 5 },
    fx: (s, win) => { if (!win) { s.player.injury.seasonFactor = 0; s.player.injury.bigCount++; } } },
  { n: '被指控假球', for: 'PRO', once: true, weight: 0.14,
    cond: s => s.player.age >= 25,
    acts: ['沉默等調查', '公開自清', '反告到底'],
    gt: '調查還你清白，那些替你說話的球迷你記了一輩子',
    bt: '證據不足，但名聲已經回不去了',
    g: { fanRep: 18, vis: 2 }, b: { fanRep: -35 },
    fx: (s, win, api) => { if (!win) { s._forceMove = true; api.suspend(6); } } },
  { n: '恩師過世', for: 'PRO', once: true, weight: 0.16,
    cond: s => s.player.age >= 26,
    acts: ['低調出席告別式', '賽後脫衣致敬', '把整季獻給他'],
    gt: '你在他的墓前說要拿下這座冠軍，然後你真的做到了一半',
    bt: '你整整兩個月沒辦法好好睡覺',
    g: { vis: 4, pos: 3, fanRep: 12 }, b: { sta: -5, fanRep: -4 } },
  { n: '一夕爆紅的那一球', for: 'PRO', once: true, weight: 0.2,
    cond: s => s.club.minutes >= 0.5 && s.career.fanRep >= 50,
    acts: ['低調面對', '接受專訪', '簽下代言合約'],
    gt: '那顆球在全世界播了一個月。你的人生從那天起分成兩半',
    bt: '熱度三天就過了，但期待留了下來',
    g: { fanRep: 30, fin: 2 }, b: { fanRep: -8 },
    fx: (s, win, api) => { if (win) { const b = Math.round(api.salary * 0.4); s.career.salaryTotal += b; api.card('good', '代言合約', `額外收入 ${b} 萬。`); } } },
  { n: '青訓教練的一句話', for: '*', once: true, weight: 0.25,
    cond: s => s.player.age <= 17,
    acts: ['聽聽就算', '認真想了一晚', '照他說的重練一遍'],
    gt: '「你不是最有天分的那個，但你可以是最麻煩的那個。」這句話你記了二十年',
    bt: '他說你不適合踢球。你信了三年',
    g: { sta: 4, def: 3, phy: 3 }, b: { sta: -3, fin: -3 } },
  { n: '整支球隊欠薪', for: 'PRO', once: true, weight: 0.15,
    cond: s => s.club.tier >= 3,
    acts: ['自己先撐著', '帶頭跟球會談', '直接罷訓'],
    gt: '你墊錢請全隊吃飯，那支球隊後來把你的名字掛在球場入口',
    bt: '半年沒領薪水，你什麼都練不下去',
    g: { fanRep: 22, sta: -2 }, b: { sta: -4, fanRep: -5 },
    fx: (s, win) => { if (!win) { s.career.salaryTotal = Math.max(0, s.career.salaryTotal - Math.round(s.career.salaryTotal * 0.08)); s._forceMove = true; } } },

  /* ---------- 第八類：低階聯賽與客場的現實 ---------- */
  { n: '聯賽整體欠薪', for: 'PRO', weight: 0.9,
    cond: s => LV[s.club.lv].tier <= 3,
    acts: ['先自己撐著', '跟球會攤牌', '聯合全隊罷訓'],
    gt: '你跑去兼了兩份差，但每天還是準時出現在訓練場',
    bt: '三個月沒領到錢，房租繳不出來，訓練根本專心不了',
    g: { sta: -1, fanRep: 8 }, b: { sta: -4, fanRep: -3, inj: 5 },
    fx: (s, win, api) => {
      if (!win) {
        const lost = Math.round(api.salary * 0.25);
        s.career.salaryTotal = Math.max(0, s.career.salaryTotal - lost);
        api.card('bad', '薪水追不回來', `這一季有 ${lost} 萬拿不到了。`);
      }
    } },
  { n: '球會發不出裝備', for: 'PRO', weight: 0.8,
    cond: s => LV[s.club.lv].tier <= 2,
    acts: ['穿舊的繼續踢', '自掏腰包買', '找地方贊助'],
    gt: '你自己找了一家在地的鞋店掛名，全隊都有新鞋穿',
    bt: '整季穿著磨平的鞋底比賽，滑倒了無數次',
    g: { fanRep: 10 }, b: { inj: 8, pac: -1 } },
  { n: '訓練場地坑坑疤疤', for: 'PRO', weight: 0.9,
    cond: s => LV[s.club.lv].tier <= 3 || s.club.tier >= 4,
    acts: ['避開爛的那半邊', '照常全速訓練', '要求球會整修'],
    gt: '你學會了在爛草皮上控球，回到好場地反而覺得球聽話得不得了',
    bt: '腳踩進一個坑，腳踝當場腫起來',
    g: { dri: 2, sta: 1 }, b: { inj: 18, sta: -2 },
    fx: (s, win) => { if (!win) s.player.injury.restNext = 1; } },
  { n: '客場更衣室沒有熱水', for: 'PRO', weight: 0.8,
    cond: s => LV[s.club.lv].tier <= 4,
    acts: ['直接穿衣服上車', '沖冷水', '在停車場等隊醫處理'],
    gt: '全隊笑成一團，那趟客場後大家反而更緊',
    bt: '回程車上你就開始發燒',
    g: { fanRep: 5, sta: 1 }, b: { sta: -3, inj: 10 } },

  { n: '代表隊集訓住宿條件很差', for: 'PRO', weight: 0.7,
    cond: s => s.career.caps > 0,
    acts: ['自己買水', '照常吃住', '向協會反映'],
    gt: '你自己扛了兩箱礦泉水進房間，隊友後來都跟著做',
    bt: '洗澡水是黃的，第三天全隊有一半人腹瀉',
    g: { sta: 1, fanRep: 5 }, b: { sta: -5, inj: 14 },
    fx: (s, win) => { if (!win) s.player.injury.seasonFactor *= 0.9; } },
  { n: '代表隊的長途轉機', for: 'PRO', weight: 0.7,
    cond: s => s.career.caps > 0,
    acts: ['機上盡量睡', '照常作息', '落地直接加練'],
    gt: '三十小時的航程之後你還是先發，而且踢滿九十分鐘',
    bt: '落地那天腿是腫的，比賽像在夢裡踢',
    g: { sta: 2, fanRep: 4 }, b: { sta: -4, inj: 8 } },
  { n: '行李在機場被偷', for: 'PRO', weight: 0.6,
    acts: ['借隊友的裝備', '重新買一套', '報警追到底'],
    gt: '球鞋沒了，但你穿著借來的鞋踢進了那一球',
    bt: '護具和慣用的鞋全沒了，整整一個月找不回手感',
    g: { fanRep: 6 }, b: { fin: -2, dri: -2, fanRep: -2 },
    fx: (s, win, api) => { if (!win) api.fine(0.02); } },
  { n: '球場周邊發生槍擊', for: 'PRO', weight: 0.5,
    cond: s => LV[s.club.lv].tier <= 4,
    acts: ['留在更衣室等疏散', '幫忙引導球迷', '衝出去找家人'],
    gt: '你把二十個孩子帶進更衣室關上門。那天沒有人受傷',
    bt: '你在人群裡被推倒，肋骨裂了兩根',
    g: { fanRep: 25 }, b: { inj: 20, sta: -3, fanRep: 5 },
    fx: (s, win) => { if (!win) { s.player.injury.seasonFactor *= 0.7; s.player.injury.restNext = 1; } } },
  { n: '球迷在停車場堵你', for: 'PRO', weight: 0.6,
    cond: s => s.career.fanRep <= 45,
    acts: ['請保全處理', '下車跟他們談', '硬闖出去'],
    gt: '你下車聽他們罵了二十分鐘，然後他們替你開了路',
    bt: '車窗被砸破，你在車裡等了兩個小時',
    g: { fanRep: 14 }, b: { fanRep: -8, sta: -2 } },
  { n: '簽證卡關', for: 'ABROAD', weight: 0.7,
    acts: ['等官方流程', '請球會加急', '自己飛回去辦'],
    gt: '球會的行政幫你三天內辦好，你趕上了季前熱身賽',
    bt: '你在自己國家多待了五週，回去時位置已經沒了',
    g: { fanRep: 3 }, b: { sta: -2 },
    fx: (s, win, api) => { if (!win) api.shiftRole(-1); } },

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
  gaffer:   { n: '名帥',       tone: 'gold', fx: '掛靴後成功轉任教練，以另一種方式留在場邊' },
  glass:    { n: '玻璃人',     tone: 'bad',  fx: '受傷機率下限 40%' },
  benched:  { n: '板凳生涯',   tone: 'bad',  fx: '能力成長停滯，季初擲骰 −1 顆',
              cure: '連兩季站穩主力以上' },
  cancer:   { n: '更衣室毒瘤', tone: 'bad',  fx: '轉會機率大增、續約條件惡化',
              cure: '連兩季評分 ≥7.2 並換一支球隊' },
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
  baseInjury: 9,
  eventCards: 3,
  aclCap: 120,
  abilScale: 1.35,   // 事件卡與衰退的能力增減換算到 1–99 尺度
  jhsYears: 3,
  hsYears: 3,
  uniYears: 4,
  fanRepStart: 50,
  fanRepOnMove: 55,   // 轉隊後新東家重新認識你
  fanRepLegend: 80,   // 離隊時達到這個聲望，這座球場永遠記得你
};
