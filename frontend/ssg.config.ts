import { defineConfig } from 'vite-ssg'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  entry: 'src/entry-ssg.ts',
  ssr: true,
  target: 'static',
  base: '/',
  assetsDir: 'assets',
  outDir: 'dist',
  index: 'index.html',
  publicDir: 'public',
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
  buildOptions: {
    chunkSizeWarningLimit: 600,
  },
  plugins: [vue(), vueDevTools()],
  server: {
    port: 5174,
  },
  css: {
    devSourcemap: false,
  },
  ssgOptions: {
    format: 'cjs',
    mode: 'build',
    noExternal: [/^element-plus/],
  },
})