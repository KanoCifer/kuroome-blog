import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
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
      // 移除 appendTo 以使用插件默认的脚本注入方式，便于排查显示问题
      componentInspector: true,
      launchEditor: "code",
    }),
    tailwindcss(),
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
    minify: "oxc",
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
              if (!id.includes("node_modules")) return;

              // ✅ 富文本（最大优先级）
              if (id.includes("@tiptap")) {
                return "tiptap";
              }

              // ✅ 代码高亮
              if (id.includes("highlight.js") || id.includes("lowlight")) {
                return "syntax-highlight";
              }

              // ✅ 动画
              if (id.includes("lottie-web")) {
                return "lottie";
              }

              // ✅ Vue 生态（注意顺序！）
              if (id.includes("vue-router")) return "router";
              if (id.includes("pinia")) return "store";
              if (id.includes("node_modules/vue/")) return "vue";

              // ✅ 工具库
              if (id.includes("axios")) return "axios";
              if (id.includes("dayjs")) return "dayjs";
            },
          },
          // 忽略lottie-web的eval警告（第三方库问题，无法修复）
          onwarn(warning, warn) {
            if (warning.code === "EVAL" && warning.id?.includes("node_modules/lottie-web")) {
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
      "/api/": {
        target: "http://localhost:5555", // FastApi 后端地址
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
