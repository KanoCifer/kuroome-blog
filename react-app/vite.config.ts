import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    minify: 'oxc',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // ✅ 代码高亮
          if (id.includes('highlight.js') || id.includes('lowlight')) {
            return 'syntax-highlight';
          }

          // ✅ 动画
          if (id.includes('lottie-web')) {
            return 'lottie';
          }
          if (id.includes('lottie-react')) {
            return 'lottie';
          }

          // ✅ React 生态
          if (id.includes('react-router')) return 'router';
          if (
            id.includes('zustand') ||
            id.includes('redux') ||
            id.includes('jotai')
          )
            return 'state';
          if (id.includes('node_modules/react/')) return 'react';
          if (id.includes('node_modules/react-dom/')) return 'react-dom';

          // ✅ 工具库
          if (
            id.includes('axios') ||
            id.includes('ky') ||
            id.includes('ofetch')
          )
            return 'http';
          if (
            id.includes('dayjs') ||
            id.includes('date-fns') ||
            id.includes('moment')
          )
            return 'date';
        },
      },
      // 忽略 lottie-web 的 eval 警告
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
  server: {
    port: 5174, // 避免与 Vue 项目冲突
    proxy: {
      '/api/v1/': {
        target: 'http://localhost:5555',
        changeOrigin: true,
      },
    },
  },
});
