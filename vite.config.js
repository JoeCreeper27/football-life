import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 開發時是分模組的，建置後 inline 成單一 HTML —
// 保留原作「丟一個檔案就能部署」的優勢。
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { assetsInlineLimit: 100000000, cssCodeSplit: false, target: 'es2020' },
});
