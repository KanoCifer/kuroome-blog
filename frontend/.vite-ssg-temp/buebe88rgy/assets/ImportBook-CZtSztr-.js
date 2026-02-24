import { defineComponent, ref, onMounted, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr } from "vue/server-renderer";
import { u as useNotificationStore } from "../main.mjs";
import "@vueuse/head";
import "pinia";
import "vue-router";
import "axios";
import "dayjs";
import "dayjs/plugin/utc.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ImportBook",
  __ssrInlineRender: true,
  setup(__props) {
    const weread_cookie = ref("");
    const loading = ref(false);
    useNotificationStore();
    const loadFromLocalStorage = () => {
      const savedCookie = localStorage.getItem("weread_cookie");
      if (savedCookie) {
        weread_cookie.value = savedCookie;
      }
    };
    onMounted(loadFromLocalStorage);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ id: "ImportBook" }, _attrs))}><div class="m-4 mx-auto max-w-xl rounded-[40px] bg-white p-8 shadow-xl dark:bg-gray-800"><p class="font-serif text-2xl font-bold dark:text-white"> Import Your Bookshelf! </p><p class="mb-4 text-gray-500 italic dark:text-gray-400"> Import your bookshelf from WEREAD here. </p><div class="flex items-center justify-center"><form method="POST"><div class="mb-4"><label for="weread_cookie" class="mb-2 block text-center text-gray-700 dark:text-gray-300">WEREAD Cookie:</label><textarea id="weread_cookie" class="h-40 w-md rounded-3xl border-2 border-gray-300 p-2 transition-transform focus:scale-[1.01] dark:bg-gray-700 dark:text-white">${ssrInterpolate(weread_cookie.value)}</textarea></div><div class="mb-4 flex justify-center"><button${ssrIncludeBooleanAttr(loading.value) ? " disabled" : ""} class="flex w-full items-center justify-center rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-blue-600 dark:ring-offset-gray-800">`);
      if (loading.value) {
        _push(`<svg class="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<span>${ssrInterpolate(loading.value ? "Importing..." : "Submit")}</span></button></div></form></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/ImportBook.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
