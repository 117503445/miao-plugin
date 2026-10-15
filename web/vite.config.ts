import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

/** 将上游机器人运行环境替换为静态网页所需的只读接口。 */
export default defineConfig({
  resolve: { alias: [
    { find: '#miao.models', replacement: fileURLToPath(new URL('./src/upstream-models.ts', import.meta.url)) },
    { find: '#miao', replacement: fileURLToPath(new URL('./src/upstream-bridge.ts', import.meta.url)) },
    { find: 'lodash', replacement: fileURLToPath(new URL('./node_modules/lodash/lodash.js', import.meta.url)) }
  ] },
  server: { fs: { allow: ['..'] } },
  build: { outDir: 'dist', emptyOutDir: true }
})
