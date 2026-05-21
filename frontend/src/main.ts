import { configureAuthSideEffects } from "@/auth/sideEffects";
import { useNotificationStore } from "@/stores/notification";
import { createHead } from "@vueuse/head";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import "highlight.js/styles/atom-one-dark.css";
import { createPinia, setActivePinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import "./assets/base.css";
import "./assets/squircle.css";
import "./lib/echarts";
import { initVisitorWebSocket } from "./plugins/visitorWs";
import router from "./router";

// Apply persisted color scheme before mount to avoid flash of wrong colors
if (typeof document !== "undefined") {
  const savedScheme = localStorage.getItem("color-scheme") || "sky-blue";
  document.documentElement.setAttribute("data-color-scheme", savedScheme);
}

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");
const app = createApp(App);
const pinia = createPinia();
const head = createHead();

setActivePinia(pinia);
const notifier = useNotificationStore(pinia);
configureAuthSideEffects({
  notifySuccess: (message: string) => {
    notifier.success(message);
  },
  notifyError: (message: string) => {
    notifier.error(message);
  },
  navigateToHome: async () => await router.push("/"),
});

app.use(pinia);
app.use(router);
app.use(head);

if (typeof window !== "undefined") {
  initVisitorWebSocket(pinia);
}

app.mount("#app");
