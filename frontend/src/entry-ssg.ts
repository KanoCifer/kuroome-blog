import { createHead } from "@vueuse/head";
import { createPinia } from "pinia";
import { createApp as createVueApp } from "vue";
import App from "./App.vue";
import router from "./router";

import "./assets/main.css";
import "element-plus/dist/index.css";

// 导出一个函数来创建应用实例（vite-ssg 要求）
export function createApp() {
  const app = createVueApp(App);
  const pinia = createPinia();
  const head = createHead();

  // 使用插件
  app.use(pinia);
  app.use(router);
  app.use(head);

  return { app, router };
}
