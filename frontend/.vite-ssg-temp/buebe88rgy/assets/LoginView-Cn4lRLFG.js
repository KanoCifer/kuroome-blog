import { defineComponent, ref, computed, unref, withCtx, createTextVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderAttr, ssrInterpolate, ssrRenderDynamicModel, ssrIncludeBooleanAttr, ssrLooseContain, ssrRenderComponent } from "vue/server-renderer";
import { a as useAuthStore } from "../main.mjs";
import { useRouter, useRoute, RouterLink } from "vue-router";
import "@vueuse/head";
import "pinia";
import "axios";
import "dayjs";
import "dayjs/plugin/utc.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "LoginView",
  __ssrInlineRender: true,
  setup(__props) {
    useRouter();
    useRoute();
    useAuthStore();
    const form = ref({
      username: "",
      password: "",
      rememberMe: false
    });
    const errors = ref({});
    const isSubmitting = ref(false);
    const showPassword = ref(false);
    const password = computed(() => showPassword.value ? "text" : "password");
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}><div class="mx-auto max-w-md rounded-[40px] bg-blue-50/80 px-12 py-14 shadow-2xl backdrop-blur-md dark:bg-gray-800"><p class="text-center font-serif text-2xl font-bold text-shadow-md dark:text-white"> Login </p><p class="mb-12 text-center font-serif text-gray-500 italic dark:text-gray-400"> Welcome back! Please enter your credentials to log in. </p><form><div class="form-group"><input${ssrRenderAttr("value", form.value.username)} type="text" autocomplete="off" placeholder="用户名" class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800">`);
      if (errors.value.username) {
        _push(`<span class="mt-1 block text-sm text-red-600 dark:text-red-400">${ssrInterpolate(errors.value.username)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="form-group relative mt-4"><input${ssrRenderDynamicModel(password.value, form.value.password, null)}${ssrRenderAttr("type", password.value)} autocomplete="off" placeholder="密码" class="form-control mb-6 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 pr-12 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"><button type="button"${ssrRenderAttr("aria-label", showPassword.value ? "隐藏密码" : "显示密码")} class="absolute top-6 right-3 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-gray-300 dark:hover:text-white">`);
      if (showPassword.value) {
        _push(`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>`);
      } else {
        _push(`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.19 20.19 0 0 1 5-4.9"></path><path d="M1 1l22 22"></path><path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"></path></svg>`);
      }
      _push(`</button>`);
      if (errors.value.password) {
        _push(`<span class="mt-1 block text-sm text-red-600 dark:text-red-400">${ssrInterpolate(errors.value.password)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="mt-6 flex items-center justify-between"><button type="submit" class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-800"${ssrIncludeBooleanAttr(isSubmitting.value) ? " disabled" : ""}>${ssrInterpolate(isSubmitting.value ? "Logging in..." : "Login")}</button><label class="group relative flex cursor-pointer"><input${ssrIncludeBooleanAttr(Array.isArray(form.value.rememberMe) ? ssrLooseContain(form.value.rememberMe, null) : form.value.rememberMe) ? " checked" : ""} type="checkbox" class="peer sr-only"><div class="rounded-xl border-2 border-gray-100 bg-white px-3 py-2 shadow-sm transition-all duration-200 select-none group-active:scale-95 peer-checked:border-blue-500 peer-checked:bg-blue-50/50 peer-checked:shadow-blue-100/50 hover:border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500/10 dark:peer-checked:shadow-none dark:hover:border-blue-500/50"><span class="text-sm font-medium text-gray-600 transition-colors peer-checked:text-blue-600 dark:text-gray-300 dark:peer-checked:text-blue-400"> Remember Me </span></div></label></div><p class="mt-8 text-center font-serif text-gray-400">Kuroome&#39;s Blog</p><div class="mb-4 text-center text-gray-400 dark:text-gray-300"> Don&#39;t have an account? `);
      _push(ssrRenderComponent(unref(RouterLink), {
        to: "/register",
        class: "underline transition duration-100 hover:font-bold"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` Register here. `);
          } else {
            return [
              createTextVNode(" Register here. ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></form></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/LoginView.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
