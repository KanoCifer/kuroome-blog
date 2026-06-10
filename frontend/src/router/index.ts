import { useAuthStore } from '@/auth/stores/auth';
import { reportVisitorData } from '@/utils/visitorTracker';
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
} from 'vue-router';

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
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      };
    }

    if (to.path !== from.path) {
      return {
        left: 0,
        top: 0,
      };
    }

    return false;
  },
  routes: [
    {
      path: '/',
      name: 'entry',
      component: () => import('@/views/entry/EntryView.vue'),
      meta: {
        title: "Entry - Kuroome's Blog",
        description: "欢迎来到 Kuroome's Blog，探索个人阅读清单和博客文章",
        keywords: '欢迎,入口,个人博客',
      },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/pages/AboutView.vue'),
      meta: {
        title: "关于我 - Kuroome's Blog",
        description: "关于 Kuroome's Blog 项目和作者的介绍",
        keywords: '关于,作者,项目介绍',
      },
    },
    {
      path: '/changelog',
      name: 'changelog',
      component: () => import('@/views/pages/ChangelogView.vue'),
      meta: {
        title: "变更日志 - Kuroome's Blog",
        description: '网站更新历史与变更记录',
        keywords: '变更日志,更新记录,版本历史',
      },
    },
    {
      path: '/websites',
      name: 'websites',
      component: () => import('@/views/pages/WebsitesView.vue'),
      meta: {
        title: "推荐网站 - Kuroome's Blog",
        description: '发现有趣的网站和工具',
        keywords: '网站推荐,工具,资源',
      },
    },
    {
      path: '/friend-links',
      name: 'friend-links',
      component: () => import('@/views/pages/FriendLinksView.vue'),
      meta: {
        title: "友情链接 - Kuroome's Blog",
        description: '与志同道合的朋友交换链接',
        keywords: '友情链接,友链,博客链接',
      },
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/views/pages/PrivacyPolicyView.vue'),
      meta: {
        title: "隐私政策 - Kuroome's Blog",
        description: '了解本站如何收集、使用和保护您的个人信息',
        keywords: '隐私政策,个人信息保护,数据安全',
      },
    },
    {
      path: '/fishing-map',
      name: 'fishing-map',
      component: () => import('@/views/fishing/FishingMapView.vue'),
      meta: {
        title: "钓鱼地图 - Kuroome's Blog",
        description: '探索钓鱼地点和钓点信息',
        keywords: '钓鱼,地图,钓点,钓鱼地图',
      },
    },
    {
      path: '/todos',
      name: 'todo-list',
      // redirect: { path: "/" },
      component: () => import('@/views/todos/TodoListView.vue'),
      meta: {
        title: "开发任务 - Kuroome's Blog",
        description: '网站开发需求和实现清单',
        keywords: '开发任务,需求清单,实现清单,devtask',
      },
    },
    {
      path: '/blog',
      name: 'blog-list',
      component: () => import('@/views/blog/BlogListView.vue'),
      meta: {
        title: "博客列表 - Kuroome's Blog",
        description: '个人博客文章列表，分享技术心得和生活感悟',
        keywords: '博客,文章,技术分享,生活感悟',
      },
    },
    {
      path: '/blog/new',
      name: 'blog-new',
      component: () => import('@/views/blog/BlogEditorView.vue'),
      meta: { requiresAuth: true, title: "发布文章 - Kuroome's Blog" },
    },
    {
      path: '/blog/edit/:id',
      name: 'blog-edit',
      component: () => import('@/views/blog/BlogEditorView.vue'),
      meta: { requiresAuth: true, title: "编辑文章 - Kuroome's Blog" },
    },
    {
      path: '/blog/category/:categoryId',
      name: 'blog-category',
      component: () => import('@/views/blog/BlogListView.vue'),
      meta: {
        title: "博客分类 - Kuroome's Blog",
        description: '按分类浏览博客文章',
        keywords: '博客分类,文章分类',
      },
    },
    {
      path: '/blog/:id',
      name: 'blog-post',
      component: () => import('@/views/blog/BlogPostView.vue'),
      meta: {
        title: "博客文章 - Kuroome's Blog",
        description: '博客文章详情页',
        keywords: '博客文章,文章详情',
      },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: {
        title: "登录 - Kuroome's Blog",
        description: "登录 Kuroome's Blog",
        keywords: '登录,用户认证,账户管理',
      },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: {
        title: "注册 - Kuroome's Blog",
        description: "注册 Kuroome's Blog 账户",
        keywords: '注册,用户认证,账户管理',
      },
    },
    {
      path: '/messages',
      name: 'message-manage',
      component: () => import('@/views/messages/MessageManageView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/auth/ProfileSettingView.vue'),
      meta: {
        requiresAuth: true,
        title: "个人设置 - Kuroome's Blog",
        description: '管理个人账户信息和偏好设置',
        keywords: '个人设置,账户信息,偏好设置',
      },
    },
    {
      path: '/import',
      name: 'import',
      component: () => import('@/views/books/ImportBook.vue'),
      meta: {
        requiresAuth: true,
        title: "导入书籍 - Kuroome's Blog",
        description: '从文件导入书籍信息到个人书架',
        keywords: '导入书籍,书籍管理,个人书架',
      },
    },
    {
      path: '/bookshelf',
      name: 'bookshelf',
      component: () => import('@/views/books/BookShelf.vue'),
      meta: {
        title: "书架 - Kuroome's Blog",
        description: '个人书架，管理你的阅读清单和书籍信息',
        keywords: '书架,阅读清单,书籍管理',
        requiresAuth: true,
      },
    },
    {
      path: '/bookshelf/stats',
      name: 'bookshelf-stats',
      component: () => import('@/views/books/BookStats.vue'),
      meta: {
        title: "阅读统计 - Kuroome's Blog",
        description: '微信读书阅读统计数据与趋势分析',
        keywords: '阅读统计,阅读数据,微信读书',
        requiresAuth: true,
      },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('@/views/analytics/AnalyticsView.vue'),
      meta: {
        requiresAuth: true,
        title: '网站数据分析',
        description: '查看网站访问数据和用户行为分析',
        keywords: '网站分析,数据分析,用户行为',
      },
    },
    {
      path: '/subscription',
      name: 'subscription',
      component: () => import('@/views/subscription/SubscriptionView.vue'),
      meta: {
        requiresAuth: true,
        title: "订阅管理 - Kuroome's Blog",
        description: '管理数字订阅、账单周期和通知渠道',
        keywords: '订阅管理,账单提醒,订阅通知',
      },
    },
    {
      path: '/device-tracker',
      name: 'device-tracker',
      component: () => import('@/views/device/DeviceTracker.vue'),
      meta: {
        requiresAuth: true,
        title: "设备管理 - Kuroome's Blog",
        description: '管理电子设备资产与价格',
        keywords: '设备管理,资产追踪',
      },
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: () => import('@/views/pic/PicGallery.vue'),
      meta: {
        title: "图片画廊 - Kuroome's Blog",
        description: '展示精选图片的画廊，支持拖拽浏览',
        keywords: '图片画廊,精选图片,拖拽浏览',
      },
    },
    {
      path: '/rss',
      name: 'rss',
      component: () => import('@/views/rss/RssSubscriptionsView.vue'),
      meta: {
        title: "RSS 工作台 - Kuroome's Blog",
        requiresAuth: true,
      },
    },
    {
      path: '/rss/parse',
      name: 'rss-parse',
      redirect: () => ({
        name: 'rss',
        hash: '#rss-parse',
      }),
      meta: {
        title: "RSS 工作台 - Kuroome's Blog",
      },
    },
    {
      path: '/rss/articles',
      name: 'rss-articles',
      redirect: (to) => ({
        name: 'rss',
        query: to.query,
        hash: '#rss-articles',
      }),
      meta: {
        title: "RSS 工作台 - Kuroome's Blog",
      },
    },
    {
      path: '/rss/articles/:id',
      name: 'rss-article',
      component: () => import('@/views/rss/RssArticleView.vue'),
      meta: {
        title: "RSS 阅读 - Kuroome's Blog",
        requiresAuth: true,
      },
    },
    {
      path: '/write',
      name: 'blog-write',
      component: () => import('@/views/blog/BlogEditorView.vue'),
      meta: {
        requiresAuth: true,
        title: "写文章 - Kuroome's Blog",
        description: '支持富文本和 Markdown 双模式的博客编辑器',
        keywords: '写文章,博客编辑器,markdown,富文本',
      },
    },
    {
      path: '/toolbox/image-toolbox',
      name: 'image-toolbox',
      component: () => import('@/views/toolbox/ImageToolboxView.vue'),
      meta: {
        title: "图片工具箱 - Kuroome's Blog",
        description: '本地图片压缩与格式转换工具',
        keywords: '图片工具,图片压缩,格式转换,webp,jpeg,png',
      },
    },
    {
      path: '/status',
      name: 'status',
      component: () => import('@/views/pages/StatusView.vue'),
      meta: {
        title: "服务状态 - Kuroome's Blog",
        description: '查看 Kuroome Blog 各项服务的实时运行状况',
        keywords: '服务状态,系统状态,运行状况',
      },
    },
    {
      // 通配符匹配所有未定义的路径
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/pages/NotFound.vue'),
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
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  return true;
});

// 路由跳转后：标题/描述/关键词已由各页面 useHead 接管
// 路径变化时复位滚动位置（避免从其他页滚到 /blog 或 /blog 返回时仍停在原位导致空白），
// 仅 query / hash 变化（如分页、锚点）保持原滚动位置
router.afterEach((to, from) => {
  if (to.path !== from.path && typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
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
