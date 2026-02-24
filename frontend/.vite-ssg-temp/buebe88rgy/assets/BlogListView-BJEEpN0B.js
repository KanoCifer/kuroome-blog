import { mergeProps, useSSRContext, defineComponent, ref, onMounted, watch, computed, resolveComponent, withCtx, openBlock, createBlock, createVNode, createTextVNode, toDisplayString, unref } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderClass, ssrInterpolate, ssrRenderList, ssrIncludeBooleanAttr } from "vue/server-renderer";
import { _ as _export_sfc, r as request, f as formatDate, u as useNotificationStore } from "../main.mjs";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import "@vueuse/head";
import "pinia";
import "axios";
import "dayjs";
import "dayjs/plugin/utc.js";
const _sfc_main$2 = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  _push(`<svg${ssrRenderAttrs(mergeProps({
    class: "size-4 text-gray-500 dark:text-gray-400",
    "aria-hidden": "true",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, _attrs))}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>`);
}
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/icons/IconTags.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const IconTags = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["ssrRender", _sfc_ssrRender]]);
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "CategorySidebar",
  __ssrInlineRender: true,
  emits: ["filterPosts", "resetFilter"],
  setup(__props, { emit: __emit }) {
    const route = useRoute();
    useRouter();
    const categories = ref([]);
    const activeCategoryId = ref(null);
    const isLoading = ref(false);
    const totalPosts = ref(null);
    const emit = __emit;
    onMounted(() => {
      fetchCategories();
      const categoryId = route.query.category;
      if (categoryId) {
        activeCategoryId.value = parseInt(categoryId, 10);
      }
    });
    watch(
      () => route.query.category,
      (newCategoryId) => {
        if (newCategoryId) {
          activeCategoryId.value = parseInt(newCategoryId, 10);
          fetchPostsByCategory(activeCategoryId.value);
        } else {
          activeCategoryId.value = null;
          emit("resetFilter");
        }
      }
    );
    const fetchCategories = async () => {
      try {
        const response = await request.get("/categories");
        if (response.data.status === "success") {
          categories.value = response.data.data.map(
            (cat) => ({
              id: cat.id,
              name: cat.name,
              post_count: cat.post_count || 0
            })
          );
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    const fetchPostsByCategory = async (categoryId) => {
      isLoading.value = true;
      try {
        const response = await request.post("/category", null, {
          params: { category_id: categoryId }
        });
        if (response.data.status === "success") {
          const posts = response.data.data.posts;
          const categoryName = response.data.data.category?.name || "";
          emit("filterPosts", posts, categoryName);
        }
      } catch (error) {
        console.error("Failed to fetch posts by category:", error);
      } finally {
        isLoading.value = false;
      }
    };
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<aside${ssrRenderAttrs(mergeProps({ class: "w-full lg:w-72 lg:shrink-0" }, _attrs))}><div class="rounded-3xl bg-white p-6 shadow-md dark:border dark:border-gray-700/50 dark:bg-gray-900 dark:shadow-none"><h3 class="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-gray-800 italic dark:text-white">`);
      _push(ssrRenderComponent(IconTags, { class: "size-5!" }, null, _parent));
      _push(` Tags </h3><ul class="space-y-2"><li><button class="${ssrRenderClass([
        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
        activeCategoryId.value === null ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
      ])}"><p class="flex items-center gap-2">`);
      _push(ssrRenderComponent(IconTags, null, null, _parent));
      _push(` 全部文章 </p>`);
      if (totalPosts.value !== null) {
        _push(`<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">${ssrInterpolate(totalPosts.value)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</button></li><!--[-->`);
      ssrRenderList(categories.value, (category) => {
        _push(`<li><button class="${ssrRenderClass([
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
          activeCategoryId.value === category.id ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        ])}"><p class="flex items-center gap-2">`);
        _push(ssrRenderComponent(IconTags, null, null, _parent));
        _push(` ${ssrInterpolate(category.name)}</p><span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">${ssrInterpolate(category.post_count || 0)}</span></button></li>`);
      });
      _push(`<!--]--></ul></div></aside>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/CategorySidebar.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "BlogListView",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    const posts = ref([]);
    const categories = ref([]);
    const pagination = ref(null);
    const isLoading = ref(false);
    const errorMessage = ref("");
    const user = ref({
      isAuthenticated: true,
      id: 1,
      isAdmin: false
    });
    const activeCategory = ref(null);
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
    const fetchPosts = async (page = 1) => {
      isLoading.value = true;
      errorMessage.value = "";
      try {
        const res = await request.get("/blogs", {
          params: { page }
        });
        if (res.data.status === "success") {
          posts.value = res.data.data.posts;
          categories.value = res.data.data.categories;
          pagination.value = res.data.data.pagination;
          currentPage.value = page;
        } else {
          throw new Error(res.data.message || "获取文章列表失败");
        }
      } catch (err) {
        console.error(err);
        errorMessage.value = err instanceof Error ? err.message : "加载文章列表失败，请稍后重试。";
        useNotificationStore().error(errorMessage.value);
      } finally {
        isLoading.value = false;
      }
    };
    onMounted(() => {
      const pageParam = parseInt(route.query.page, 10);
      fetchPosts(isNaN(pageParam) || pageParam < 1 ? 1 : pageParam);
    });
    watch(
      () => route.query.page,
      (newPage) => {
        const pageNum = parseInt(newPage, 10);
        if (!isNaN(pageNum) && pageNum !== currentPage.value) {
          fetchPosts(pageNum);
        }
      }
    );
    watch(
      activeCategory,
      (newVal) => {
      },
      { immediate: true }
    );
    useHead(() => ({
      title: activeCategory.value ? `Category: ${activeCategory.value} - ReadingList Blog` : "ReadingList Blog - 阅读与分享",
      meta: [
        {
          name: "description",
          content: activeCategory.value ? `探索 ${activeCategory.value} 分类下的所有文章 - 个人阅读心得、技术分享、读书笔记` : "ReadingList 博客 - 分享个人阅读心得、技术文章、读书笔记，记录阅读的美好时光"
        },
        {
          name: "keywords",
          content: activeCategory.value ? `${activeCategory.value}, 博客, 阅读, 技术分享, 读书笔记, ReadingList` : "博客, 阅读, 技术分享, 读书笔记, ReadingList, 个人博客, 阅读心得"
        },
        {
          property: "og:title",
          content: activeCategory.value ? `${activeCategory.value} 分类文章 - ReadingList` : "ReadingList Blog"
        },
        {
          property: "og:description",
          content: activeCategory.value ? `探索 ${activeCategory.value} 分类下的所有文章` : "ReadingList 博客 - 分享个人阅读心得、技术文章、读书笔记"
        },
        {
          property: "og:type",
          content: "website"
        },
        {
          property: "og:url",
          content: activeCategory.value ? `https://readinglist.example.com/blog/category/${activeCategory.value}` : "https://readinglist.example.com/blog"
        },
        {
          name: "twitter:title",
          content: activeCategory.value ? `${activeCategory.value} 分类文章 - ReadingList` : "ReadingList Blog"
        },
        {
          name: "twitter:description",
          content: activeCategory.value ? `探索 ${activeCategory.value} 分类下的所有文章` : "ReadingList 博客 - 分享个人阅读心得、技术文章、读书笔记"
        }
      ]
    }));
    const getPreviewHtml = (html, maxLength = 300) => {
      if (!html) return "";
      const tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      const textContent = tmp.textContent || tmp.innerText || "";
      if (textContent.length <= maxLength) {
        return html;
      }
      let currentLength = 0;
      let result = "";
      const traverse = (node) => {
        if (currentLength >= maxLength) return false;
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || "";
          const remaining = maxLength - currentLength;
          if (text.length > remaining) {
            result += text.slice(0, remaining);
            currentLength = maxLength;
            return false;
          }
          result += text;
          currentLength += text.length;
          return true;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node;
          const tag = el.tagName.toLowerCase();
          result += `<${tag}`;
          for (const attr of el.attributes) {
            result += ` ${attr.name}="${attr.value.replace(/"/g, "&quot;")}"`;
          }
          result += `>`;
          for (const child of el.childNodes) {
            if (!traverse(child)) {
              result += `</${tag}>...`;
              return false;
            }
          }
          result += `</${tag}>`;
          return true;
        }
        return true;
      };
      for (const child of tmp.childNodes) {
        if (!traverse(child)) break;
      }
      return result || html.slice(0, maxLength);
    };
    const handleFilterPosts = (filteredPosts, categoryName) => {
      posts.value = filteredPosts;
      activeCategory.value = categoryName;
      pagination.value = null;
    };
    const handleResetFilter = () => {
      activeCategory.value = null;
      fetchPosts(1);
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_router_link = resolveComponent("router-link");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "container mx-auto px-4 py-8" }, _attrs))} data-v-0e73d25e><div class="mb-6 flex items-center justify-between" data-v-0e73d25e><h1 class="font-serif text-3xl font-bold text-shadow-md dark:text-white" data-v-0e73d25e>${ssrInterpolate(activeCategory.value ? `Category: ${activeCategory.value}` : "Blog")}</h1>`);
      if (user.value.isAuthenticated) {
        _push(ssrRenderComponent(_component_router_link, {
          to: "/blog/new",
          class: "inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" data-v-0e73d25e${_scopeId}><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" data-v-0e73d25e${_scopeId}></path></svg> New Post `);
            } else {
              return [
                (openBlock(), createBlock("svg", {
                  xmlns: "http://www.w3.org/2000/svg",
                  class: "mr-2 h-4 w-4",
                  viewBox: "0 0 20 20",
                  fill: "currentColor"
                }, [
                  createVNode("path", {
                    "fill-rule": "evenodd",
                    d: "M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z",
                    "clip-rule": "evenodd"
                  })
                ])),
                createTextVNode(" New Post ")
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_18rem]" data-v-0e73d25e><div class="min-w-0" data-v-0e73d25e><div class="space-y-6" data-v-0e73d25e>`);
      if (isLoading.value) {
        _push(`<div class="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800" data-v-0e73d25e><div class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" data-v-0e73d25e></div><p class="text-gray-600 dark:text-gray-400" data-v-0e73d25e>加载中...</p></div>`);
      } else if (errorMessage.value) {
        _push(`<div class="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center dark:border-red-800 dark:bg-red-900/20" data-v-0e73d25e><svg xmlns="http://www.w3.org/2000/svg" class="mb-4 h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" data-v-0e73d25e><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" data-v-0e73d25e></path></svg><p class="text-lg font-medium text-red-600 dark:text-red-400" data-v-0e73d25e> 加载失败 </p><p class="mt-1 text-sm text-red-500" data-v-0e73d25e>${ssrInterpolate(errorMessage.value)}</p><button class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none" data-v-0e73d25e> 重试 </button></div>`);
      } else if (posts.value.length === 0) {
        _push(`<div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800/30" data-v-0e73d25e><svg xmlns="http://www.w3.org/2000/svg" class="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" data-v-0e73d25e><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" data-v-0e73d25e></path></svg><p class="text-lg font-medium text-gray-500" data-v-0e73d25e> No blog posts available. </p><p class="mt-1 text-sm text-gray-400" data-v-0e73d25e>${ssrInterpolate(activeCategory.value ? "There are no posts in this category yet." : "Check back later for new content.")}</p></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<!--[-->`);
      ssrRenderList(posts.value, (post) => {
        _push(`<div class="${ssrRenderClass([
          "relative mb-8 rounded-3xl p-6 shadow-md transition-all duration-300 hover:shadow-lg dark:shadow-none",
          post.is_pinned ? "bg-linear-to-br from-blue-50 via-sky-50 to-cyan-50 ring-2 ring-blue-400/60 dark:from-blue-950 dark:via-cyan-800 dark:to-blue-950 dark:ring-blue-500/40" : "bg-white dark:border dark:border-gray-700/50 dark:bg-gray-900"
        ])}" data-v-0e73d25e>`);
        if (post.is_pinned) {
          _push(`<div class="absolute -top-3 right-4 flex items-center gap-1.5 rounded-full bg-linear-to-r from-blue-500 to-sky-500 px-3 py-1 text-xs font-bold text-white shadow-md dark:from-blue-600 dark:to-sky-600" data-v-0e73d25e><svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" data-v-0e73d25e><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" data-v-0e73d25e></path></svg> 置顶 </div>`);
        } else {
          _push(`<!---->`);
        }
        _push(ssrRenderComponent(_component_router_link, {
          to: `/blog/${post._id}`,
          class: [
            "mb-2 block text-4xl font-semibold transition-colors",
            post.is_pinned ? "text-blue-900 hover:text-blue-700 dark:text-blue-100 dark:hover:text-blue-300" : "hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
          ]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`${ssrInterpolate(post.title)}`);
            } else {
              return [
                createTextVNode(toDisplayString(post.title), 1)
              ];
            }
          }),
          _: 2
        }, _parent));
        _push(`<p class="${ssrRenderClass([
          "my-4 text-sm",
          post.is_pinned ? "text-blue-700/80 dark:text-blue-300/80" : "text-gray-600 dark:text-gray-400"
        ])}" data-v-0e73d25e> 发布于 ${ssrInterpolate(unref(formatDate)(post.created_at))} `);
        if (post.category) {
          _push(`<span class="ml-2" data-v-0e73d25e></span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</p><div class="${ssrRenderClass([
          "post-preview prose prose-sm max-w-none overflow-hidden rounded-lg p-4 leading-relaxed",
          post.is_pinned ? "dark:prose-invert bg-white/70 ring-1 ring-blue-200/50 dark:bg-black/20 dark:ring-blue-800/30" : "dark:prose-invert bg-gray-50/80 ring-1 ring-gray-200/50 dark:bg-gray-800/50 dark:ring-gray-700/30"
        ])}" data-v-0e73d25e>${getPreviewHtml(post.body) ?? ""}</div><div class="${ssrRenderClass([
          "mt-4 flex items-center justify-between border-t pt-4",
          post.is_pinned ? "border-blue-200/60 dark:border-blue-800/40" : "border-gray-100 dark:border-gray-700"
        ])}" data-v-0e73d25e><div class="${ssrRenderClass([
          "flex items-center gap-4 text-sm",
          post.is_pinned ? "text-blue-700/70 dark:text-blue-300/70" : "text-gray-500 dark:text-gray-400"
        ])}" data-v-0e73d25e>`);
        if (post.category) {
          _push(ssrRenderComponent(_component_router_link, {
            to: `/blog/category/${post.category.id}`,
            class: [
              "flex items-center gap-1.5 transition-colors",
              post.is_pinned ? "hover:text-blue-800 dark:hover:text-blue-400" : "hover:text-blue-600 dark:hover:text-blue-400"
            ],
            title: "Category"
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-0e73d25e${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" data-v-0e73d25e${_scopeId}></path></svg><span data-v-0e73d25e${_scopeId}>${ssrInterpolate(post.category.name)}</span>`);
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
                      d: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    })
                  ])),
                  createVNode("span", null, toDisplayString(post.category.name), 1)
                ];
              }
            }),
            _: 2
          }, _parent));
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
        _push(ssrRenderComponent(_component_router_link, {
          to: `/blog/${post._id}`,
          class: [
            "inline-flex items-center text-sm font-medium transition-colors",
            post.is_pinned ? "text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" : "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          ]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` 阅读更多 <svg class="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-v-0e73d25e${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" data-v-0e73d25e${_scopeId}></path></svg>`);
            } else {
              return [
                createTextVNode(" 阅读更多 "),
                (openBlock(), createBlock("svg", {
                  class: "ml-1 h-3 w-3",
                  fill: "none",
                  stroke: "currentColor",
                  viewBox: "0 0 24 24"
                }, [
                  createVNode("path", {
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    "stroke-width": "2",
                    d: "M14 5l7 7m0 0l-7 7m7-7H3"
                  })
                ]))
              ];
            }
          }),
          _: 2
        }, _parent));
        _push(`</div></div>`);
      });
      _push(`<!--]--></div>`);
      if (pagination.value && pagination.value.pages > 1) {
        _push(`<nav class="mt-6 flex justify-center" data-v-0e73d25e><ul class="flex items-center gap-2" data-v-0e73d25e><li data-v-0e73d25e><button${ssrIncludeBooleanAttr(!pagination.value?.has_prev) ? " disabled" : ""} class="${ssrRenderClass([
          pagination.value?.has_prev ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
          "rounded px-3 py-1 text-sm font-medium transition-colors"
        ])}" data-v-0e73d25e> « 上一页 </button></li>`);
        if (pagination.value && pagination.value.page > 3) {
          _push(`<li data-v-0e73d25e><button class="min-w-10 rounded px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700" data-v-0e73d25e> 1 </button></li>`);
        } else {
          _push(`<!---->`);
        }
        if (pagination.value && pagination.value.page > 4) {
          _push(`<li data-v-0e73d25e><span class="px-1 text-gray-500 dark:text-gray-400" data-v-0e73d25e>...</span></li>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<!--[-->`);
        ssrRenderList(getVisiblePages.value, (pageNum) => {
          _push(`<li data-v-0e73d25e><button class="${ssrRenderClass([
            pageNum === pagination.value?.page ? "bg-blue-600 text-white dark:bg-blue-500" : "bg-white text-gray-700 hover:bg-gray-100 dark:border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
            "min-w-10 rounded px-3 py-1 text-sm font-medium transition-colors"
          ])}" data-v-0e73d25e>${ssrInterpolate(pageNum)}</button></li>`);
        });
        _push(`<!--]-->`);
        if (pagination.value && pagination.value.page < pagination.value.pages - 3) {
          _push(`<li data-v-0e73d25e><span class="px-1 text-gray-500 dark:text-gray-400" data-v-0e73d25e>...</span></li>`);
        } else {
          _push(`<!---->`);
        }
        if (pagination.value && pagination.value.page < pagination.value.pages - 2) {
          _push(`<li data-v-0e73d25e><button class="min-w-10 rounded px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700" data-v-0e73d25e>${ssrInterpolate(pagination.value.pages)}</button></li>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<li data-v-0e73d25e><button${ssrIncludeBooleanAttr(!pagination.value?.has_next) ? " disabled" : ""} class="${ssrRenderClass([
          pagination.value?.has_next ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
          "rounded px-3 py-1 text-sm font-medium transition-colors"
        ])}" data-v-0e73d25e> 下一页 » </button></li></ul></nav>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      _push(ssrRenderComponent(_sfc_main$1, {
        class: "sticky top-40 h-fit self-start",
        onFilterPosts: handleFilterPosts,
        onResetFilter: handleResetFilter
      }, null, _parent));
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/BlogListView.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const BlogListView = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-0e73d25e"]]);
export {
  BlogListView as default
};
