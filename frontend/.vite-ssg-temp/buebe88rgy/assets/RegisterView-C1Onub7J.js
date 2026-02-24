import { defineComponent, ref, unref, withCtx, createTextVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderAttr, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderComponent } from "vue/server-renderer";
import { useRouter, RouterLink } from "vue-router";
import { _ as _export_sfc } from "../main.mjs";
import "@vueuse/head";
import "pinia";
import "axios";
import "dayjs";
import "dayjs/plugin/utc.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "RegisterView",
  __ssrInlineRender: true,
  setup(__props) {
    useRouter();
    const form = ref({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      emailCode: ""
    });
    const errors = ref({});
    const isSubmitting = ref(false);
    const isSendingCode = ref(false);
    const sendCodeText = ref("SendCode");
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-f4df3ffc><div class="mx-auto max-w-md rounded-[40px] bg-blue-50/80 px-12 py-14 shadow-2xl backdrop-blur-md dark:bg-gray-800" data-v-f4df3ffc><p class="text-center font-serif text-2xl font-bold text-shadow-md dark:text-white" data-v-f4df3ffc> Register </p><p class="mb-12 text-center font-serif text-gray-500 italic dark:text-gray-400" data-v-f4df3ffc> Create an account to start managing your reading list! </p><form data-v-f4df3ffc><div class="form-group" data-v-f4df3ffc><input${ssrRenderAttr("value", form.value.username)} type="text" autocomplete="off" placeholder="Username" class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800" required data-v-f4df3ffc>`);
      if (errors.value.username) {
        _push(`<span class="mt-1 block text-sm text-red-600 dark:text-red-400" data-v-f4df3ffc>${ssrInterpolate(errors.value.username)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="form-group" data-v-f4df3ffc><input${ssrRenderAttr("value", form.value.email)} type="email" autocomplete="off" placeholder="Email" class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800" required data-v-f4df3ffc>`);
      if (errors.value.email) {
        _push(`<span class="mt-1 block text-sm text-red-600 dark:text-red-400" data-v-f4df3ffc>${ssrInterpolate(errors.value.email)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="form-group" data-v-f4df3ffc><input${ssrRenderAttr("value", form.value.password)} type="password" autocomplete="off" placeholder="Password" class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800" required data-v-f4df3ffc>`);
      if (errors.value.password) {
        _push(`<span class="mt-1 block text-sm text-red-600 dark:text-red-400" data-v-f4df3ffc>${ssrInterpolate(errors.value.password)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="form-group" data-v-f4df3ffc><input${ssrRenderAttr("value", form.value.confirmPassword)} type="password" autocomplete="off" placeholder="Confirm Password" class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800" required data-v-f4df3ffc>`);
      if (errors.value.confirmPassword) {
        _push(`<span class="mt-1 block text-sm text-red-600 dark:text-red-400" data-v-f4df3ffc>${ssrInterpolate(errors.value.confirmPassword)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="mt-4 flex items-end gap-2" data-v-f4df3ffc><div class="form-group mb-0 flex w-full items-center gap-2" data-v-f4df3ffc><input${ssrRenderAttr("value", form.value.emailCode)} type="text" autocomplete="off" placeholder="Email Code" class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800" required data-v-f4df3ffc>`);
      if (errors.value.emailCode) {
        _push(`<span class="mt-1 block text-sm text-red-600 dark:text-red-400" data-v-f4df3ffc>${ssrInterpolate(errors.value.emailCode)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<button type="button" id="send-code" class="h-full cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-800"${ssrIncludeBooleanAttr(isSendingCode.value) ? " disabled" : ""} data-v-f4df3ffc>${ssrInterpolate(sendCodeText.value)}</button></div></div><div class="mt-6" data-v-f4df3ffc><button type="submit" class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-800"${ssrIncludeBooleanAttr(isSubmitting.value) ? " disabled" : ""} data-v-f4df3ffc>${ssrInterpolate(isSubmitting.value ? "Registering..." : "Register")}</button></div>`);
      if (errors.value.submit) {
        _push(`<span class="mt-2 block text-center text-sm text-red-600 dark:text-red-400" data-v-f4df3ffc>${ssrInterpolate(errors.value.submit)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</form><p class="mt-8 text-center font-serif text-gray-400" data-v-f4df3ffc>Kuroome&#39;s Blog</p><div class="mb-4 text-center text-gray-400 dark:text-gray-300" data-v-f4df3ffc> Already have an account? `);
      _push(ssrRenderComponent(unref(RouterLink), {
        to: "/login",
        class: "underline transition duration-100 hover:font-bold"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` Login here. `);
          } else {
            return [
              createTextVNode(" Login here. ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/RegisterView.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RegisterView = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f4df3ffc"]]);
export {
  RegisterView as default
};
