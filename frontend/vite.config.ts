import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools({
      componentInspector: true,
      launchEditor: 'zed',
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    minify: 'oxc',
    cssMinify: true,
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true, // 删除 console
        drop_debugger: true,
      },
    },
    // 只在非 SSG 构建时使用 manualChunks
    rollupOptions: process.env.SSG_BUILD
      ? {}
      : {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;

              // ✅ 富文本（最大优先级）
              if (id.includes('@tiptap')) {
                return 'tiptap';
              }

              // ✅ 代码高亮
              if (id.includes('highlight.js')) {
                return 'syntax-highlight';
              }

              // ✅ 动画
              if (id.includes('lottie-web')) {
                return 'lottie';
              }

              // ✅ Vue 生态（注意顺序！）
              if (id.includes('vue-router')) return 'router';
              if (id.includes('pinia')) return 'store';
              if (id.includes('node_modules/vue/')) return 'vue';

              // ✅ 工具库
              if (id.includes('axios')) return 'axios';
              if (id.includes('dayjs')) return 'dayjs';
            },
          },
          // 忽略lottie-web的eval警告（第三方库问题，无法修复）
          onwarn(warning, warn) {
            if (
              warning.code === 'EVAL' &&
              warning.id?.includes('node_modules/lottie-web')
            ) {
              return;
            }
            warn(warning);
          },
        },
  },
  optimizeDeps: {
    include: ['vue3-lottie'],
  },
  server: {
    port: 5173,
    proxy: {
      // Python 后端（FastAPI）— v1 / v2 接口
      '/v1/': {
        target: 'http://localhost:5555',
        changeOrigin: true,
        ws: true,
      },
      '/v2/': {
        target: 'http://localhost:5555',
        changeOrigin: true,
        ws: true,
      },
      // Go 后端 — v3 接口
      '/v3/': {
        target: 'http://localhost:5556',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
