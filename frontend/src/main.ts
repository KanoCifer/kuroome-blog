import { createHead } from '@vueuse/head';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'highlight.js/styles/atom-one-dark.css';
import { createPinia, setActivePinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { isColorScheme } from '@/stores/theme';
import './assets/base.css'; // Tailwind v4 入口
import './assets/backgrounds.css'; // 背景渐变
import './assets/base.scss'; // font-face sass
import './assets/squircle.css';
import './lib/echarts';
import { initVisitorWebSocket } from './plugins/visitorWs';
import router from './router';

// Apply persisted color scheme before mount to avoid flash of wrong colors
if (typeof document !== 'undefined') {
  const saved = localStorage.getItem('color-scheme');
  const scheme = isColorScheme(saved) ? saved : 'paper';
  if (!isColorScheme(saved)) {
    localStorage.setItem('color-scheme', scheme);
  }
  document.documentElement.setAttribute('data-color-scheme', scheme);
}

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');
const app = createApp(App);
const pinia = createPinia();
const head = createHead();

setActivePinia(pinia);

app.use(pinia);
app.use(router);
app.use(head);

if (typeof window !== 'undefined') {
  initVisitorWebSocket(pinia);
}

app.mount('#app');
