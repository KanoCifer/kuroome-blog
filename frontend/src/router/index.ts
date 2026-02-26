import { useAuthStore } from "@/stores/auth";
import { reportVisitorData } from "@/utils/visitorTracker";
import HomeView from "@/views/HomeView.vue";
import { createMemoryHistory, createRouter, createWebHistory } from "vue-router";

declare global {
  interface Window {
    visitorReportTimer?: ReturnType<typeof setTimeout>;
  }
}
// 根据环境选择 history 类型
const history = import.meta.env.SSR
  ? createMemoryHistory(import.meta.env.BASE_URL)
  : createWebHistory(import.meta.env.BASE_URL);

const router = createRouter({
  history,
  routes: [
    {
      path: "/api-docs",
      name: "api-docs",
      component: () => import("@/views/ApiDocs.vue"),
      meta: {
        title: "API 文档 - Kuroome's Blog",
        description: "查看 Kuroome's Blog 项目的 API 文档，了解后端接口详情",
        keywords: "API文档,接口文档,后端接口",
      },
    },
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: {
        title: "Kuroome's Blog - 个人阅读清单与博客",
        description: "个人阅读清单管理项目，包含博客系统、书籍管理和阅读记录",
        keywords: "阅读清单,博客,书籍管理,个人知识库",
      },
    },
    {
      path: "/about",
      name: "about",
      component: () => import("@/views/AboutView.vue"),
      meta: {
        title: "关于我 - Kuroome's Blog",
        description: "关于 Kuroome's Blog 项目和作者的介绍",
        keywords: "关于,作者,项目介绍",
      },
    },
    {
      path: "/changelog",
      name: "changelog",
      component: () => import("@/views/ChangelogView.vue"),
      meta: {
        title: "变更日志 - Kuroome's Blog",
        description: "网站更新历史与变更记录",
        keywords: "变更日志,更新记录,版本历史",
      },
    },
    {
      path: "/blog",
      name: "blog-list",
      component: () => import("@/views/BlogListView.vue"),
      meta: {
        title: "博客列表 - Kuroome's Blog",
        description: "个人博客文章列表，分享技术心得和生活感悟",
        keywords: "博客,文章,技术分享,生活感悟",
      },
    },
    {
      path: "/blog/new",
      name: "blog-new",
      component: () => import("@/views/BlogEditView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/blog/edit/:id",
      name: "blog-edit",
      component: () => import("@/views/BlogEditView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/blog/category/:categoryId",
      name: "blog-category",
      component: () => import("@/views/BlogListView.vue"),
      meta: {
        title: "博客分类 - Kuroome's Blog",
        description: "按分类浏览博客文章",
        keywords: "博客分类,文章分类",
      },
    },
    {
      path: "/blog/:id",
      name: "blog-post",
      component: () => import("@/views/BlogPostView.vue"),
      meta: {
        title: "博客文章 - Kuroome's Blog",
        description: "博客文章详情页",
        keywords: "博客文章,文章详情",
      },
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/RegisterView.vue"),
    },
    {
      path: "/messages",
      name: "message-manage",
      component: () => import("@/views/MessageManageView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/views/ProfileSettingView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/import",
      name: "import",
      component: () => import("@/views/ImportBook.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/bookshelf",
      name: "bookshelf",
      component: () => import("@/views/BookShelf.vue"),
      meta: {
        title: "书架 - Kuroome's Blog",
        description: "个人书架，管理你的阅读清单和书籍信息",
        keywords: "书架,阅读清单,书籍管理",
        requiresAuth: true,
      },
    },
    {
      // 通配符匹配所有未定义的路径
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("@/views/NotFound.vue"),
    },
  ],
});

// 全局路由守卫：每次路由跳转前都会执行
router.beforeEach(async (to) => {
  // 1. 路由跳转开始时，启动 Pace 进度条

  // 2. 获取认证状态管理的 store
  const auth = useAuthStore();

  // 3. 如果还没初始化过认证状态（比如刚刷新页面）
  if (!auth.isHydrated) {
    // 就先等它初始化完成（恢复用户登录状态）
    await auth.hydrateAuth();
  }

  // 4. 检查"要去的页面"是否需要登录才能访问
  // （看路由配置里的 meta.requiresAuth 是不是 true）
  const needsAuth = to.matched.some((route) => route.meta?.requiresAuth === true);

  // 5. 如果这个页面需要登录，但用户现在没登录
  if (needsAuth && !auth.isAuthenticated) {
    // 就跳转到登录页，并把"当前想去的页面路径"带上
    // （这样登录成功后可以直接跳回这个页面，体验更好）
    return { name: "login", query: { redirect: to.fullPath } };
  }

  // 6. 上面的检查都通过了，就允许进入目标页面
  return true;
});

// 路由跳转后设置页面 meta 标签（只在客户端执行）
router.afterEach((to) => {
  // 设置页面标题（只在浏览器环境中执行）
  if (to.meta.title && typeof document !== "undefined") {
    document.title = to.meta.title as string;
  }
  // 防抖：避免短时间内多次跳转重复上报
  // 声明 window.visitorReportTimer 以消除 TS 报错
  clearTimeout(window.visitorReportTimer);
  window.visitorReportTimer = setTimeout(() => {
    reportVisitorData();
  }, 500);
});

// 导出 router 实例
export default router;
