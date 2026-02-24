import { defineComponent, ref, computed, onMounted, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderAttr, ssrInterpolate, ssrIncludeBooleanAttr, ssrLooseEqual, ssrRenderClass } from "vue/server-renderer";
import { a as useAuthStore, _ as _export_sfc } from "../main.mjs";
import "@vueuse/head";
import "pinia";
import "vue-router";
import "axios";
import "dayjs";
import "dayjs/plugin/utc.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ProfileSettingView",
  __ssrInlineRender: true,
  setup(__props) {
    const authStore = useAuthStore();
    const form = ref({
      name: "",
      username: "",
      gender: "",
      email: "",
      mobile: "",
      password: ""
    });
    const errors = ref({});
    const saving = ref(false);
    const message = ref("");
    const messageType = ref("success");
    const avatarUrl = computed(() => {
      if (authStore.user?.photo) {
        return `/api/media/${authStore.user.photo}`;
      }
      return "/api/media/default.png";
    });
    const loadUserData = () => {
      if (authStore.user) {
        form.value.name = authStore.user.name || "";
        form.value.username = authStore.user.username || "";
        form.value.gender = authStore.user.gender || "";
        form.value.email = authStore.user.email || "";
        const userWithMobile = authStore.user;
        form.value.mobile = userWithMobile?.mobile || "";
      }
    };
    onMounted(() => {
      loadUserData();
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "m-4 mx-auto max-w-md rounded-[40px] bg-white p-8 shadow-xl dark:bg-gray-800" }, _attrs))} data-v-b794bd1a><p class="text-2xl font-bold dark:text-white" data-v-b794bd1a>Profile Settings</p><p class="mb-4 text-gray-500 italic dark:text-gray-400" data-v-b794bd1a> Manage your profile and preferences here. </p><div class="mb-8 flex justify-center" data-v-b794bd1a><div class="relative" data-v-b794bd1a><div class="h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-gray-700" data-v-b794bd1a><img${ssrRenderAttr("src", avatarUrl.value)} alt="Avatar" class="h-full w-full object-cover" data-v-b794bd1a></div><label class="absolute right-0 bottom-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition-colors hover:bg-blue-600" data-v-b794bd1a><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4" data-v-b794bd1a><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" data-v-b794bd1a></path><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" data-v-b794bd1a></path></svg><input type="file" accept=".jpg,.jpeg,.png,.gif" class="hidden" data-v-b794bd1a></label></div></div><form data-v-b794bd1a><div class="mb-4" data-v-b794bd1a><label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300" data-v-b794bd1a> Name </label><input${ssrRenderAttr("value", form.value.name)} type="text" autocomplete="off" class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Your display name" data-v-b794bd1a>`);
      if (errors.value.name) {
        _push(`<p class="mt-1 text-sm text-red-500" data-v-b794bd1a>${ssrInterpolate(errors.value.name)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="mb-4" data-v-b794bd1a><label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300" data-v-b794bd1a> Username <span class="text-xs text-red-400 italic" data-v-b794bd1a>* Login-in name</span></label><input${ssrRenderAttr("value", form.value.username)} type="text" autocomplete="off" class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Your username" data-v-b794bd1a>`);
      if (errors.value.username) {
        _push(`<p class="mt-1 text-sm text-red-500" data-v-b794bd1a>${ssrInterpolate(errors.value.username)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="mb-4" data-v-b794bd1a><label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300" data-v-b794bd1a> Gender </label><div class="flex gap-4" data-v-b794bd1a><label class="group relative flex-1 cursor-pointer" data-v-b794bd1a><input${ssrIncludeBooleanAttr(ssrLooseEqual(form.value.gender, "male")) ? " checked" : ""} type="radio" value="male" class="peer sr-only" data-v-b794bd1a><div class="flex items-center justify-between rounded-xl border-2 border-gray-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 group-active:scale-95 peer-checked:border-blue-500 peer-checked:bg-blue-50/50 peer-checked:shadow-blue-100/50 hover:border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500/10 dark:peer-checked:shadow-none dark:hover:border-blue-500/50" data-v-b794bd1a><span class="text-sm font-semibold text-gray-600 transition-colors peer-checked:text-blue-700 dark:text-gray-300 dark:peer-checked:text-blue-400" data-v-b794bd1a>Male</span></div></label><label class="group relative flex-1 cursor-pointer" data-v-b794bd1a><input${ssrIncludeBooleanAttr(ssrLooseEqual(form.value.gender, "female")) ? " checked" : ""} type="radio" value="female" class="peer sr-only" data-v-b794bd1a><div class="flex items-center justify-between rounded-xl border-2 border-gray-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 group-active:scale-95 peer-checked:border-blue-500 peer-checked:bg-blue-50/50 peer-checked:shadow-blue-100/50 hover:border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500/10 dark:peer-checked:shadow-none dark:hover:border-blue-500/50" data-v-b794bd1a><span class="text-sm font-semibold text-gray-600 transition-colors peer-checked:text-blue-700 dark:text-gray-300 dark:peer-checked:text-blue-400" data-v-b794bd1a>Female</span></div></label></div></div><div class="mb-4" data-v-b794bd1a><label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300" data-v-b794bd1a> Email </label><input${ssrRenderAttr("value", form.value.email)} type="email" autocomplete="off" class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="your@email.com" data-v-b794bd1a>`);
      if (errors.value.email) {
        _push(`<p class="mt-1 text-sm text-red-500" data-v-b794bd1a>${ssrInterpolate(errors.value.email)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="mb-4" data-v-b794bd1a><label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300" data-v-b794bd1a> Mobile </label><input${ssrRenderAttr("value", form.value.mobile)} type="tel" autocomplete="off" class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Your phone number" data-v-b794bd1a>`);
      if (errors.value.mobile) {
        _push(`<p class="mt-1 text-sm text-red-500" data-v-b794bd1a>${ssrInterpolate(errors.value.mobile)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="mb-6" data-v-b794bd1a><label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300" data-v-b794bd1a> Password </label><input${ssrRenderAttr("value", form.value.password)} type="password" class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Leave empty to keep current" data-v-b794bd1a>`);
      if (errors.value.password) {
        _push(`<p class="mt-1 text-sm text-red-500" data-v-b794bd1a>${ssrInterpolate(errors.value.password)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><button type="submit"${ssrIncludeBooleanAttr(saving.value) ? " disabled" : ""} class="mt-4 w-full rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-md transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800" data-v-b794bd1a>`);
      if (saving.value) {
        _push(`<span class="flex items-center justify-center gap-2" data-v-b794bd1a><span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" data-v-b794bd1a></span> Saving... </span>`);
      } else {
        _push(`<span data-v-b794bd1a>Save</span>`);
      }
      _push(`</button>`);
      if (message.value) {
        _push(`<div class="mt-4 text-center" data-v-b794bd1a><p class="${ssrRenderClass([
          messageType.value === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600",
          "rounded-3xl px-4 py-2"
        ])}" data-v-b794bd1a>${ssrInterpolate(message.value)}</p></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</form></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/ProfileSettingView.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const ProfileSettingView = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b794bd1a"]]);
export {
  ProfileSettingView as default
};
