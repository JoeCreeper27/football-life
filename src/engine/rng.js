/**
 * 種子化亂數。所有遊戲隨機都必須走這裡，
 * 這樣「同種子 + 同選擇 = 同一段人生」才成立。
 * 動畫、粒子等純視覺效果請直接用 Math.random()，不要污染這條序列。
 */
export class Rng {
  /** @param {string} seed @param {number} [cursor] 從存檔還原時傳入 */
  constructor(seed, cursor = 0) {
    this.seed = seed;
    this.cursor = 0;
    this._s = 1779033703;
    for (let i = 0; i < seed.length; i++) {
      this._s = Math.imul(this._s ^ seed.charCodeAt(i), 3432918353);
      this._s = (this._s << 13) | (this._s >>> 19);
    }
    // 還原存檔：把序列快轉到當時的位置
    for (let i = 0; i < cursor; i++) this.next();
  }

  /** [0,1) */
  next() {
    this.cursor++;
    this._s |= 0;
    this._s = (this._s + 0x6d2b79f5) | 0;
    let t = Math.imul(this._s ^ (this._s >>> 15), 1 | this._s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** 整數 [a,b] */
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  /** 百分比命中 */
  chance(p) { return this.next() * 100 < p; }
  /** 近似常態，平均 0、標準差 sd */
  gauss(sd) { return ((this.next() + this.next() + this.next() + this.next() - 2) / 2) * sd * 2; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const randomSeed = () => Math.random().toString(36).slice(2, 10);
