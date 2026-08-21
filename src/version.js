/**
 * 顯示用的版號。**改動時要和 package.json 的 version 一起改** ——
 * 這裡沒有 import package.json，是為了保住「不安裝任何東西、python3 -m http.server
 * 直接開就能玩」那條路（瀏覽器原生不吃沒有 import assertion 的 JSON module）。
 */
export const VERSION = '0.14.0';
