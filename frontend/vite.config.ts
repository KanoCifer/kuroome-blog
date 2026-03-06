import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools({
      launchEditor: "code", // 可选：指定编辑器，默认为 "code"（VS Code）
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // css in js
        }),
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    // 只在非 SSG 构建时使用 manualChunks
    rollupOptions: process.env.SSG_BUILD
      ? {}
      : {
          output: {
            manualChunks: {
              // Core Vue ecosystem
              "vue-core": ["vue", "vue-router", "pinia"],
              // Tiptap editor and extensions (heavy chunk)
              tiptap: [
                "@tiptap/vue-3",
                "@tiptap/starter-kit",
                "@tiptap/extension-code-block-lowlight",
                "@tiptap/extension-image",
                "@tiptap/extension-link",
                "@tiptap/extension-placeholder",
                "@tiptap/extension-text-align",
                "@tiptap/extension-underline",
              ],
              // Syntax highlighting
              "syntax-highlight": ["lowlight", "highlight.js"],
              // HTTP client
              axios: ["axios"],
              // Date utilities
              dayjs: ["dayjs"],
            },
          },
        },
  },
  optimizeDeps: {
    include: ["vue3-lottie"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api/v1/": {
        target: "http://localhost:5555", // FastApi 后端地址
        changeOrigin: true,
      },
      // 1. 代理 API 文档的静态页面
      "/Docs": {
        target: "http://localhost:5555", // 你的 FastAPI 地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/Docs/, "/docs"), // 注意大小写，FastAPI 默认是小写的 /docs
      },
      // 2. **关键步骤**：必须代理 OpenAPI 的 schema 文件 (openapi.json)
      // 因为 Swagger UI 页面会去请求这个 JSON 文件来渲染内容
      "/openapi.json": {
        target: "http://localhost:5555",
        changeOrigin: true,
      },
    },
  },
});
