import { useHead, createHead } from "@vueuse/head";
import { defineStore, createPinia } from "pinia";
import { defineComponent, ref, onMounted, onUnmounted, mergeProps, useSSRContext, watch, computed, unref, createVNode, resolveDynamicComponent, withCtx, openBlock, createBlock, createTextVNode, reactive, resolveComponent, Transition, KeepAlive, createApp } from "vue";
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderClass, ssrInterpolate, ssrRenderList, ssrRenderVNode, ssrRenderComponent, ssrIncludeBooleanAttr, ssrLooseContain, ssrRenderStyle, ssrRenderTeleport } from "vue/server-renderer";
import { RouterLink, createMemoryHistory, createRouter, RouterView } from "vue-router";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
const _imports_0$1 = "/bg.mp4";
const _imports_1$1 = "/bg.png";
const _sfc_main$g = /* @__PURE__ */ defineComponent({
  __name: "BackToTop",
  __ssrInlineRender: true,
  setup(__props) {
    const isVisible = ref(false);
    const isHovered = ref(false);
    const scrollProgress = ref(0);
    const checkScroll = () => {
      isVisible.value = window.scrollY > 300;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress.value = docHeight > 0 ? window.scrollY / docHeight * 100 : 0;
    };
    onMounted(() => {
      window.addEventListener("scroll", checkScroll, { passive: true });
      checkScroll();
    });
    onUnmounted(() => {
      window.removeEventListener("scroll", checkScroll);
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<button${ssrRenderAttrs(mergeProps({
        class: ["fixed bottom-16 left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 transform-gpu cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-2xl focus:outline-none", [
          isHovered.value ? "bg-blue-600/30 text-white dark:bg-blue-500/10" : "bg-gray-50/30 text-gray-700 dark:bg-gray-800/10 dark:text-gray-200"
        ]],
        "aria-label": "回到顶部"
      }, _attrs, {
        style: isVisible.value ? null : { display: "none" }
      }))}><svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-200 dark:text-gray-700" opacity="0.3"></circle><circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"${ssrRenderAttr("stroke-dasharray", 163.36)}${ssrRenderAttr("stroke-dashoffset", 163.36 - scrollProgress.value / 100 * 163.36)} class="${ssrRenderClass([isHovered.value ? "text-white" : "text-blue-600 dark:text-blue-400", "transition-all duration-100"])}"></circle></svg><svg xmlns="http://www.w3.org/2000/svg" class="${ssrRenderClass([{ "-translate-y-1": isHovered.value }, "h-6 w-6 transform-gpu text-gray-600 transition-transform duration-300 dark:text-gray-300"])}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg><span class="${ssrRenderClass([{ "opacity-100": isHovered.value }, "absolute right-full mr-3 rounded-lg bg-gray-900 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-200 dark:bg-gray-700"])}"> 回到顶部 <span class="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-gray-700"></span></span></button>`);
    };
  }
});
const _sfc_setup$g = _sfc_main$g.setup;
_sfc_main$g.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/BackToTop.vue");
  return _sfc_setup$g ? _sfc_setup$g(props, ctx) : void 0;
};
const useThemeStore = defineStore("theme", () => {
  const theme = ref(
    localStorage.getItem("theme") || "system"
  );
  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    const isDark = newTheme === "dark" || newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    if (newTheme === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", newTheme);
    }
  };
  watch(theme, (newTheme) => {
    applyTheme(newTheme);
  });
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = () => {
    if (theme.value === "system") {
      applyTheme("system");
    }
  };
  applyTheme(theme.value);
  mediaQuery.addEventListener("change", handleSystemChange);
  const setTheme = (newTheme) => {
    theme.value = newTheme;
  };
  return {
    theme,
    setTheme
  };
});
const _sfc_main$f = /* @__PURE__ */ defineComponent({
  __name: "ThemeToggle",
  __ssrInlineRender: true,
  setup(__props) {
    const themeStore = useThemeStore();
    const isOpen = ref(false);
    const dropdownRef = ref(null);
    const themes = [
      {
        value: "system",
        label: "System",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
      },
      {
        value: "light",
        label: "Light",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      },
      {
        value: "dark",
        label: "Dark",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
      }
    ];
    const currentTheme = computed(
      () => {
        const found = themes.find((t) => t.value === themeStore.theme);
        return found || themes[0];
      }
    );
    const handleClickOutside = (event) => {
      if (dropdownRef.value && dropdownRef.value.contains(event.target)) {
        return;
      }
      isOpen.value = false;
    };
    onMounted(() => {
      document.addEventListener("click", handleClickOutside);
    });
    onUnmounted(() => {
      document.removeEventListener("click", handleClickOutside);
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "dropdownRef",
        ref: dropdownRef,
        class: "relative"
      }, _attrs))}><button class="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600" aria-label="Toggle theme"><span>${currentTheme.value.icon ?? ""}</span><span class="hidden sm:inline">${ssrInterpolate(currentTheme.value.label)}</span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${ssrRenderClass([{ "rotate-180": isOpen.value }, "transition-transform duration-200"])}"><polyline points="6 9 12 15 18 9"></polyline></svg></button>`);
      if (isOpen.value) {
        _push(`<div class="absolute top-full right-0 z-9999 mt-2 w-36 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"><!--[-->`);
        ssrRenderList(themes, (theme, index) => {
          _push(`<button class="${ssrRenderClass([{
            "bg-gray-100 dark:bg-gray-700": unref(themeStore).theme === theme.value,
            "rounded-t-lg": index === 0,
            "rounded-b-lg": index === themes.length - 1
          }, "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"])}"><span>${theme.icon ?? ""}</span><span>${ssrInterpolate(theme.label)}</span>`);
          if (unref(themeStore).theme === theme.value) {
            _push(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto text-blue-500"><polyline points="20 6 9 17 4 12"></polyline></svg>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</button>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$f = _sfc_main$f.setup;
_sfc_main$f.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ThemeToggle.vue");
  return _sfc_setup$f ? _sfc_setup$f(props, ctx) : void 0;
};
const useNotificationStore = defineStore("notification", () => {
  const toasts = ref([]);
  let idCounter = 1;
  function push(message, type = "info", timeout = 4e3) {
    const id = idCounter++;
    toasts.value.push({ id, message, type, timeout });
    if (timeout > 0) {
      setTimeout(() => dismiss(id), timeout);
    }
    return id;
  }
  function success(message, timeout) {
    return push(message, "success", timeout ?? 3e3);
  }
  function error(message, timeout) {
    return push(message, "error", timeout ?? 6e3);
  }
  function info(message, timeout) {
    return push(message, "info", timeout ?? 3e3);
  }
  function warning(message, timeout) {
    return push(message, "warning", timeout ?? 4e3);
  }
  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }
  function clear() {
    toasts.value = [];
  }
  return { toasts, push, success, error, info, warning, dismiss, clear };
});
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _sfc_main$e = {};
function _sfc_ssrRender$5(_ctx, _push, _parent, _attrs) {
  _push(`<svg${ssrRenderAttrs(mergeProps({
    xmlns: "http://www.w3.org/2000/svg",
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }, _attrs))}><path d="M18 6L6 18M6 6l12 12"></path></svg>`);
}
const _sfc_setup$e = _sfc_main$e.setup;
_sfc_main$e.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/icons/IconClose.vue");
  return _sfc_setup$e ? _sfc_setup$e(props, ctx) : void 0;
};
const IconClose = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["ssrRender", _sfc_ssrRender$5]]);
const _sfc_main$d = {};
function _sfc_ssrRender$4(_ctx, _push, _parent, _attrs) {
  _push(`<svg${ssrRenderAttrs(mergeProps({
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }, _attrs))}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`);
}
const _sfc_setup$d = _sfc_main$d.setup;
_sfc_main$d.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/icons/IconError.vue");
  return _sfc_setup$d ? _sfc_setup$d(props, ctx) : void 0;
};
const IconError = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["ssrRender", _sfc_ssrRender$4]]);
const _sfc_main$c = {};
function _sfc_ssrRender$3(_ctx, _push, _parent, _attrs) {
  _push(`<svg${ssrRenderAttrs(mergeProps({
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }, _attrs))}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`);
}
const _sfc_setup$c = _sfc_main$c.setup;
_sfc_main$c.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/icons/IconInfo.vue");
  return _sfc_setup$c ? _sfc_setup$c(props, ctx) : void 0;
};
const IconInfo = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["ssrRender", _sfc_ssrRender$3]]);
const _sfc_main$b = {};
function _sfc_ssrRender$2(_ctx, _push, _parent, _attrs) {
  _push(`<svg${ssrRenderAttrs(mergeProps({
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }, _attrs))}><path d="M20 6L9 17l-5-5"></path></svg>`);
}
const _sfc_setup$b = _sfc_main$b.setup;
_sfc_main$b.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/icons/IconSuccess.vue");
  return _sfc_setup$b ? _sfc_setup$b(props, ctx) : void 0;
};
const IconSuccess = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["ssrRender", _sfc_ssrRender$2]]);
const _sfc_main$a = {};
function _sfc_ssrRender$1(_ctx, _push, _parent, _attrs) {
  _push(`<svg${ssrRenderAttrs(mergeProps({
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }, _attrs))}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`);
}
const _sfc_setup$a = _sfc_main$a.setup;
_sfc_main$a.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/icons/IconWarning.vue");
  return _sfc_setup$a ? _sfc_setup$a(props, ctx) : void 0;
};
const IconWarning = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["ssrRender", _sfc_ssrRender$1]]);
const _sfc_main$9 = /* @__PURE__ */ defineComponent({
  __name: "ToastContainer",
  __ssrInlineRender: true,
  setup(__props) {
    const store = useNotificationStore();
    const toasts = computed(() => store.toasts);
    function getIconForType(t) {
      switch (t) {
        case "success":
          return IconSuccess;
        case "error":
          return IconError;
        case "warning":
          return IconWarning;
        default:
          return IconInfo;
      }
    }
    function classForType(t) {
      switch (t) {
        case "success":
          return "border-l-4 border-green-500";
        case "error":
          return "border-l-4 border-red-500";
        case "warning":
          return "border-l-4 border-yellow-500";
        default:
          return "border-l-4 border-blue-500";
      }
    }
    function iconColorForType(t) {
      switch (t) {
        case "success":
          return "text-green-500";
        case "error":
          return "text-red-500";
        case "warning":
          return "text-yellow-500";
        default:
          return "text-blue-500";
      }
    }
    function capitalize(s) {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "fixed top-4 left-1/2 z-9999 mb-4 flex w-11/12 max-w-md -translate-x-1/2 transform flex-col gap-3 sm:w-96" }, _attrs))} data-v-6bbe148b><div${ssrRenderAttrs({
        name: "toast",
        class: "transform-gpu",
        "enter-active-class": "ease-out"
      })} data-v-6bbe148b>`);
      ssrRenderList(toasts.value, (t) => {
        _push(`<div class="${ssrRenderClass([
          "mb-4",
          "flex items-start gap-3 rounded-xl border border-slate-200/20 bg-white/30 px-4 py-3 pr-3 text-slate-900 shadow-xl backdrop-blur-sm transition-colors duration-200 dark:border-gray-700/30 dark:bg-gray-900/10 dark:text-gray-100",
          classForType(t.type)
        ])}" data-v-6bbe148b>`);
        ssrRenderVNode(_push, createVNode(resolveDynamicComponent(getIconForType(t.type)), {
          class: ["mt-0.5 shrink-0", iconColorForType(t.type)]
        }, null), _parent);
        _push(`<div class="flex-1 text-sm" data-v-6bbe148b><div class="font-semibold text-slate-900 dark:text-gray-100" data-v-6bbe148b>${ssrInterpolate(capitalize(t.type))}</div><div class="mt-0.5 leading-snug text-slate-600 dark:text-gray-100" data-v-6bbe148b>${ssrInterpolate(t.message)}</div></div><button class="shrink-0 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="dismiss" data-v-6bbe148b>`);
        _push(ssrRenderComponent(IconClose, null, null, _parent));
        _push(`</button></div>`);
      });
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$9 = _sfc_main$9.setup;
_sfc_main$9.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ToastContainer.vue");
  return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
