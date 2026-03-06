import { createHead } from "@vueuse/head";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import "highlight.js/styles/atom-one-dark.css";
import { createPinia } from "pinia";
import { createApp } from "vue";
import Vue3Lottie from "vue3-lottie";
import App from "./App.vue";
import "./assets/main.css";
import "./assets/squircle.css";
import { fetchAndStoreCSRF } from "./request";
import router from "./router";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");
const app = createApp(App);
const pinia = createPinia();
const head = createHead();

app.use(pinia);
app.use(router);
app.use(head);
app.use(Vue3Lottie);

async function bootstrap() {
  await fetchAndStoreCSRF();
  app.mount("#app");
}

void bootstrap();
