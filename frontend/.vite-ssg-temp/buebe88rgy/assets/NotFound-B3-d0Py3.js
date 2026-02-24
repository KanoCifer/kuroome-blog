import { defineComponent, resolveComponent, mergeProps, withCtx, openBlock, createBlock, createVNode, createTextVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { useRouter } from "vue-router";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "NotFound",
  __ssrInlineRender: true,
  setup(__props) {
    useRouter();
    return (_ctx, _push, _parent, _attrs) => {
      const _component_RouterLink = resolveComponent("RouterLink");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8" }, _attrs))}><div class="mx-auto max-w-md text-center"><div class="relative mx-auto h-32 w-32"><div class="absolute inset-0 animate-pulse rounded-full bg-blue-100 dark:bg-blue-900/30"></div><div class="relative flex h-full items-center justify-center"><span class="text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">404</span></div></div><h1 class="mt-8 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white"> 页面未找到 </h1><p class="mt-4 text-lg text-gray-600 dark:text-gray-400"> 抱歉，您访问的页面不存在或已被移动。 </p><div class="mt-6 space-y-2 text-sm text-gray-500 dark:text-gray-500"><p>• 网址可能拼写错误</p><p>• 页面可能已被删除</p><p>• 链接可能已过期</p></div><div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">`);
      _push(ssrRenderComponent(_component_RouterLink, {
        to: "/",
        class: "inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-600"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"${_scopeId}></path></svg> 返回首页 `);
          } else {
            return [
              (openBlock(), createBlock("svg", {
                class: "mr-2 h-5 w-5",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24"
              }, [
                createVNode("path", {
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                  "stroke-width": "2",
                  d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                })
              ])),
              createTextVNode(" 返回首页 ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<button type="button" class="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-gray-900 ring-1 ring-gray-300 transition-all ring-inset hover:bg-gray-50 focus:ring-2 focus:ring-gray-400 focus:outline-none dark:bg-gray-800 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-700"><svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> 上一页 </button></div></div><div class="mt-16 flex gap-2 text-gray-400 dark:text-gray-600"><div class="h-1 w-1 animate-bounce rounded-full bg-current"></div><div class="h-1 w-1 animate-bounce rounded-full bg-current" style="${ssrRenderStyle({ "animation-delay": "0.1s" })}"></div><div class="h-1 w-1 animate-bounce rounded-full bg-current" style="${ssrRenderStyle({ "animation-delay": "0.2s" })}"></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/NotFound.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
