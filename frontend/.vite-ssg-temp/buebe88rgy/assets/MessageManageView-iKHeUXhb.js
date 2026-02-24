import { defineComponent, mergeProps, useSSRContext, ref, onMounted } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderList, ssrIncludeBooleanAttr, ssrRenderClass, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import { a as useAuthStore, r as request, _ as _export_sfc } from "../main.mjs";
import { useRouter } from "vue-router";
import "@vueuse/head";
import "pinia";
import "axios";
import "dayjs/plugin/utc.js";
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "CommentsTab",
  __ssrInlineRender: true,
  props: {
    pendingComments: {},
    approvedComments: {},
    loading: { type: Boolean },
    actionLoading: {}
  },
  emits: ["approve", "delete"],
  setup(__props, { emit: __emit }) {
    dayjs.extend(relativeTime);
    const props = __props;
    const formatTime = (dateStr) => {
      return dayjs(dateStr).fromNow();
    };
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-6" }, _attrs))}><div class="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10"><h2 class="mb-6 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs text-white">${ssrInterpolate(props.pendingComments.length)}</span> Pending Review </h2>`);
      if (props.pendingComments.length > 0) {
        _push(`<div class="space-y-4"><!--[-->`);
        ssrRenderList(props.pendingComments, (comment) => {
          _push(`<div class="rounded-3xl border-l-4 border-orange-400 bg-orange-50/50 p-4 dark:border-orange-500 dark:bg-orange-900/20"><div class="mb-3 flex items-start justify-between"><div><h3 class="font-semibold text-gray-900 dark:text-gray-100">${ssrInterpolate(comment.author || "Anonymous")}</h3><p class="text-xs text-gray-500 dark:text-gray-400"> On: ${ssrInterpolate(comment.post_title)}</p><p class="text-sm text-gray-500 dark:text-gray-400">${ssrInterpolate(formatTime(comment.created_at))}</p></div><span class="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"> Pending </span></div><p class="mb-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">${ssrInterpolate(comment.body)}</p><div class="flex gap-3"><button type="button"${ssrIncludeBooleanAttr(props.actionLoading === comment._id) ? " disabled" : ""} class="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700">`);
          if (props.actionLoading === comment._id) {
            _push(`<svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
          } else {
            _push(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`);
          }
          _push(` Approve </button><button type="button"${ssrIncludeBooleanAttr(props.actionLoading === comment._id) ? " disabled" : ""} class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700">`);
          if (props.actionLoading === comment._id) {
            _push(`<svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
          } else {
            _push(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`);
          }
          _push(` Delete </button></div></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="rounded-xl bg-gray-50 p-8 text-center dark:bg-gray-700/30"><p class="text-gray-500 dark:text-gray-400"> No pending comments to review. </p></div>`);
      }
      _push(`</div><div class="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10"><h2 class="mb-6 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white">${ssrInterpolate(props.approvedComments.length)}</span> Recently Approved </h2>`);
      if (props.approvedComments.length > 0) {
        _push(`<div class="space-y-4"><!--[-->`);
        ssrRenderList(props.approvedComments, (comment) => {
          _push(`<div class="rounded-xl border-l-4 border-green-400 bg-green-50/50 p-4 dark:border-green-500 dark:bg-green-900/20"><div class="mb-3 flex items-start justify-between"><div><h3 class="font-semibold text-gray-900 dark:text-gray-100">${ssrInterpolate(comment.author || "Anonymous")}</h3><p class="text-xs text-gray-500 dark:text-gray-400"> On: ${ssrInterpolate(comment.post_title)}</p><p class="text-sm text-gray-500 dark:text-gray-400">${ssrInterpolate(formatTime(comment.created_at))}</p></div><span class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300"> Approved </span></div><p class="mb-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">${ssrInterpolate(comment.body)}</p><button type="button"${ssrIncludeBooleanAttr(props.actionLoading === comment._id) ? " disabled" : ""} class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700">`);
          if (props.actionLoading === comment._id) {
            _push(`<svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
          } else {
            _push(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`);
          }
          _push(` Delete </button></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="rounded-xl bg-gray-50 p-8 text-center dark:bg-gray-700/30"><p class="text-gray-500 dark:text-gray-400"> No approved comments yet. </p></div>`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/CommentsTab.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "MessagesTab",
  __ssrInlineRender: true,
  props: {
    pendingMessages: {},
    approvedMessages: {},
    loading: { type: Boolean },
    actionLoading: {}
  },
  emits: ["approve", "delete"],
  setup(__props, { emit: __emit }) {
    dayjs.extend(relativeTime);
    const props = __props;
    const formatTime = (dateStr) => {
      return dayjs(dateStr).fromNow();
    };
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-6" }, _attrs))}><div class="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10"><h2 class="mb-6 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs text-white">${ssrInterpolate(props.pendingMessages.length)}</span> Pending Review </h2>`);
      if (props.pendingMessages.length > 0) {
        _push(`<div class="space-y-4"><!--[-->`);
        ssrRenderList(props.pendingMessages, (message) => {
          _push(`<div class="rounded-xl border-l-4 border-orange-400 bg-orange-50/50 p-4 dark:border-orange-500 dark:bg-orange-900/20"><div class="mb-3 flex items-start justify-between"><div><h3 class="font-semibold text-gray-900 dark:text-gray-100">${ssrInterpolate(message.name || "Anonymous")}</h3><p class="text-sm text-gray-500 dark:text-gray-400">${ssrInterpolate(formatTime(message.created_at))}</p></div><span class="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"> Pending </span></div><p class="mb-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">${ssrInterpolate(message.message)}</p><div class="flex gap-3"><button type="button"${ssrIncludeBooleanAttr(props.actionLoading === message.id) ? " disabled" : ""} class="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700">`);
          if (props.actionLoading === message.id) {
            _push(`<svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
          } else {
            _push(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`);
          }
          _push(` Approve </button><button type="button"${ssrIncludeBooleanAttr(props.actionLoading === message.id) ? " disabled" : ""} class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700">`);
          if (props.actionLoading === message.id) {
            _push(`<svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
          } else {
            _push(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`);
          }
          _push(` Delete </button></div></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="rounded-xl bg-gray-50 p-8 text-center dark:bg-gray-700/30"><p class="text-gray-500 dark:text-gray-400"> No pending messages to review. </p></div>`);
      }
      _push(`</div><div class="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10"><h2 class="mb-6 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white">${ssrInterpolate(props.approvedMessages.length)}</span> Recently Approved </h2>`);
      if (props.approvedMessages.length > 0) {
        _push(`<div class="space-y-4"><!--[-->`);
        ssrRenderList(props.approvedMessages, (message) => {
          _push(`<div class="rounded-xl border-l-4 border-green-400 bg-green-50/50 p-4 dark:border-green-500 dark:bg-green-900/20"><div class="mb-3 flex items-start justify-between"><div><h3 class="font-semibold text-gray-900 dark:text-gray-100">${ssrInterpolate(message.name || "Anonymous")}</h3><p class="text-sm text-gray-500 dark:text-gray-400">${ssrInterpolate(formatTime(message.created_at))}</p></div><span class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300"> Approved </span></div><p class="mb-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">${ssrInterpolate(message.message)}</p><button type="button"${ssrIncludeBooleanAttr(props.actionLoading === message.id) ? " disabled" : ""} class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700">`);
          if (props.actionLoading === message.id) {
            _push(`<svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
          } else {
            _push(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`);
          }
          _push(` Delete </button></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="rounded-xl bg-gray-50 p-8 text-center dark:bg-gray-700/30"><p class="text-gray-500 dark:text-gray-400"> No approved messages yet. </p></div>`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/MessagesTab.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent(({
	name: 'MessageManageView',
	__name: 'MessageManageView',
	__ssrInlineRender: true,
	setup(__props) {
		dayjs.extend(relativeTime);
		const auth = useAuthStore();
		const router = useRouter();
		const activeTab = ref('messages');
		const pendingMessages = ref([]);
		const approvedMessages = ref([]);
		const pendingComments = ref([]);
		const approvedComments = ref([]);
		const loading = ref(false);
		const error = ref('');
		const actionLoading = ref(null);
		onMounted(async () => {
			if (auth.user === null && !auth.loading) {
				await auth.fetchUser();
			}
			if (!auth.isAuthenticated || auth.user?.id !== 1) {
				router.push('/');
				return;
			}
			await Promise.all([fetchMessages(), fetchComments()]);
		});
		const fetchMessages = async () => {
			loading.value = true;
			error.value = '';
			try {
				console.log('[MessageManage] Fetching messages...');
				const response = await request.get('/admin/messages');
				const result = response.data;
				if (response.status === 200) {
					const pending = result.data?.pending ? result.data.pending : [];
					const approved = result.data?.approved ? result.data.approved : [];
					pendingMessages.value = pending;
					approvedMessages.value = approved;
				} else {
					error.value = result.error?.message || result.description || 'Failed to load messages';
				}
			} catch {
				error.value = 'Network error occurred';
			} finally {
				loading.value = false;
			}
		};
		const fetchComments = async () => {
			loading.value = true;
			error.value = '';
			try {
				console.log('[CommentManage] Fetching comments...');
				const response = await request.get('/admin/comments');
				const result = response.data;
				if (response.status === 200) {
					const pending = result.data?.pending ? result.data.pending : [];
					const approved = result.data?.approved ? result.data.approved : [];
					pendingComments.value = pending;
					approvedComments.value = approved;
				} else {
					error.value = result.error?.message || result.description || 'Failed to load comments';
				}
			} catch {
				error.value = 'Network error occurred';
			} finally {
				loading.value = false;
			}
		};
		const handleApprove = async (itemId) => {
			actionLoading.value = itemId;
			try {
				if (activeTab.value === 'messages') {
					await request.post(`/admin/messages/${itemId}/approve`);
					await fetchMessages();
				} else {
					await request.post(`/admin/comments/${itemId}/approve`);
					await fetchComments();
				}
			} catch (err) {
				if (err instanceof Error) error.value = err.message || 'Network error occurred';
				else error.value = 'Network error occurred';
			} finally {
				actionLoading.value = null;
			}
		};
		const handleDelete = async (itemId) => {
			actionLoading.value = itemId;
			try {
				if (activeTab.value === 'messages') {
					await request.delete(`/admin/messages/${itemId}/delete`);
					await fetchMessages();
				} else {
					await request.delete(`/admin/comments/${itemId}/delete`);
					await fetchComments();
				}
			} catch (err) {
				if (err instanceof Error) error.value = err.message || 'Network error occurred';
				else error.value = 'Network error occurred';
			} finally {
				actionLoading.value = null;
			}
		};
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: 'mx-auto max-w-5xl space-y-8' }, _attrs))} data-v-82ef3e4b><div class="mb-8 flex items-center justify-between rounded-3xl bg-gray-50/50 px-4 py-6 backdrop-blur-sm dark:bg-gray-900/30" data-v-82ef3e4b><h1 class="mr-4 flex items-center gap-3 text-3xl font-bold text-gray-800 dark:text-gray-100" data-v-82ef3e4b>${ssrInterpolate(activeTab.value === 'messages' ? 'Message Management' : 'Comment Management')} <span class="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400" data-v-82ef3e4b> Admin Only </span></h1><div class="flex gap-4" data-v-82ef3e4b><button type="button" class="${ssrRenderClass([activeTab.value === 'messages' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200', 'border-b-2 px-1 py-4 text-sm font-medium transition-colors'])}" data-v-82ef3e4b> 💬 Messages </button><button type="button" class="${ssrRenderClass([activeTab.value === 'comments' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200', 'border-b-2 px-1 py-4 text-sm font-medium transition-colors'])}" data-v-82ef3e4b> 📝 Comments </button></div><div class="flex items-center gap-3" data-v-82ef3e4b><button${ssrIncludeBooleanAttr(loading.value) ? ' disabled' : ''} class="group flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-semibold text-white shadow-md transition-all select-none hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50" data-v-82ef3e4b><svg class="${ssrRenderClass([loading.value ? 'animate-spin' : 'group-hover:rotate-180', 'h-4 w-4 transition-transform'])}" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-82ef3e4b><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" data-v-82ef3e4b></path></svg> ${ssrInterpolate(loading.value ? 'Refreshing...' : 'Refresh')}</button><button class="group flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-md transition-all select-none hover:bg-blue-700 hover:shadow-lg" data-v-82ef3e4b><svg class="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-82ef3e4b><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" data-v-82ef3e4b></path></svg> 返回 </button></div></div>`);
			if (error.value) {
				_push(`<div class="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200" data-v-82ef3e4b><div class="flex items-center" data-v-82ef3e4b><svg class="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20" data-v-82ef3e4b><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" data-v-82ef3e4b></path></svg> ${ssrInterpolate(error.value)}</div></div>`);
			} else {
				_push(`<!---->`);
			}
			if (loading.value) {
				_push(`<div class="py-12 text-center" data-v-82ef3e4b><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" data-v-82ef3e4b></div><p class="mt-2 text-gray-600 dark:text-gray-400" data-v-82ef3e4b> Loading ${ssrInterpolate(activeTab.value === 'messages' ? 'messages' : 'comments')}... </p></div>`);
			} else {
				_push(`<div class="relative" data-v-82ef3e4b><div class="tab-content" style="${ssrRenderStyle(activeTab.value === 'messages' ? null : { display: 'none' })}" data-v-82ef3e4b>`);
				_push(ssrRenderComponent(_sfc_main$1, {
					'pending-messages': pendingMessages.value,
					'approved-messages': approvedMessages.value,
					loading: loading.value,
					'action-loading': actionLoading.value,
					onApprove: handleApprove,
					onDelete: handleDelete
				}, null, _parent));
				_push(`</div><div class="tab-content" style="${ssrRenderStyle(activeTab.value === 'comments' ? null : { display: 'none' })}" data-v-82ef3e4b>`);
				_push(ssrRenderComponent(_sfc_main$2, {
					'pending-comments': pendingComments.value,
					'approved-comments': approvedComments.value,
					loading: loading.value,
					'action-loading': actionLoading.value,
					onApprove: handleApprove,
					onDelete: handleDelete
				}, null, _parent));
				_push(`</div></div>`);
			}
			_push(`</div>`);
		};
	}
}));
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/MessageManageView.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const MessageManageView = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-82ef3e4b"]]);
export {
  MessageManageView as default
};
