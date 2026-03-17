import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
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
            manualChunks: (id) => {
              // Highlight.js and lowlight are shared utilities
              if (
                id.includes("node_modules/highlight.js") ||
                id.includes("node_modules/lowlight")
              ) {
                return "syntax-highlight";
              }
              // Tiptap core and extensions
              if (id.includes("node_modules/@tiptap")) {
                return "tiptap";
              }
              // Core Vue ecosystem
              if (
                id.includes("node_modules/vue") ||
                id.includes("node_modules/vue-router") ||
                id.includes("node_modules/pinia")
              ) {
                return "vue-core";
              }
              // Other common heavy utilities
              if (id.includes("node_modules/axios")) return "axios";
              if (id.includes("node_modules/dayjs")) return "dayjs";
              // Lottie animation library
              if (id.includes("node_modules/lottie-web")) return "lottie-web";
            },
          },
          // 忽略lottie-web的eval警告（第三方库问题，无法修复）
          onwarn(warning, warn) {
            if (
              warning.code === "EVAL" &&
              warning.id?.includes("node_modules/lottie-web")
            ) {
              return;
            }
            warn(warning);
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