const ToastContainer = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["__scopeId", "data-v-6bbe148b"]]);
let onUnauthorizedCallback = null;
function setOnUnauthorized(callback) {
  onUnauthorizedCallback = callback;
}
const request = axios.create({
  baseURL: "/api",
  timeout: 1e4,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});
let currentCsrfToken = null;
function setCsrfToken(token) {
  if (token) {
    currentCsrfToken = token;
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.setItem("csrf_token", token);
      } catch (error) {
        console.error("保存 CSRF Token 到 session storage 失败:", error);
      }
      console.log("设置 CSRF Token 成功:", token);
    }
  }
}
async function getCsrfToken() {
  if (typeof sessionStorage !== "undefined") {
    try {
      const tokenFromSession = sessionStorage.getItem("csrf_token");
      if (tokenFromSession) {
        console.log(
          "从 session storage 中获取 CSRF Token 成功:",
          tokenFromSession
        );
        setCsrfToken(tokenFromSession);
        return tokenFromSession;
      }
    } catch (error) {
      console.error("从 session storage 中获取 CSRF Token 失败:", error);
    }
  }
  try {
    const response = await request.get("/auth/csrf-token");
    const token = response.data?.data?.csrf_token;
    if (token) {
      console.log("获取 CSRF Token 成功:", token);
      setCsrfToken(token);
    }
    return token;
  } catch (error) {
    console.error("获取 CSRF Token 失败:", error);
    return null;
  }
}
async function refreshCsrfToken() {
  return await request.get("/auth/csrf-token/refresh").then((response) => {
    const token = response.data?.data?.csrf_token;
    if (token) {
      setCsrfToken(token);
    }
  });
}
function clearCsrfToken() {
  currentCsrfToken = null;
  request.defaults.headers.common["X-CSRFToken"] = void 0;
  request.defaults.headers.common["X-CSRF-Token"] = void 0;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem("csrf_token");
      console.log("清除 session storage 中的 CSRF Token 成功");
    } catch (error) {
      console.error("清除 session storage 中的 CSRF Token 失败:", error);
    }
  }
}
const csrfMethods = ["post", "put", "delete", "patch"];
request.interceptors.request.use(async (config) => {
  if (csrfMethods.includes(config.method?.toLowerCase() || "")) {
    if (!currentCsrfToken) {
      const token = await getCsrfToken();
      if (token) {
        config.headers["X-CSRFToken"] = token;
        config.headers["X-CSRF-Token"] = token;
      }
    } else {
      config.headers["X-CSRFToken"] = currentCsrfToken;
      config.headers["X-CSRF-Token"] = currentCsrfToken;
    }
  }
  return config;
});
request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearCsrfToken();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      return Promise.reject(new Error("登录已过期，请重新登录"));
    }
    if (error.response?.status === 400 && error.response?.data?.message?.includes("CSRF")) {
      clearCsrfToken();
      refreshCsrfToken();
    }
    const serverMessage = error.response?.data?.message;
    const fallbackMessage = error.message || "请求失败，请稍后重试";
    return Promise.reject(new Error(serverMessage || fallbackMessage));
  }
);
const _sfc_main$8 = /* @__PURE__ */ defineComponent({
  __name: "BookCard",
  __ssrInlineRender: true,
  props: {
    book: {}
  },
  setup(__props) {
    const props = __props;
    const coverError = ref(false);
    const badge = computed(() => {
      if (props.book.iscompleted) {
        return {
          text: "已读",
          class: "bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400"
        };
      }
      return {
        text: "在读",
        class: "bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400"
      };
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "group m-2 overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:bg-gray-800" }, _attrs))}><div class="relative aspect-2/3 overflow-hidden bg-gray-100 dark:bg-gray-700">`);
      if (__props.book.cover && !coverError.value) {
        _push(`<img${ssrRenderAttr("src", __props.book.cover)}${ssrRenderAttr("alt", __props.book.title)} class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105">`);
      } else {
        _push(`<div class="flex h-full w-full items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-16 w-16 text-gray-300 dark:text-gray-600"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25"></path></svg></div>`);
      }
      _push(`<div class="absolute top-2 right-2"><span class="${ssrRenderClass([
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        badge.value.class
      ])}">${ssrInterpolate(badge.value.text)}</span></div></div><div class="p-4"><h3 class="truncate text-base font-semibold text-gray-900 dark:text-white"${ssrRenderAttr("title", __props.book.title)}>${ssrInterpolate(__props.book.title)}</h3><p class="mt-1 truncate text-sm text-gray-500 opacity-70 dark:text-gray-400">${ssrInterpolate(__props.book.author)}</p></div></div>`);
    };
  }
});
const _sfc_setup$8 = _sfc_main$8.setup;
_sfc_main$8.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/BookCard.vue");
  return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
  __name: "BookShelf",
  __ssrInlineRender: true,
  setup(__props) {
    const books = ref([]);
    const isLoading = ref(false);
    const errorMessage = ref("");
    const pagination = ref(null);
    const currentPage = ref(1);
    const books_count = ref(0);
    const getVisiblePages = computed(() => {
      if (!pagination.value) return [];
      const totalPages = pagination.value.pages;
      const current = pagination.value.page;
      const visiblePages = [];
      for (let i = Math.max(2, current - 2); i <= Math.min(totalPages - 1, current + 2); i++) {
        visiblePages.push(i);
      }
      return visiblePages;
    });
    const fetchBooks = async (page = 1) => {
      isLoading.value = true;
      errorMessage.value = "";
      try {
        const res = await request.get("/book", {
          params: { page, per_page: 12 }
        });
        if (res.data.status === "success") {
          books.value = res.data.data?.books || [];
          books_count.value = res.data.data?.pagination?.total || 0;
          pagination.value = res.data.data?.pagination || null;
          currentPage.value = page;
        } else {
          throw new Error(res.data.message || "获取书籍列表失败");
        }
      } catch (err) {
        const error = err;
        errorMessage.value = error?.response?.data?.message || error?.message || "获取书籍列表失败";
      } finally {
        isLoading.value = false;
      }
    };
    fetchBooks();
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-screen rounded-4xl bg-gray-50/70 px-4 py-8 backdrop-blur-lg sm:px-6 lg:px-8 dark:bg-gray-900/50" }, _attrs))} data-v-8b32f30f><div class="mx-auto max-w-7xl" data-v-8b32f30f><div class="mb-8 flex items-center gap-3" data-v-8b32f30f><div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" data-v-8b32f30f><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-7 w-7" data-v-8b32f30f><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25" data-v-8b32f30f></path></svg></div><div data-v-8b32f30f><div class="flex items-center gap-6" data-v-8b32f30f><h1 class="font-serif text-3xl font-bold text-gray-900 dark:text-white" data-v-8b32f30f> 我的书架 </h1><span class="self-center rounded-full border border-blue-300 bg-blue-200/60 px-4 py-2 text-xs text-blue-500 dark:bg-blue-200 dark:text-blue-900" data-v-8b32f30f>${ssrInterpolate(books_count.value)}</span></div><p class="mt-1 text-sm text-gray-500 dark:text-gray-400" data-v-8b32f30f> 管理您的阅读收藏 </p></div></div>`);
      if (isLoading.value) {
        _push(`<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-v-8b32f30f><!--[-->`);
        ssrRenderList(6, (i) => {
          _push(`<div class="animate-pulse overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800" data-v-8b32f30f><div class="aspect-2/3 bg-gray-200 dark:bg-gray-700" data-v-8b32f30f></div><div class="p-4" data-v-8b32f30f><div class="mb-2 h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" data-v-8b32f30f></div><div class="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" data-v-8b32f30f></div></div></div>`);
        });
        _push(`<!--]--></div>`);
      } else if (errorMessage.value) {
        _push(`<div class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-sm dark:bg-gray-800" data-v-8b32f30f><div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" data-v-8b32f30f><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-8 w-8" data-v-8b32f30f><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" data-v-8b32f30f></path></svg></div><p class="mb-4 text-center text-red-600 dark:text-red-400" data-v-8b32f30f>${ssrInterpolate(errorMessage.value)}</p><button type="button" class="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-800" data-v-8b32f30f><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-5 w-5" data-v-8b32f30f><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.731 4.002l.129-.143a8.25 8.25 0 0113.803 3.7M4.731 4.002l3.181-3.182" data-v-8b32f30f></path></svg> 重试 </button></div>`);
      } else if (books.value.length === 0) {
        _push(`<div class="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-sm dark:bg-gray-800" data-v-8b32f30f><div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500" data-v-8b32f30f><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-10 w-10" data-v-8b32f30f><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25" data-v-8b32f30f></path></svg></div><h3 class="mb-2 font-serif text-xl font-semibold text-gray-900 dark:text-white" data-v-8b32f30f> 暂无书籍 </h3><p class="mb-6 text-center text-gray-500 dark:text-gray-400" data-v-8b32f30f> 您的书架还是空的，快去导入一些书籍吧 </p>`);
        _push(ssrRenderComponent(unref(RouterLink), {
          to: "/import",
          class: "inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-800"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-5 w-5" data-v-8b32f30f${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" data-v-8b32f30f${_scopeId}></path></svg> 导入书籍 `);
            } else {
              return [
                (openBlock(), createBlock("svg", {
                  xmlns: "http://www.w3.org/2000/svg",
                  fill: "none",
                  viewBox: "0 0 24 24",
                  "stroke-width": "2",
                  stroke: "currentColor",
                  class: "h-5 w-5"
                }, [
                  createVNode("path", {
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    d: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  })
                ])),
                createTextVNode(" 导入书籍 ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (!isLoading.value && !errorMessage.value && books.value.length > 0) {
        _push(`<div class="book-grid-animation grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" data-v-8b32f30f><!--[-->`);
        ssrRenderList(books.value, (book) => {
          _push(ssrRenderComponent(_sfc_main$8, {
            key: book.id,
            book
          }, null, _parent));
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      if (pagination.value && pagination.value.pages > 1) {
        _push(`<div class="mt-8 flex justify-center" data-v-8b32f30f><nav class="flex items-center gap-2" data-v-8b32f30f><button${ssrIncludeBooleanAttr(!pagination.value.has_prev) ? " disabled" : ""} class="${ssrRenderClass([
          pagination.value?.has_prev ? "text-gray-700 dark:text-gray-300" : "text-gray-400",
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
        ])}" type="button" data-v-8b32f30f> 上一页 </button><div class="flex items-center gap-1" data-v-8b32f30f>`);
        if (pagination.value && pagination.value.page > 3) {
          _push(`<button class="min-w-32px rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" type="button" data-v-8b32f30f> 1 </button>`);
        } else {
          _push(`<!---->`);
        }
        if (pagination.value && pagination.value.page > 4) {
          _push(`<span class="px-1 text-gray-500 dark:text-gray-400" data-v-8b32f30f>...</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<!--[-->`);
        ssrRenderList(getVisiblePages.value, (pageNum) => {
          _push(`<button class="${ssrRenderClass([
            pageNum === pagination.value?.page ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
            "min-w-32px rounded-lg px-2 py-2 text-sm font-medium transition-colors"
          ])}" type="button" data-v-8b32f30f>${ssrInterpolate(pageNum)}</button>`);
        });
        _push(`<!--]-->`);
        if (pagination.value && pagination.value.page < pagination.value.pages - 3) {
          _push(`<span class="px-1 text-gray-500 dark:text-gray-400" data-v-8b32f30f>...</span>`);
        } else {
          _push(`<!---->`);
        }
        if (pagination.value && pagination.value.page < pagination.value.pages - 2) {
          _push(`<button class="min-w-32px rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" type="button" data-v-8b32f30f>${ssrInterpolate(pagination.value.pages)}</button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div><button${ssrIncludeBooleanAttr(!pagination.value?.has_next) ? " disabled" : ""} class="${ssrRenderClass([
          pagination.value?.has_next ? "text-gray-700 dark:text-gray-300" : "text-gray-400",
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
        ])}" type="button" data-v-8b32f30f> 下一页 </button></nav></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$7 = _sfc_main$7.setup;
_sfc_main$7.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/BookShelf.vue");
  return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
const BookShelf = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["__scopeId", "data-v-8b32f30f"]]);
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  __name: "AddBookForm",
  __ssrInlineRender: true,
  emits: ["book-added"],
  setup(__props, { emit: __emit }) {
    const submitting = ref(false);
    const form = reactive({
      title: "",
      author: "",
      iscompleted: false
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "mb-8 rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-gray-900/5 backdrop-blur-sm transition-shadow hover:shadow-2xl dark:bg-gray-800 dark:ring-white/10" }, _attrs))}><div class="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700"><div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-6 w-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg></div><p class="mb-0 items-center font-serif text-xl font-bold text-gray-900 dark:text-white"> Add to ReadingList </p></div><form class="space-y-5"><div class="grid gap-6 md:grid-cols-2"><div class="group"><label class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"> Title </label><input${ssrRenderAttr("value", form.title)} type="text" autocomplete="off" placeholder="e.g. The Great Gatsby" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"></div><div class="group"><label class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"> Author </label><input${ssrRenderAttr("value", form.author)} type="text" autocomplete="off" placeholder="e.g. F. Scott Fitzgerald" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"></div></div><label class="group relative flex cursor-pointer items-center rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-gray-50/50 dark:border-gray-700 dark:bg-gray-700/30 dark:hover:bg-gray-700/30"><input${ssrIncludeBooleanAttr(Array.isArray(form.iscompleted) ? ssrLooseContain(form.iscompleted, null) : form.iscompleted) ? " checked" : ""} type="checkbox" class="peer sr-only"><div class="mr-4 flex h-6 w-6 items-center justify-center rounded-md border-2 border-gray-300 bg-white transition-all peer-checked:border-blue-500 peer-checked:bg-blue-500 dark:border-gray-500 dark:bg-gray-700"><svg class="z-50 h-4 w-4 text-white transition-opacity peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div><span class="font-medium text-gray-700 dark:text-gray-300">Mark as completed</span></label><div class="flex justify-end"><button type="submit"${ssrIncludeBooleanAttr(submitting.value) ? " disabled" : ""} class="${ssrRenderClass([
        "inline-flex items-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg transition-colors focus:outline-none",
        submitting.value ? "cursor-not-allowed opacity-50" : "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-gray-800"
      ])}"> Add Book </button></div></form></div>`);
    };
  }
});
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/AddBookForm.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "BookActionButtons",
  __ssrInlineRender: true,
  props: {
    book: {},
    pending: { type: Boolean, default: false }
  },
  emits: ["toggle-status", "delete-book", "edit-book"],
  setup(__props, { emit: __emit }) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "absolute top-4 right-4 z-10 flex flex-wrap items-center gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100 sm:top-5 sm:right-5" }, _attrs))}><button${ssrIncludeBooleanAttr(__props.pending) ? " disabled" : ""} class="inline-flex items-center gap-1.5 rounded-xl bg-gray-100/50 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600">`);
      if (__props.book.iscompleted) {
        _push(`<svg class="h-4 w-4 text-gray-500 transition-colors group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>`);
      } else {
        _push(`<svg class="h-4 w-4 text-gray-500 transition-colors group-hover:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`);
      }
      _push(` ${ssrInterpolate(__props.book.iscompleted ? "Undo" : "Finish")}</button><button${ssrIncludeBooleanAttr(__props.pending) ? " disabled" : ""} class="inline-flex items-center gap-1.5 rounded-xl bg-gray-100/50 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"><svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Edit </button><button${ssrIncludeBooleanAttr(__props.pending) ? " disabled" : ""} class="inline-flex items-center gap-1.5 rounded-xl bg-gray-100/50 px-4 py-2 text-sm font-medium text-red-600 backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-900/30"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Delete </button><a class="inline-flex items-center gap-1 rounded-xl bg-[#00B51D]/10 px-3 py-2 text-sm font-bold text-[#00B51D] hover:bg-[#00B51D]/20 dark:bg-[#00B51D]/20 dark:text-[#00B51D] dark:hover:bg-[#00B51D]/30" href="https://book.douban.com" target="_blank" rel="noopener noreferrer"> Douban </a></div>`);
    };
  }
});
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/BookActionButtons.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const _imports_0 = "/images/about.webp";
const _imports_1 = "/images/cat.webp";
const _sfc_main$4 = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  const _component_RouterLink = resolveComponent("RouterLink");
  _push(`<div${ssrRenderAttrs(mergeProps({
    id: "HomeSideBar",
    class: "hidden lg:col-span-1 lg:block"
  }, _attrs))}><div class="sticky top-30 space-y-6"><div class="rounded-3xl border border-gray-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80"><div class="flex flex-col items-center text-center"><div class="group relative mb-4"><div class="absolute -inset-1 rounded-full bg-linear-to-br from-cyan-300 to-blue-400 opacity-50 blur"></div><img${ssrRenderAttr("src", _imports_0)} alt="Kuroome" class="relative h-32 w-32 transform transform-gpu rounded-full border-4 border-white object-cover shadow-xl transition duration-500 group-hover:scale-105 dark:border-gray-700">`);
  _push(ssrRenderComponent(_component_RouterLink, {
    to: "/about",
    class: "absolute inset-0 rounded-full"
  }, null, _parent));
  _push(`</div><h2 class="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-100"> Kuroome </h2><div class="mb-4"><span class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"> Developer &amp; Student </span></div><div class="mt-2 w-full space-y-3 text-left text-sm text-gray-600 dark:text-gray-300"><div class="flex items-start gap-3"><span class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400"></span><span>国际政治专业在读学生</span></div><div class="flex items-start gap-3"><span class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400"></span><span>正在自学编程与开发</span></div><div class="flex items-start gap-3"><span class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400"></span><span>爱好编程、阅读、钓鱼等</span></div></div></div></div><div class="rounded-3xl border border-gray-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80"><h3 class="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase"> Tech Stack </h3><div class="flex flex-wrap gap-2"><span class="cursor-default rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"> Python </span><span class="cursor-default rounded-md bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"> JavaScript </span><span class="cursor-default rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"> (API)Flask </span><span class="cursor-default rounded-md bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"> Vue.js </span><span class="cursor-default rounded-md bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"> TailwindCss </span><span class="cursor-default rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"> SQL </span><span class="cursor-default rounded-md bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50"> SQLAlchemy </span></div></div><div><img class="cat mx-auto mt-12 w-48 transform transform-gpu rounded-3xl shadow-2xl transition-transform hover:scale-105 hover:rotate-2"${ssrRenderAttr("src", _imports_1)} alt="Cat Image"></div></div></div>`);
}
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/HomeSideBar.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const HomeSideBar = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["ssrRender", _sfc_ssrRender]]);
dayjs.extend(utc);
const formatDate = (dateStr) => {
  if (!dateStr) return "未知时间";
  return dayjs(dateStr).local().format("YYYY-MM-DD HH:mm:ss");
};
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "MessageBoard",
  __ssrInlineRender: true,
  setup(__props) {
    const name = ref("Anonymous");
    const message = ref("");
    const messages = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const successMessage = ref("");
    const errors = ref({});
    const fetchMessages = async () => {
      loading.value = true;
      try {
        const response = await request.get("/messages");
        const data = response.data;
        if (data.status === "success") {
          messages.value = data.data.messages;
          console.log("Fetched messages:", messages.value);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        loading.value = false;
      }
    };
    onMounted(() => {
      fetchMessages();
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "mx-auto mt-12 mb-4 rounded-3xl bg-white/80 p-4 py-8 shadow-lg ring-1 ring-gray-900/5 backdrop-blur-sm transition-all hover:scale-[1.01] hover:shadow-xl dark:bg-gray-800" }, _attrs))}><div class="mx-4 my-2"><h2 class="flex items-center gap-3 text-2xl font-bold text-gray-800 dark:text-gray-100"><span class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-xl text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"> 💬 </span> Message Board <span class="ml-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">${ssrInterpolate(messages.value.length)}</span><span class="items-baseline text-sm text-gray-500 italic dark:text-gray-400"> Say hello now! </span></h2><form class="mt-4"><div class="grid gap-6 md:grid-cols-2"><div class="form-group md:col-span-2"><label class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"> Username </label><input${ssrRenderAttr("value", name.value)} type="text" class="w-full rounded-3xl border border-gray-300 bg-gray-50 px-3 py-2 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"${ssrIncludeBooleanAttr(submitting.value) ? " disabled" : ""}>`);
      if (errors.value.name) {
        _push(`<div class="mt-1 flex items-center text-sm text-red-500">${ssrInterpolate(errors.value.name[0])}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="form-group md:col-span-2"><label class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"> Message </label><textarea rows="3" class="w-full rounded-3xl border border-gray-300 bg-gray-50 px-3 py-2 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"${ssrIncludeBooleanAttr(submitting.value) ? " disabled" : ""}>${ssrInterpolate(message.value)}</textarea>`);
      if (errors.value.message) {
        _push(`<div class="mt-1 flex items-center text-sm text-red-500">${ssrInterpolate(errors.value.message[0])}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div><button type="submit" class="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 ring-offset-2 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:ring-offset-gray-800"${ssrIncludeBooleanAttr(submitting.value) ? " disabled" : ""}>${ssrInterpolate(submitting.value ? "Submitting..." : "Submit")}</button></div></div>`);
      if (successMessage.value) {
        _push(`<div class="mt-4 rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-900/20 dark:text-green-400">${ssrInterpolate(successMessage.value)}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</form>`);
      if (loading.value) {
        _push(`<div class="mt-6 text-center text-gray-500 dark:text-gray-400"> Loading messages... </div>`);
      } else {
        _push(`<div><!--[-->`);
        ssrRenderList(messages.value, (msg) => {
          _push(`<div class="${ssrRenderClass([
            "mt-6 rounded-3xl p-4 shadow-sm transition-all duration-300 hover:shadow-md",
            msg.from_admin ? "bg-linear-to-br from-purple-50 via-fuchsia-50 to-pink-50 ring-2 ring-purple-400/50 dark:from-purple-950/40 dark:via-fuchsia-950/30 dark:to-pink-950/20 dark:ring-purple-500/40" : "bg-gray-50 dark:bg-gray-700/30"
          ])}"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><div class="${ssrRenderClass([
            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
            msg.from_admin ? "bg-linear-to-br from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-md shadow-purple-500/30 dark:from-purple-400 dark:via-fuchsia-400 dark:to-pink-400" : "bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 dark:from-sky-900 dark:to-blue-900 dark:text-blue-300"
          ])}">${ssrInterpolate(msg.name.charAt(0).toUpperCase())}</div><div><h3 class="${ssrRenderClass([
            "text-lg font-semibold",
            msg.from_admin ? "text-purple-900 dark:text-purple-100" : "text-gray-900 dark:text-gray-100"
          ])}">${ssrInterpolate(msg.name)}</h3>`);
          if (msg.from_admin) {
            _push(`<span class="inline-flex items-center gap-1 rounded-md bg-linear-to-r from-purple-500 via-fuchsia-500 to-pink-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm ring-1 ring-purple-400/50 dark:from-purple-400 dark:via-fuchsia-400 dark:to-pink-400 dark:ring-purple-300/30"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> Admin </span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></div><span class="${ssrRenderClass([
            "text-sm",
            msg.from_admin ? "text-purple-600/70 dark:text-purple-300/70" : "text-gray-500 dark:text-gray-400"
          ])}">${ssrInterpolate(unref(formatDate)(msg.created_at))}</span></div><p class="${ssrRenderClass([
            "mt-3",
            msg.from_admin ? "text-purple-800 dark:text-purple-200" : "text-gray-700 dark:text-gray-300"
          ])}">${ssrInterpolate(msg.message)}</p></div>`);
        });
        _push(`<!--]-->`);
        if (messages.value.length === 0 && !loading.value) {
          _push(`<div class="mt-6 text-center text-gray-500 dark:text-gray-400"> No messages yet. Be the first to say hello! </div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/MessageBoard.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "HomeView",
  __ssrInlineRender: true,
  setup(__props) {
    useHead({
      title: "Kuroome's Blog - 个人阅读清单与博客",
      meta: [
        {
          name: "description",
          content: "个人阅读清单管理项目，包含博客系统、书籍管理和阅读记录"
        },
        { name: "keywords", content: "阅读清单,博客,书籍管理,个人知识库" },
        { property: "og:title", content: "Kuroome's Blog - 个人阅读清单与博客" },
        {
          property: "og:description",
          content: "个人阅读清单管理项目，包含博客系统、书籍管理和阅读记录"
        },
        { property: "og:type", content: "website" },
        { property: "twitter:card", content: "summary" },
        {
          property: "twitter:title",
          content: "Kuroome's Blog - 个人阅读清单与博客"
        },
        {
          property: "twitter:description",
          content: "个人阅读清单管理项目，包含博客系统、书籍管理和阅读记录"
        }
      ]
    });
    const books = ref([]);
    const isLoading = ref(false);
    const errorMessage = ref("");
    const pendingBookId = ref(null);
    const pagination = ref(null);
    const currentPage = ref(1);
    const getVisiblePages = computed(() => {
      if (!pagination.value) return [];
      const totalPages = pagination.value.pages;
      const current = pagination.value.page;
      const visiblePages = [];
      for (let i = Math.max(2, current - 2); i <= Math.min(totalPages - 1, current + 2); i++) {
        visiblePages.push(i);
      }
      return visiblePages;
    });
    const fetchBooks = async (page = 1) => {
      isLoading.value = true;
      errorMessage.value = "";
      try {
        const res = await request.get("/book", {
          params: { page, per_page: 20 }
        });
        books.value = res.data.data?.books ?? [];
        pagination.value = res.data.data?.pagination ?? null;
        currentPage.value = page;
      } catch (err) {
        console.error(err);
        errorMessage.value = err instanceof Error ? err.message : "加载书籍失败，请稍后重试。";
        useNotificationStore().error(errorMessage.value);
        books.value = [];
        pagination.value = null;
        currentPage.value = 1;
      } finally {
        isLoading.value = false;
      }
    };
    fetchBooks();
    const toggleBookStatus = async (book) => {
      pendingBookId.value = book.id;
      try {
        await request.patch(`/books/${book.id}/status`, {
          iscompleted: !book.iscompleted
        });
        books.value = books.value.map(
          (item) => item.id === book.id ? {
            ...item,
            iscompleted: !item.iscompleted
          } : item
        );
      } catch (err) {
        console.error(err);
        errorMessage.value = "更新阅读状态失败，请稍后重试。";
        useNotificationStore().error(errorMessage.value);
      } finally {
        pendingBookId.value = null;
      }
    };
    const deleteBook = async (book) => {
      pendingBookId.value = book.id;
      try {
        await request.delete(`/books/${book.id}`);
        books.value = books.value.filter((item) => item.id !== book.id);
        useNotificationStore().success("删除成功");
      } catch (err) {
        console.error(err);
        errorMessage.value = "删除书籍失败，请稍后重试。";
        useNotificationStore().error(errorMessage.value);
      } finally {
        pendingBookId.value = null;
      }
    };
    const editBook = (book) => {
      console.log("Edit book:", book);
    };
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "grid grid-cols-1 gap-8 lg:grid-cols-3" }, _attrs))}><div class="lg:col-span-2">`);
      _push(ssrRenderComponent(_sfc_main$6, { onBookAdded: fetchBooks }, null, _parent));
      _push(`<div class="min-h-fit space-y-4"><h2 class="mb-4 flex items-baseline font-serif text-2xl font-bold text-white"> Reading List </h2>`);
      if (isLoading.value) {
        _push(`<div aria-hidden="true"><ul class="space-y-3"><li class="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"></li><li class="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"></li><li class="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"></li></ul></div>`);
      } else if (errorMessage.value) {
        _push(`<p class="text-sm text-red-600 dark:text-red-400">${ssrInterpolate(errorMessage.value)}</p>`);
      } else if (books.value.length === 0) {
        _push(`<p class="text-sm text-gray-500 dark:text-gray-400"> 暂无书籍，先添加一本吧。 </p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<ul class="space-y-3" style="${ssrRenderStyle({ "contain": "layout" })}"><!--[-->`);
      ssrRenderList(books.value, (book) => {
        _push(`<li class="group relative flex min-h-20 flex-col gap-4 rounded-3xl bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all hover:bg-gray-50 hover:shadow-md sm:flex-row sm:items-center sm:justify-between dark:bg-gray-800 dark:hover:bg-gray-700/30"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="truncate text-lg font-semibold text-gray-900 dark:text-gray-100"${ssrRenderAttr("title", book.title)}>${ssrInterpolate(book.title)}</p>`);
        if (book.iscompleted) {
          _push(`<span class="inline-flex shrink-0 items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset dark:bg-green-400/10 dark:text-green-400">Done</span>`);
        } else {
          _push(`<span class="inline-flex shrink-0 items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-600/20 ring-inset dark:bg-orange-400/10 dark:text-orange-400">Reading</span>`);
        }
        _push(`</div><p class="mt-1 text-sm text-gray-500 dark:text-gray-400"> @ ${ssrInterpolate(book.author)}</p></div>`);
        _push(ssrRenderComponent(_sfc_main$5, {
          book,
          pending: pendingBookId.value === book.id,
          onToggleStatus: toggleBookStatus,
          onDeleteBook: deleteBook,
          onEditBook: editBook
        }, null, _parent));
        _push(`</li>`);
      });
      _push(`<!--]--></ul>`);
      if (pagination.value && pagination.value.pages > 1) {
        _push(`<div class="mx-auto mt-8 flex w-fit justify-center rounded-2xl bg-gray-50 px-4 py-2 dark:bg-gray-900"><nav class="flex items-center gap-2"><button${ssrIncludeBooleanAttr(!pagination.value.has_prev) ? " disabled" : ""} class="${ssrRenderClass([
          pagination.value?.has_prev ? "text-gray-700 dark:text-gray-300" : "text-gray-400",
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
        ])}" type="button"> 上一页 </button><div class="flex items-center gap-1">`);
        if (pagination.value && pagination.value.page > 3) {
          _push(`<button class="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" type="button"> 1 </button>`);
        } else {
          _push(`<!---->`);
        }
        if (pagination.value && pagination.value.page > 4) {
          _push(`<span class="px-1 text-gray-500 dark:text-gray-400">...</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<!--[-->`);
        ssrRenderList(getVisiblePages.value, (pageNum) => {
          _push(`<button class="${ssrRenderClass([
            pageNum === pagination.value?.page ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
            "min-w-32px rounded-lg px-2 py-2 text-sm font-medium transition-colors"
          ])}" type="button">${ssrInterpolate(pageNum)}</button>`);
        });
        _push(`<!--]-->`);
        if (pagination.value && pagination.value.page < pagination.value.pages - 3) {
          _push(`<span class="px-1 text-gray-500 dark:text-gray-400">...</span>`);
        } else {
          _push(`<!---->`);
        }
        if (pagination.value && pagination.value.page < pagination.value.pages - 2) {
          _push(`<button class="rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" type="button">${ssrInterpolate(pagination.value.pages)}</button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div><button${ssrIncludeBooleanAttr(!pagination.value?.has_next) ? " disabled" : ""} class="${ssrRenderClass([
          pagination.value?.has_next ? "text-gray-700 dark:text-gray-300" : "text-gray-400",
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
        ])}" type="button"> 下一页 </button></nav></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      _push(ssrRenderComponent(_sfc_main$3, { class: "mt-12" }, null, _parent));
      _push(`</div>`);
      _push(ssrRenderComponent(HomeSideBar, null, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/HomeView.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const history = createMemoryHistory("/");
const router = createRouter({
  history,
  routes: [
    {
      path: "/",
      name: "home",
      component: _sfc_main$2,
      meta: {
        title: "Kuroome's Blog - 个人阅读清单与博客",
        description: "个人阅读清单管理项目，包含博客系统、书籍管理和阅读记录",
        keywords: "阅读清单,博客,书籍管理,个人知识库"
      }
    },
    {
      path: "/about",
      name: "about",
      component: () => import("./assets/AboutView-Deup7-zU.js"),
      meta: {
        title: "关于我 - Kuroome's Blog",
        description: "关于 Kuroome's Blog 项目和作者的介绍",
        keywords: "关于,作者,项目介绍"
      }
    },
    {
      path: "/blog",
      name: "blog-list",
      component: () => import("./assets/BlogListView-BJEEpN0B.js"),
      meta: {
        title: "博客列表 - Kuroome's Blog",
        description: "个人博客文章列表，分享技术心得和生活感悟",
        keywords: "博客,文章,技术分享,生活感悟"
      }
    },
    {
      path: "/blog/new",
      name: "blog-new",
      component: () => import("./assets/BlogEditView-CbI4A2n-.js"),
      meta: { requiresAuth: true }
    },
    {
      path: "/blog/edit/:id",
      name: "blog-edit",
      component: () => import("./assets/BlogEditView-CbI4A2n-.js"),
      meta: { requiresAuth: true }
    },
    {
      path: "/blog/category/:categoryId",
      name: "blog-category",
      component: () => import("./assets/BlogListView-BJEEpN0B.js"),
      meta: {
        title: "博客分类 - Kuroome's Blog",
        description: "按分类浏览博客文章",
        keywords: "博客分类,文章分类"
      }
    },
    {
      path: "/blog/:id",
      name: "blog-post",
      component: () => import("./assets/BlogPostView-BbZ8AKfE.js"),
      meta: {
        title: "博客文章 - Kuroome's Blog",
        description: "博客文章详情页",
        keywords: "博客文章,文章详情"
      }
    },
    {
      path: "/login",
      name: "login",
      component: () => import("./assets/LoginView-Cn4lRLFG.js")
    },
    {
      path: "/register",
      name: "register",
      component: () => import("./assets/RegisterView-C1Onub7J.js")
    },
    {
      path: "/messages",
      name: "message-manage",
      component: () => import("./assets/MessageManageView-iKHeUXhb.js"),
      meta: { requiresAuth: true }
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("./assets/ProfileSettingView-CbKFd19g.js"),
      meta: { requiresAuth: true }
    },
    {
      path: "/import",
      name: "import",
      component: () => import("./assets/ImportBook-CZtSztr-.js"),
      meta: { requiresAuth: true }
    },
    {
      path: "/bookshelf",
      name: "bookshelf",
      component: BookShelf,
      meta: {
        title: "书架 - Kuroome's Blog",
        description: "个人书架，管理你的阅读清单和书籍信息",
        keywords: "书架,阅读清单,书籍管理",
        requiresAuth: true
      }
    },
    {
      // 通配符匹配所有未定义的路径
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("./assets/NotFound-B3-d0Py3.js")
    }
  ]
});
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.isHydrated) {
    await auth.hydrateAuth();
  }
  const needsAuth = to.matched.some(
    (route) => route.meta?.requiresAuth === true
  );
  if (needsAuth && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  return true;
});
router.afterEach((to) => {
  if (to.meta.title && typeof document !== "undefined") {
    document.title = to.meta.title;
  }
});
const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const loading = ref(false);
  const isHydrated = ref(false);
  const notifier = useNotificationStore();
  const isAuthenticated = computed(() => !!user.value);
  setOnUnauthorized(() => {
    user.value = null;
    notifier.error("登录已过期，请重新登录");
  });
  async function fetchUser() {
    loading.value = true;
    try {
      const res = await request.get("/auth/me");
      user.value = res.data.data || null;
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }
  async function hydrateAuth() {
    if (isHydrated.value) return;
    await fetchUser();
    isHydrated.value = true;
  }
  async function login(username, password, rememberMe = false) {
    loading.value = true;
    try {
      const res = await request.post("/auth/login", {
        username,
        password,
        remember_me: rememberMe
      });
      user.value = res.data.data || null;
      notifier.success("登录成功");
      router.back();
      return res.data;
    } catch (err) {
      notifier.error(err instanceof Error ? err.message : "登录失败");
      throw err;
    } finally {
      loading.value = false;
    }
  }
  async function logout() {
    loading.value = true;
    try {
      await request.post("/auth/logout");
    } catch (err) {
    } finally {
      user.value = null;
      clearCsrfToken();
      router.push("/");
      notifier.success("已退出登录");
      loading.value = false;
    }
  }
  return {
    user,
    loading,
    isAuthenticated,
    isHydrated,
    fetchUser,
    hydrateAuth,
    login,
    logout
  };
});
const githubLogo = "/images/github.webp";
const headerThreshold = 800;
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "BasicLayout",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const isDropdownOpen = ref(false);
    const dropdownRef = ref(null);
    const closeDropdown = () => {
      setTimeout(() => {
        isDropdownOpen.value = false;
      }, 150);
    };
    const handleClickOutside = (event) => {
      if (dropdownRef.value && dropdownRef.value.contains(event.target)) {
        return;
      }
      isDropdownOpen.value = false;
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        isDropdownOpen.value = false;
      }
    };
    const isHeaderVisible = ref(true);
    const lastScrollY = ref(0);
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.value && currentScrollY > headerThreshold) {
        isHeaderVisible.value = false;
      } else if (currentScrollY < lastScrollY.value) {
        isHeaderVisible.value = true;
      }
      lastScrollY.value = currentScrollY;
    };
    onMounted(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleKeydown);
      window.addEventListener("scroll", handleScroll, { passive: true });
      lastScrollY.value = window.scrollY;
    });
    onUnmounted(() => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("scroll", handleScroll);
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "grid h-screen grid-rows-[auto_1fr_auto] text-gray-800 dark:text-gray-200" }, _attrs))}><div class="pointer-events-none fixed inset-0 -z-10 h-full w-full bg-[url(&#39;/bg.png&#39;)] bg-cover bg-fixed"><video class="h-full w-full object-cover"${ssrRenderAttr("src", _imports_0$1)} autoplay muted loop playsinline${ssrRenderAttr("poster", _imports_1$1)} playbackRate="0.75"></video></div><header><div class="mx-auto mt-6 max-w-6xl">`);
      ssrRenderTeleport(_push, (_push2) => {
        _push2(ssrRenderComponent(ToastContainer, null, null, _parent));
      }, "body", false, _parent);
      _push(`<div class="${ssrRenderClass([{ "-translate-y-[calc(100%+2rem)]": !isHeaderVisible.value }, "group fixed right-4 left-4 z-50 mt-2 transform-gpu transition-transform duration-300"])}"><nav class="mx-auto max-w-6xl transform-gpu backdrop-blur-sm transition-transform hover:scale-[1.01]"><ul class="flex items-center justify-end-safe font-medium"><li class="relative mr-auto ml-8"><button class="flex cursor-pointer items-center gap-1"><span class="font-serif text-2xl font-bold text-gray-700 text-shadow-lg hover:text-blue-600 dark:text-gray-300 dark:text-shadow-lg"> Kuroome&#39;s Blog </span><svg class="${ssrRenderClass([{ "rotate-180": isDropdownOpen.value }, "h-3 w-3 transform-gpu text-gray-700 transition-transform"])}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>`);
      if (isDropdownOpen.value) {
        _push(`<div class="absolute top-full right-0 z-9999 mt-2 w-auto origin-top-right rounded-lg border border-gray-200/60 bg-gray-50 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-50/5"><ol class="flex justify-center gap-6 px-4 py-2"><li>`);
        _push(ssrRenderComponent(unref(RouterLink), {
          to: "/",
          onClick: closeDropdown,
          class: "flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"${_scopeId}></path></svg> Home `);
            } else {
              return [
                (openBlock(), createBlock("svg", {
                  class: "h-4 w-4",
                  fill: "none",
                  viewBox: "0 0 24 24",
                  stroke: "currentColor"
                }, [
                  createVNode("path", {
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    "stroke-width": "2",
                    d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  })
                ])),
                createTextVNode(" Home ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</li><li>`);
        _push(ssrRenderComponent(unref(RouterLink), {
          to: "/blog",
          onClick: closeDropdown,
          class: "flex items-center gap-2 px-4 py-2 font-serif text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"${_scopeId}></path></svg> Blog `);
            } else {
              return [
                (openBlock(), createBlock("svg", {
                  class: "h-4 w-4",
                  fill: "none",
                  viewBox: "0 0 24 24",
                  stroke: "currentColor"
                }, [
                  createVNode("path", {
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    "stroke-width": "2",
                    d: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  })
                ])),
                createTextVNode(" Blog ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</li></ol></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</li>`);
      if (unref(auth).isAuthenticated) {
        _push(`<!--[--><li>`);
        _push(ssrRenderComponent(unref(RouterLink), { to: "/bookshelf" }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Book`);
            } else {
              return [
                createTextVNode("Book")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</li><li>`);
        _push(ssrRenderComponent(unref(RouterLink), { to: "/import" }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Import`);
            } else {
              return [
                createTextVNode("Import")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</li><li>`);
        _push(ssrRenderComponent(unref(RouterLink), { to: "/settings" }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Profile`);
            } else {
              return [
                createTextVNode("Profile")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</li>`);
        if (unref(auth).user?.id === 1) {
          _push(`<li>`);
          _push(ssrRenderComponent(unref(RouterLink), { to: "/messages" }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`Messages`);
              } else {
                return [
                  createTextVNode("Messages")
                ];
              }
            }),
            _: 1
          }, _parent));
          _push(`</li>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<li><button class="rounded-lg px-2 py-2 font-serif text-lg font-bold text-gray-600 no-underline transition-colors text-shadow-xs hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"${ssrIncludeBooleanAttr(unref(auth).loading) ? " disabled" : ""}>${ssrInterpolate(unref(auth).loading ? "Signing out..." : "Logout")}</button></li><!--]-->`);
      } else {
        _push(`<!--[--><li>`);
        _push(ssrRenderComponent(unref(RouterLink), { to: "/login" }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Login`);
            } else {
              return [
                createTextVNode("Login")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</li><li>`);
        _push(ssrRenderComponent(unref(RouterLink), { to: "/register" }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Register`);
            } else {
              return [
                createTextVNode("Register")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</li><!--]-->`);
      }
      _push(`<li>`);
      _push(ssrRenderComponent(unref(RouterLink), { to: "/about" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`About`);
          } else {
            return [
              createTextVNode("About")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</li><li class="relative ml-4 flex items-center">`);
      _push(ssrRenderComponent(_sfc_main$f, null, null, _parent));
      _push(`</li></ul></nav></div></div></header><main class="mx-auto mt-25 w-full max-w-6xl rounded-3xl p-4">`);
      _push(ssrRenderComponent(unref(RouterView), null, {
        default: withCtx(({ Component }, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(``);
            ssrRenderVNode(_push2, createVNode(resolveDynamicComponent(Component), {
              key: _ctx.$route.fullPath
            }, null), _parent2, _scopeId);
          } else {
            return [
              createVNode(Transition, {
                mode: "out-in",
                "enter-active-class": "transition-all transform-gpu duration-300 ease-out",
                "enter-from-class": "opacity-0 translate-y-20",
                "enter-to-class": "opacity-100 translate-y-0",
                "leave-active-class": "transition-all transform-gpu duration-300 ease-in",
                "leave-from-class": "opacity-100 translate-y-0",
                "leave-to-class": "opacity-0 -translate-y-20"
              }, {
                default: withCtx(() => [
                  (openBlock(), createBlock(KeepAlive, { include: ["MessageManageView"] }, [
                    (openBlock(), createBlock(resolveDynamicComponent(Component), {
                      key: _ctx.$route.fullPath
                    }))
                  ], 1024))
                ]),
                _: 2
              }, 1024)
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</main><footer><p>Copyright © 2026 All Rights Reserved.</p><div class="flex items-end justify-center"><a href="https://github.com/KanoCifer/Flask-Example" aria-label="Kuroome on GitHub" class="hover:opacity-90" target="_blank"><img alt="Powered by Flask"${ssrRenderAttr("src", githubLogo)} class="cover aspect-square w-6 object-cover align-bottom"></a><a class="text-gray-400 hover:underline" href="https://github.com/KanoCifer/Flask-Example " target="_blank"> Github: KanoCifer</a><a class="text-gray-400 hover:underline" href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank"> 粤ICP备2026018113号</a></div></footer>`);
      _push(ssrRenderComponent(_sfc_main$g, null, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/layouts/BasicLayout.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "App",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(_sfc_main$1, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/App.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const app = createApp(_sfc_main);
const pinia = createPinia();
const head = createHead();
app.use(pinia);
app.use(router);
app.use(head);
app.mount("#app");
export {
  _export_sfc as _,
  useAuthStore as a,
  formatDate as f,
  request as r,
  useNotificationStore as u
};
