import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { readFileSync } from 'fs'

// 从 package.json 读取版本号
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    target: 'es2015'
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // 优先读 package.json 的 build-type 字段，也可被 --mode 覆盖
    __BUILD_TYPE__: JSON.stringify(pkg['build-type'])
  },
  resolve: {
    alias: {
      // 核心：@ 指向 src 文件夹
      '@': path.resolve(__dirname, 'src')
    }
  }
})