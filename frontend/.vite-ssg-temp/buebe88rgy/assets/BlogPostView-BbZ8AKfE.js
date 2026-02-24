import { defineComponent, ref, watch, onMounted, onUnmounted, mergeProps, nextTick, useSSRContext, computed, unref, resolveComponent, withCtx, openBlock, createBlock, createVNode, createTextVNode, toDisplayString } from "vue";
import { ssrRenderAttrs, ssrRenderList, ssrRenderClass, ssrRenderStyle, ssrInterpolate, ssrRenderAttr, ssrIncludeBooleanAttr, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc, a as useAuthStore, u as useNotificationStore, f as formatDate, r as request } from "../main.mjs";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import "@vueuse/head";
import "pinia";
import "axios";
import "dayjs";
import "dayjs/plugin/utc.js";
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "ArticleToc",
  __ssrInlineRender: true,
  props: {
    content: {}
  },
  setup(__props) {
    const props = __props;
    const toc = ref([]);
    const activeId = ref("");
    const generateId = (index, text) => {
      return `heading-${index}-${text.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`;
    };
    const extractHeadings = (html) => {
      const headings = [];
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const elements = doc.querySelectorAll("h1, h2, h3");
      elements.forEach((el, index) => {
        const text = el.textContent?.trim() || "";
        if (text) {
          const level = parseInt(el.tagName.charAt(1));
          const id = generateId(index, text);
          headings.push({ id, text, level });
        }
      });
      return headings;
    };
    const addIdsToHeadings = () => {
      const contentContainer = document.querySelector(".prose");
      if (!contentContainer) return;
      const headingElements = contentContainer.querySelectorAll("h1, h2, h3");
      headingElements.forEach((el, index) => {
        const text = el.textContent?.trim() || "";
        if (text && !el.id) {
          el.id = generateId(index, text);
        }
      });
    };
    const initHeadings = async () => {
      if (!props.content) return;
      toc.value = extractHeadings(props.content);
      await nextTick();
      setTimeout(addIdsToHeadings, 50);
      setTimeout(addIdsToHeadings, 200);
      setTimeout(addIdsToHeadings, 500);
    };
    watch(
      () => props.content,
      (newContent) => {
        if (newContent) {
          initHeadings();
        } else {
          toc.value = [];
          activeId.value = "";
        }
      },
      { immediate: true }
    );
    const handleScroll = () => {
      if (toc.value.length === 0) return;
      const contentContainer = document.querySelector(".prose");
      if (!contentContainer) return;
      const headingElements = [];
      toc.value.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) headingElements.push(el);
      });
      if (headingElements.length === 0) return;
      const scrollPosition = window.scrollY + 120;
      let foundIndex = -1;
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const el = headingElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex >= 0) {
        const tocItem = toc.value[foundIndex];
        if (tocItem) {
          activeId.value = tocItem.id;
        }
      } else if (headingElements.length > 0 && headingElements[0] && scrollPosition < headingElements[0].offsetTop && toc.value.length > 0 && toc.value[0]) {
        activeId.value = toc.value[0].id;
      }
    };
    onMounted(() => {
      window.addEventListener("scroll", handleScroll, { passive: true });
      setTimeout(() => {
        addIdsToHeadings();
        handleScroll();
      }, 100);
    });
    onUnmounted(() => {
      window.removeEventListener("scroll", handleScroll);
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<aside${ssrRenderAttrs(mergeProps({ class: "w-full lg:w-64 lg:shrink-0" }, _attrs))} data-v-ec2310d6>`);
      if (toc.value.length > 0) {
        _push(`<div class="sticky top-24 rounded-3xl bg-white p-5 shadow-md dark:border dark:border-gray-700/50 dark:bg-gray-900 dark:shadow-none" data-v-ec2310d6><h3 class="mb-4 flex items-center gap-2 font-serif text-base font-semibold text-gray-800 dark:text-white" data-v-ec2310d6><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-ec2310d6><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" data-v-ec2310d6></path></svg> 目录 </h3><nav class="max-h-[60vh] space-y-1 overflow-y-auto pr-2" data-v-ec2310d6><!--[-->`);
        ssrRenderList(toc.value, (item) => {
          _push(`<button class="${ssrRenderClass([
            "group flex w-full items-start rounded-lg px-3 py-2 text-left text-sm transition-all",
            activeId.value === item.id ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          ])}" style="${ssrRenderStyle({ paddingLeft: `${(item.level - 1) * 12 + 12}px` })}" data-v-ec2310d6><span class="line-clamp-2" data-v-ec2310d6>${ssrInterpolate(item.text)}</span></button>`);
        });
        _push(`<!--]--></nav></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</aside>`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/ArticleToc.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const ArticleToc = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-ec2310d6"]]);
const maxChars = 1e3;
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "CommentForm",
  __ssrInlineRender: true,
  props: {
    postId: {},
    isReply: { type: Boolean, default: false },
    replyTo: { default: void 0 },
    replyToAuthor: { default: void 0 }
  },
  setup(__props) {
    const auth = useAuthStore();
    useNotificationStore();
    const author = ref("");
    const email = ref("");
    const site = ref("");
    const body = ref("");
    const isSubmitting = ref(false);
    const isFocused = ref(false);
    const charCount = computed(() => body.value.length);
    const isValid = computed(() => {
      if (auth.isAuthenticated) {
        return body.value.trim().length > 0 && body.value.length <= maxChars;
      }
      return author.value.trim().length > 0 && body.value.trim().length > 0 && body.value.length <= maxChars;
    });
    const emojis = ["👍", "❤️", "😊", "🎉", "🤔", "👀"];
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: [
          __props.isReply ? "mt-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200 dark:bg-gray-800/50 dark:ring-gray-700" : "mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/30 dark:shadow-none"
        ]
      }, _attrs))}><div class="mb-4 flex items-center justify-between">`);
      if (!__props.isReply) {
        _push(`<h4 class="gap-2 text-lg font-semibold text-gray-900 dark:text-white"> 发表评论 <span class="ml-2 rounded-full border border-blue-200 bg-blue-200/30 px-4 py-2 text-xs font-medium text-blue-400">*评论发布后请等待管理员审核</span></h4>`);
      } else {
        _push(`<h4 class="text-sm font-medium text-gray-600 dark:text-gray-400"> 回复 @${ssrInterpolate(__props.replyToAuthor)}</h4>`);
      }
      if (__props.isReply && __props.replyTo) {
        _push(`<button class="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"> 取消 </button>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (!unref(auth).isAuthenticated) {
        _push(`<!--[--><div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><div class="relative"><label class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"> 昵称 * </label><input${ssrRenderAttr("value", author.value)} type="text" placeholder="你的名字" class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400"></div><div class="relative"><label class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"> 邮箱 * </label><input${ssrRenderAttr("value", email.value)} type="email" placeholder="your@email.com" class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400"></div></div><div class="mb-4"><label class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"> 网站 </label><input${ssrRenderAttr("value", site.value)} type="url" placeholder="https://yourwebsite.com" class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400"></div><!--]-->`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="${ssrRenderClass([
        "relative rounded-xl border transition-all duration-200",
        isFocused.value ? "border-blue-500 bg-white ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-gray-800/50" : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30"
      ])}"><textarea rows="4"${ssrRenderAttr("placeholder", __props.isReply ? "写下你的回复..." : "写下你的评论...")}${ssrRenderAttr("maxlength", maxChars)} class="w-full resize-none rounded-xl border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-500">${ssrInterpolate(body.value)}</textarea><div class="flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-gray-700"><div class="flex items-center gap-1"><!--[-->`);
      ssrRenderList(emojis, (emoji) => {
        _push(`<button type="button" class="rounded-lg p-1.5 text-lg transition-all hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-700"${ssrRenderAttr("title", emoji)}>${ssrInterpolate(emoji)}</button>`);
      });
      _push(`<!--]--></div><div class="${ssrRenderClass([
        "text-xs",
        charCount.value > maxChars ? "text-red-500" : charCount.value > maxChars * 0.9 ? "text-orange-500" : "text-gray-400 dark:text-gray-500"
      ])}">${ssrInterpolate(charCount.value)} / ${ssrInterpolate(maxChars)}</div></div></div><div class="mt-4 flex items-center justify-end gap-3">`);
      if (!unref(auth).isAuthenticated) {
        _push(`<p class="mr-auto text-xs text-gray-500 dark:text-gray-400"> * 为必填项，邮箱不会被公开显示 </p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<button type="submit"${ssrIncludeBooleanAttr(!isValid.value || isSubmitting.value) ? " disabled" : ""} class="${ssrRenderClass([
        "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200",
        isValid.value && !isSubmitting.value ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/40 dark:bg-blue-500 dark:hover:bg-blue-600" : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
      ])}">`);
      if (isSubmitting.value) {
        _push(`<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
      } else {
        _push(`<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>`);
      }
      _push(` ${ssrInterpolate(isSubmitting.value ? "提交中..." : "发表评论")}</button></div></div>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/CommentForm.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "CommentItem",
  __ssrInlineRender: true,
  props: {
    comment: {},
    postId: {},
    depth: { default: 0 }
  },
  emits: ["reply"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const { comment, depth } = props;
    const isReplying = ref(false);
    const replyBody = ref("");
    const emit = __emit;
    return (_ctx, _push, _parent, _attrs) => {
      const _component_CommentItem = resolveComponent("CommentItem", true);
      _push(`<div${ssrRenderAttrs(mergeProps({
        id: `comment-${unref(comment)._id}`,
        class: "group transition-all duration-200 first:mt-0",
        style: { marginLeft: `${unref(depth) * 1.5}rem` }
      }, _attrs))}><div class="${ssrRenderClass([[
        "mb-2",
        !unref(comment).reviewed ? "gap-y-4 border-yellow-300 bg-yellow-50 ring-4 ring-yellow-50/50 dark:border-yellow-700/50 dark:bg-yellow-900/20 dark:ring-yellow-900/30" : "bg-white dark:bg-gray-800"
      ], "relative rounded-2xl border border-gray-100 p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700"])}"><div class="mb-3 flex items-start justify-between"><div class="flex items-center gap-3"><div class="${ssrRenderClass([
        "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
        "bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 dark:from-sky-900 dark:to-blue-900 dark:text-blue-300"
      ])}">${ssrInterpolate(unref(comment).author?.charAt(0).toUpperCase() || "?")}</div><div><div class="flex items-center gap-2"><span class="font-semibold text-gray-900 dark:text-gray-100">${ssrInterpolate(unref(comment).author)}</span>`);
      if (!unref(comment).reviewed) {
        _push(`<span class="inline-flex items-center rounded-md bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-yellow-600/20 ring-inset dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-300/20"> Pending </span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="text-xs text-gray-500 dark:text-gray-400">${ssrInterpolate(unref(comment).created_at ? unref(formatDate)(unref(comment).created_at) : "N/A")}</div></div></div></div><div class="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">`);
      if (unref(comment).reply_to_author) {
        _push(`<span class="font-medium text-blue-600 dark:text-blue-400"> @${ssrInterpolate(unref(comment).reply_to_author)}</span>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(comment).reply_to_author) {
        _push(`<span> </span>`);
      } else {
        _push(`<!---->`);
      }
      _push(` ${ssrInterpolate(unref(comment).body)}</div>`);
      if (isReplying.value) {
        _push(`<div class="mt-4 space-y-3"><div class="flex gap-3"><div class="relative flex-1"><textarea${ssrRenderAttr("placeholder", `Reply to @${unref(comment).author}...`)} rows="3" class="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/30">${ssrInterpolate(replyBody.value)}</textarea><div class="absolute right-2 bottom-2 text-xs text-gray-400 dark:text-gray-500"> Ctrl+Enter to submit </div></div></div><div class="flex items-center justify-end gap-2"><button type="button" class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"> Cancel </button><button type="button"${ssrIncludeBooleanAttr(!replyBody.value.trim()) ? " disabled" : ""} class="${ssrRenderClass([
          "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
          replyBody.value.trim() ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-600" : "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400"
        ])}"> Reply </button></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="mt-4 flex items-center justify-between border-t border-gray-50 pt-3 dark:border-gray-700"><div>`);
      if (!isReplying.value) {
        _push(`<button type="button" class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg> Reply </button>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (!unref(comment).reviewed) {
        _push(`<div class="flex gap-2"><button type="button" class="rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"> Approve </button><button type="button" class="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"> Delete </button></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
      if (unref(comment).comments && unref(comment).comments.length > 0) {
        _push(`<div class="mt-4"><!--[-->`);
        ssrRenderList(unref(comment).comments, (subComment) => {
          _push(ssrRenderComponent(_component_CommentItem, {
            key: subComment._id,
            comment: subComment,
            "post-id": props.postId,
            depth: unref(depth) + 1,
            onReply: (commentId, body) => emit("reply", commentId, body)
          }, null, _parent));
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/CommentItem.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "BlogPostView",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    useRouter();
    const postId = ref(route.params.id);
    const post = ref(null);
    const isLoading = ref(false);
    const errorMessage = ref("");
    const notFound = ref(false);
    const auth = useAuthStore();
    const showEditButton = computed(() => !!auth.user?.is_admin);
    const fetchPost = async () => {
      if (!postId.value) {
        errorMessage.value = "无效的文章 ID";
        return;
      }
      isLoading.value = true;
      errorMessage.value = "";
      try {
        const res = await request.get("/post", {
          params: { _id: postId.value }
        });
        if (res.data.status === "success") {
          post.value = res.data.data;
        } else {
          throw new Error(res.data.message || "获取文章失败");
        }
      } catch (err) {
        console.error(err);
        errorMessage.value = err instanceof Error ? err.message : "加载文章失败，请稍后重试。";
        useNotificationStore().error(errorMessage.value);
      } finally {
        isLoading.value = false;
      }
    };
    onMounted(() => {
      fetchPost();
    });
    watch(
      () => route.params.id,
      (newId) => {
        if (newId && newId !== postId.value) {
          postId.value = newId;
          fetchPost();
        }
      }
    );
    useHead(() => ({
      title: post.value ? `${post.value.title} - ReadingList` : "文章未找到 - ReadingList",
      meta: [
        {
          name: "description",
          content: post.value ? post.value.summary || `阅读 ${post.value.title} 的完整内容` : "抱歉，您请求的文章不存在或已被删除"
        },
        {
          name: "keywords",
          content: post.value ? [
            post.value.title,
            post.value.author || "Kurroome",
            post.value.category?.name || "博客",
            "阅读",
            "读书笔记",
            "个人博客"
          ].filter(Boolean).join(", ") : "文章未找到, 阅读清单, ReadingList"
        },
        {
          property: "og:title",
          content: post.value ? post.value.title : "文章未找到"
        },
        {
          property: "og:description",
          content: post.value ? post.value.summary || `阅读 ${post.value.title} 的完整内容` : "抱歉，您请求的文章不存在或已被删除"
        },
        {
          property: "og:type",
          content: "article"
        },
        {
          property: "og:url",
          content: `https://readinglist.example.com/blog/${postId.value}`
        },
        {
          property: "og:article:author",
          content: post.value?.author || "Kurroome"
        },
        {
          property: "og:article:published_time",
          content: post.value?.created_at
        },
        {
          property: "og:article:modified_time",
          content: post.value?.updated_at
        },
        {
          property: "og:article:section",
          content: post.value?.category?.name || "博客"
        },
        {
          name: "twitter:title",
          content: post.value ? post.value.title : "文章未找到"
        },
        {
          name: "twitter:description",
          content: post.value ? post.value.summary || `阅读 ${post.value.title} 的完整内容` : "抱歉，您请求的文章不存在或已被删除"
        }
      ]
    }));
    const comments = computed(() => {
      return post.value?.comments || [];
    });
    const handleReply = async (commentId, body) => {
      try {
        const findComment = (commentsList, id) => {
          for (const comment of commentsList) {
            if (comment._id === id) {
              return comment;
            }
            if (comment.comments && comment.comments.length > 0) {
              const found = findComment(comment.comments, id);
              if (found) {
                return found;
              }
            }
          }
          return void 0;
        };
        const parentComment = findComment(post.value?.comments || [], commentId);
        if (!parentComment) {
          useNotificationStore().error("找不到要回复的评论");
          return;
        }
        const res = await request.post("/comments", {
          post_id: postId.value,
          body,
          reply_to: commentId,
          // 被回复的评论ID
          reply_to_author: parentComment.author,
          // 被回复者用户名
          author: auth.isAuthenticated && auth.user ? auth.user.username : ""
        });
        if (res.data.status === "success" || res.status === 200 || res.status === 201) {
          useNotificationStore().success("评论已提交，待审核后显示");
          await fetchPost();
        } else {
          throw new Error(res.data.message || "提交评论失败");
        }
      } catch (err) {
        console.error("提交回复失败:", err);
        const errorMsg = err instanceof Error ? err.message : "提交评论失败，请稍后重试";
        useNotificationStore().error(errorMsg);
      }
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_router_link = resolveComponent("router-link");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "container mx-auto px-4 py-8" }, _attrs))}>`);
      _push(ssrRenderComponent(_component_router_link, {
        to: "/blog",
        class: "group mb-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<svg class="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"${_scopeId}></path></svg> 返回博客列表 `);
          } else {
            return [
              (openBlock(), createBlock("svg", {
                class: "h-4 w-4 transition-transform group-hover:-translate-x-1",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24"
              }, [
                createVNode("path", {
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                  "stroke-width": "2",
                  d: "M15 19l-7-7 7-7"
                })
              ])),
              createTextVNode(" 返回博客列表 ")
            ];
          }
        }),
        _: 1
      }, _parent));
      if (isLoading.value) {
        _push(`<div class="flex min-h-[60vh] flex-col items-center justify-center"><div class="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div><p class="mt-4 text-gray-600 dark:text-gray-400">加载中...</p></div>`);
      } else if (errorMessage.value) {
        _push(`<div class="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center dark:border-red-800 dark:bg-red-900/20"><svg xmlns="http://www.w3.org/2000/svg" class="mb-4 h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"></path></svg><p class="text-lg font-medium text-red-600 dark:text-red-400">加载失败</p><p class="mt-1 text-sm text-red-500">${ssrInterpolate(errorMessage.value)}</p><div class="mt-4 space-x-4"><button class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"> 重试 </button><button class="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"> 返回列表 </button></div></div>`);
      } else if (notFound.value || !post.value) {
        _push(`<div class="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center"><div class="mb-4 text-9xl font-bold text-gray-200 dark:text-gray-700"> 404 </div><h2 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white"> 文章未找到 </h2><p class="mb-6 text-gray-600 dark:text-gray-400"> 抱歉，您请求的文章不存在或已被删除。 </p><button class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"> 返回文章列表 </button></div>`);
      } else {
        _push(`<div class="mx-auto max-w-6xl"><div class="flex flex-col gap-8 lg:flex-row"><div class="min-w-0 flex-1"><div class="mb-8 rounded-3xl bg-white/80 p-8 shadow-md backdrop-blur-sm dark:border dark:border-gray-700/50 dark:bg-gray-900 dark:shadow-none"><h1 class="mb-6 text-4xl font-bold dark:text-white">${ssrInterpolate(post.value.title)}</h1><div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400"><div class="flex items-center gap-2"><div class="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-sky-600 text-lg font-bold text-white">${ssrInterpolate(post.value.author?.charAt(0).toUpperCase() || "K")}</div><span class="font-medium text-gray-900 dark:text-gray-200">@${ssrInterpolate(post.value.author || "Kurroome")}</span></div><span class="text-gray-400">·</span><div class="flex items-center gap-1"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`);
        if (post.value.created_at && post.value.updated_at !== post.value.created_at) {
          _push(`<span>${ssrInterpolate(unref(formatDate)(post.value.updated_at))}</span>`);
        } else {
          _push(`<span>${ssrInterpolate(unref(formatDate)(post.value.created_at))}</span>`);
        }
        _push(`</div>`);
        if (post.value.category) {
          _push(`<span class="flex items-center gap-1"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>`);
          _push(ssrRenderComponent(_component_router_link, {
            to: `/blog/category/${post.value.category.id}`,
            class: "text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`${ssrInterpolate(post.value.category.name)}`);
              } else {
                return [
                  createTextVNode(toDisplayString(post.value.category.name), 1)
                ];
              }
            }),
            _: 1
          }, _parent));
          _push(`</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div><div class="mb-8 rounded-3xl bg-white/80 px-8 py-8 shadow-md backdrop-blur-sm md:px-12 md:py-10 dark:border dark:border-gray-700/50 dark:bg-gray-900 dark:shadow-none"><div class="prose prose-sm dark:prose-invert sm:prose-base lg:prose-lg max-w-none">`);
        if (post.value.body) {
          _push(`<div>${post.value.body ?? ""}</div>`);
        } else {
          _push(`<div class="text-gray-400 italic">暂无内容</div>`);
        }
        _push(`</div></div><div id="comments" class="rounded-3xl bg-white/80 p-8 shadow-md backdrop-blur-sm dark:border dark:border-gray-700/50 dark:bg-gray-900 dark:shadow-none"><div class="mb-8 flex items-center gap-4 border-b border-gray-100 pb-6 dark:border-gray-700"><h3 class="text-2xl font-bold text-gray-900 dark:text-white"> 评论 </h3>`);
        if (post.value.comments && post.value.comments.length > 0) {
          _push(`<span class="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">${ssrInterpolate(post.value.comments.length)}</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
        if (comments.value.length > 0) {
          _push(`<div class="space-y-6"><!--[-->`);
          ssrRenderList(comments.value, (comment) => {
            _push(ssrRenderComponent(_sfc_main$1, {
              key: comment._id,
              comment,
              "post-id": postId.value,
              onReply: handleReply
            }, null, _parent));
          });
          _push(`<!--]--></div>`);
        } else {
          _push(`<div class="mb-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center dark:border-gray-700 dark:bg-gray-800/30"><div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"><svg class="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg></div><h3 class="text-lg font-semibold text-gray-900 dark:text-white"> 暂无评论 </h3><p class="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400"> 成为第一个评论的人吧！ </p></div>`);
        }
        _push(ssrRenderComponent(_sfc_main$2, { "post-id": postId.value }, null, _parent));
        _push(`</div><div class="mt-8 flex justify-center">`);
        if (showEditButton.value) {
          _push(ssrRenderComponent(_component_router_link, {
            to: `/blog/edit/${post.value._id}`,
            class: "ml-4 inline-flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700 shadow-md transition-all hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"${_scopeId}></path></svg> 编辑文章 `);
              } else {
                return [
                  (openBlock(), createBlock("svg", {
                    class: "h-4 w-4",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24"
                  }, [
                    createVNode("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "stroke-width": "2",
                      d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    })
                  ])),
                  createTextVNode(" 编辑文章 ")
                ];
              }
            }),
            _: 1
          }, _parent));
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div>`);
        _push(ssrRenderComponent(ArticleToc, {
          content: post.value.body
        }, null, _parent));
        _push(`</div></div>`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/BlogPostView.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
