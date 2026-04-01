import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
    server: {
    port: 5174, // 避免与 Vue 项目冲突
    proxy: {
      '/api/v1/': {
        target: 'http://localhost:5555',
        changeOrigin: true,
      },
    },
  },
})
