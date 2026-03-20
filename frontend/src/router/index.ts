import { useAuthStore } from "@/stores/auth";
import { reportVisitorData } from "@/utils/visitorTracker";
import EntryView from "@/views/general/EntryView.vue";
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
} from "vue-router";

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
      component: () => import("@/views/general/ApiDocs.vue"),
      meta: {
        title: "API 文档 - Kuroome's Blog",
        description: "查看 Kuroome's Blog 项目的 API 文档，了解后端接口详情",
        keywords: "API文档,接口文档,后端接口",
        requiresAuth: true,
      },
    },
    {
      path: "/home",
      name: "home",
      component: () => import("@/views/general/HomeView.vue"),
      meta: {
        title: "Kuroome's Blog - 个人阅读清单与博客",
        description: "个人阅读清单管理项目，包含博客系统、书籍管理和阅读记录",
        keywords: "阅读清单,博客,书籍管理,个人知识库",
      },
    },
    {
      path: "/",
      name: "entry",
      component: EntryView,
      meta: {
        title: "Entry - Kuroome's Blog",
        description: "欢迎来到 Kuroome's Blog，探索个人阅读清单和博客文章",
        keywords: "欢迎,入口,个人博客",
      },
    },
    {
      path: "/about",
      name: "about",
      component: () => import("@/views/general/AboutView.vue"),
      meta: {
        title: "关于我 - Kuroome's Blog",
        description: "关于 Kuroome's Blog 项目和作者的介绍",
        keywords: "关于,作者,项目介绍",
      },
    },
    {
      path: "/changelog",
      name: "changelog",
      component: () => import("@/views/general/ChangelogView.vue"),
      meta: {
        title: "变更日志 - Kuroome's Blog",
        description: "网站更新历史与变更记录",
        keywords: "变更日志,更新记录,版本历史",
      },
    },
    {
      path: "/websites",
      name: "websites",
      component: () => import("@/views/general/WebsitesView.vue"),
      meta: {
        title: "推荐网站 - Kuroome's Blog",
        description: "发现有趣的网站和工具",
        keywords: "网站推荐,工具,资源",
      },
    },
    {
      path: "/fishing-map",
      name: "fishing-map",
      component: () => import("@/views/general/FishingMapView.vue"),
      meta: {
        title: "钓鱼地图 - Kuroome's Blog",
        description: "探索钓鱼地点和钓点信息",
        keywords: "钓鱼,地图,钓点,钓鱼地图",
      },
    },
    {
      path: "/todos",
      name: "todo-list",
      component: () => import("@/views/general/TodoListView.vue"),
      meta: {
        title: "待办事项 - Kuroome's Blog",
        description: "管理个人待办事项和任务清单",
        keywords: "待办事项,任务管理,todo",
      },
    },
    {
      path: "/blog",
      name: "blog-list",
      component: () => import("@/views/blog/BlogListView.vue"),
      meta: {
        title: "博客列表 - Kuroome's Blog",
        description: "个人博客文章列表，分享技术心得和生活感悟",
        keywords: "博客,文章,技术分享,生活感悟",
      },
    },
    {
      path: "/blog/new",
      name: "blog-new",
      component: () => import("@/views/blog/BlogEditView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/blog/edit/:id",
      name: "blog-edit",
      component: () => import("@/views/blog/BlogEditView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/blog/category/:categoryId",
      name: "blog-category",
      component: () => import("@/views/blog/BlogListView.vue"),
      meta: {
        title: "博客分类 - Kuroome's Blog",
        description: "按分类浏览博客文章",
        keywords: "博客分类,文章分类",
      },
    },
    {
      path: "/blog/:id",
      name: "blog-post",
      component: () => import("@/views/blog/BlogPostView.vue"),
      meta: {
        title: "博客文章 - Kuroome's Blog",
        description: "博客文章详情页",
        keywords: "博客文章,文章详情",
      },
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/auth/LoginView.vue"),
      meta: {
        title: "登录 - Kuroome's Blog",
        description: "登录 Kuroome's Blog",
        keywords: "登录,用户认证,账户管理",
      },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/auth/RegisterView.vue"),
      meta: {
        title: "注册 - Kuroome's Blog",
        description: "注册 Kuroome's Blog 账户",
        keywords: "注册,用户认证,账户管理",
      },
    },
    {
      path: "/messages",
      name: "message-manage",
      component: () => import("@/views/general/MessageManageView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/views/auth/ProfileSettingView.vue"),
      meta: {
        requiresAuth: true,
        title: "个人设置 - Kuroome's Blog",
        description: "管理个人账户信息和偏好设置",
        keywords: "个人设置,账户信息,偏好设置",
      },
    },
    {
      path: "/import",
      name: "import",
      component: () => import("@/views/books/ImportBook.vue"),
      meta: {
        requiresAuth: true,
        title: "导入书籍 - Kuroome's Blog",
        description: "从文件导入书籍信息到个人书架",
        keywords: "导入书籍,书籍管理,个人书架",
      },
    },
    {
      path: "/bookshelf",
      name: "bookshelf",
      component: () => import("@/views/books/BookShelf.vue"),
      meta: {
        title: "书架 - Kuroome's Blog",
        description: "个人书架，管理你的阅读清单和书籍信息",
        keywords: "书架,阅读清单,书籍管理",
        requiresAuth: true,
      },
    },
    {
      path: "/analytics",
      name: "analytics",
      component: () => import("@/views/general/AnalyticsView.vue"),
      meta: {
        requiresAuth: true,
        title: "网站数据分析",
        description: "查看网站访问数据和用户行为分析",
        keywords: "网站分析,数据分析,用户行为",
      },
    },
    {
      path: "/rss",
      name: "rss",
      component: () => import("@/views/rss/RssSubscriptionsView.vue"),
      meta: {
        title: "我的订阅 - Kuroome's Blog",
        requiresAuth: true,
      },
    },
    {
      path: "/rss/parse",
      name: "rss-parse",
      component: () => import("@/views/rss/RSSParseView.vue"),
      meta: {
        title: "RSS 订阅 - Kuroome's Blog",
        description:
          "订阅 Kuroome's Blog 的 RSS 频道，第一时间获取最新文章更新",
        keywords: "RSS订阅,博客更新,文章订阅",
      },
    },
    {
      path: "/rss/articles",
      name: "rss-articles",
      component: () => import("@/views/rss/RssArticlesView.vue"),
      meta: {
        title: "RSS 文章 - Kuroome's Blog",
        requiresAuth: true,
      },
    },
    {
      path: "/rss/articles/:id",
      name: "rss-article",
      component: () => import("@/views/rss/RssArticleView.vue"),
      meta: {
        title: "RSS 阅读 - Kuroome's Blog",
        requiresAuth: true,
      },
    },
    {
      // 通配符匹配所有未定义的路径
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("@/views/general/NotFound.vue"),
    },
  ],
});

// 全局路由守卫：每次路由跳转前都会执行
router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!auth.isHydrated) {
    await auth.hydrateAuth();
  }

  const needsAuth = to.matched.some(
    (route) => route.meta?.requiresAuth === true,
  );

  if (needsAuth && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
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
