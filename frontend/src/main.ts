import { createHead } from "@vueuse/head";
import "highlight.js/styles/atom-one-dark.css";
import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import "./assets/main.css";

import Vue3Lottie from "vue3-lottie";

const app = createApp(App);
const pinia = createPinia();
const head = createHead();

app.use(pinia);
app.use(router);
app.use(head);

// register Lottie plugin globally (helps avoid dynamic import errors)
app.use(Vue3Lottie);

app.mount("#app");
