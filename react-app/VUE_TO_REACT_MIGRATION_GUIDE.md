# Vue → React 重构完整指南

> 项目：ReadingList (Kuroome's Blog)  
> 目标：将 Vue 3 前端完整迁移到 React 生态  
> 状态：规划阶段 · 供学习参考

---

## 目录

1. [项目全景概览](#1-项目全景概览)
2. [技术栈映射表](#2-技术栈映射表)
3. [架构设计对比](#3-架构设计对比)
4. [推荐 React 技术栈](#4-推荐-react-技术栈)
5. [分步迁移策略](#5-分步迁移策略)
6. [核心模块重构详解](#6-核心模块重构详解)
7. [常见陷阱与避坑指南](#7-常见陷阱与避坑指南)
8. [文件结构对照](#8-文件结构对照)
9. [学习路线建议](#9-学习路线建议)

---

## 1. 项目全景概览

### 1.1 项目定位

这是一个基于 **FastAPI + Vue 3** 的全栈个人博客与阅读管理系统，包含：
- 博客系统（文章发布、分类、评论）
- 书籍管理（书架、微信读书导入）
- RSS 阅读器
- 数据分析面板
- 待办事项
- 留言板
- 图片工具箱
- 钓鱼地图（高德地图集成）

### 1.2 前端规模统计

| 类别 | 数量 | 说明 |
|------|------|------|
| Vue 页面组件 (views/) | ~30 个 | 按业务领域拆分 |
| 可复用组件 (components/) | ~50+ 个 | UI、布局、编辑器、Bento 卡片等 |
| Pinia Stores | 6 个 | auth, theme, todos, notification, device, counter |
| 路由配置 | ~25 条 | 含权限守卫、meta 信息 |
| 认证模块 (auth/) | 6 个文件 | Gateway, Token, Heartbeat, Cache, Types |
| API 层 (api/) | 4 个文件 | Axios 实例、CSRF、Token 刷新 |
| 工具函数 (utils/) | ~5 个 | 日期格式化、图片压缩、事件总线等 |

### 1.3 关键架构特征

- **Composition API**：全部使用 `<script setup>` + TypeScript
- **Tailwind CSS v4**：原子化样式，深色模式支持
- **shadcn-vue + Radix UI**：无头组件库，按需复制
- **motion-v**：页面/卡片动画（进入退出、悬停效果）
- **@vueuse/core**：大量 composables（useStorage, useMediaQuery, useScroll, useDebounceFn 等）
- **Tiptap 富文本编辑器**：支持 Markdown、代码高亮、表格、图片上传
- **ECharts**：数据分析图表
- **vite-ssg**：静态站点生成
- **Ant Design Vue**：少量使用（Modal 确认框）

---

## 2. 技术栈映射表

| Vue 生态 | React 等价方案 | 推荐库 | 备注 |
|----------|---------------|--------|------|
| Vue 3 | React 18+ | `react` + `react-dom` | 函数组件 + Hooks |
| `<script setup>` | 函数组件 | 无额外配置 | React 默认模式 |
| `ref()` / `reactive()` | `useState()` / `useReducer()` | React 内置 | 核心差异：Vue 可变 vs React 不可变 |
| `computed()` | `useMemo()` | React 内置 | 注意：React 中简单计算直接写在渲染中即可 |
| `watch()` / `watchEffect()` | `useEffect()` | React 内置 | **最大差异点**，见陷阱章节 |
| `onMounted` / `onUnmounted` | `useEffect(() => { ... cleanup }, [])` | React 内置 | 生命周期合并为 useEffect |
| `defineProps` / `defineEmits` | Props + 回调函数 | React 内置 | 单向数据流，无 emit 概念 |
| `<slot>` | `children` props | React 内置 | 具名 slot → 多 children props |
| `<transition>` / `<TransitionGroup>` | `framer-motion` AnimatePresence | `framer-motion` | Vue 内置 vs 第三方 |
| `Teleport` | React Portal | `react-dom` createPortal | 内置功能 |
| `RouterView` + `<component :is>` | `<Outlet>` | `react-router-dom` v7 | 路由出口 |
| Vue Router | React Router v7 | `react-router-dom` | 含路由守卫替代方案 |
| Pinia | Zustand | `zustand` | 最接近 Pinia 的 API 设计 |
| `defineStore()` | `create()` | `zustand` | 几乎 1:1 映射 |
| `@vueuse/core` | 自定义 Hooks + `usehooks-ts` | 手写 + `usehooks-ts` | 部分需自己实现 |
| shadcn-vue | shadcn/ui (React) | `shadcn/ui` | 同一设计理念，React 版 |
| motion-v | framer-motion | `framer-motion` | 同源库的 React 版本 |
| `@tiptap/vue-3` | `@tiptap/react` | `@tiptap/react` | Tiptap 官方 React 支持 |
| vue-echarts | echarts-for-react | `echarts-for-react` | ECharts React 包装器 |
| Ant Design Vue | Ant Design | `antd` | React 原版 |
| `@vueuse/head` | React Helmet / Next.js Metadata | `react-helmet-async` 或框架内置 | SEO meta 管理 |
| vite-ssg | Next.js / Vite + SSG 插件 | `next` 或 `vite-plugin-ssr` | 见下文选型建议 |
| `unplugin-vue-components` | 手动导入 / Vite 插件 | 无需 | React 中手动 import 即可 |
| `mitt` 事件总线 | 自定义事件 / Zustand | 手写或状态管理 | React 不推荐事件总线模式 |

---

## 3. 架构设计对比

### 3.1 应用入口

**Vue (当前)**：
```
main.ts
  → createApp(App)
  → app.use(pinia)
  → app.use(router)
  → app.use(head)
  → app.mount('#app')
```

**React (目标)**：
```
main.tsx
  → createRoot(document.getElementById('root'))
  → root.render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
```

关键差异：
- Vue 通过 `app.use()` 注册全局插件
- React 通过 Context Provider 包裹实现全局能力
- Pinia → Zustand（无需 Provider，直接调用 hook）
- Router → 顶层包裹 `<BrowserRouter>`

### 3.2 布局系统

**当前 Vue 布局层级**：
```
App.vue
  └── BasicLayout.vue (主布局)
        ├── MobileHeader / MobileNav (移动端)
        ├── BasicNav (桌面端导航)
        ├── RouterView (带 transition 动画)
        ├── BasicFooter
        ├── BackToTop
        └── ToastContainer (Teleport to body)
```

**React 对应**：
```tsx
// App.tsx
function App() {
  return (
    <BasicLayout>
      <Routes>
        <Route path="/" element={<EntryView />} />
        <Route path="/blog" element={<BlogListView />} />
        {/* ... */}
      </Routes>
    </BasicLayout>
  );
}

// BasicLayout.tsx
function BasicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate grid min-h-dvh grid-rows-[auto_1fr_auto]">
      {/* 背景图 */}
      <div className="pointer-events-none fixed inset-0 -z-10 ..." />
      {isMobile ? <MobileHeader /> : <BasicNav />}
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} ...>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <BasicFooter />
      <BackToTop />
      {createPortal(<ToastContainer />, document.body)}
    </div>
  );
}
```

### 3.3 状态管理架构

**当前 Pinia Stores**：

| Store | 职责 | 依赖 |
|-------|------|------|
| `auth` | 用户认证、登录/登出、Passkey、心跳 | authGateway, tokenService, userCache |
| `theme` | 主题切换 (light/dark/system) | localStorage, matchMedia |
| `todos` | 待办事项 CRUD、过滤、排序、归档 | todoService, auth store |
| `notification` | Toast 通知系统 | 无外部依赖 |
| `device` | 设备检测 (mobile/desktop) | @vueuse useMediaQuery |
| `counter` | 示例计数器 | 无 |

**React Zustand 对应设计**：

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  isHydrated: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  // Actions
  hydrateAuth: () => Promise<void>;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  isHydrated: false,
  get isAuthenticated() { return !!get().user; },
  get isAdmin() { return !!get().user?.is_admin; },
  
  hydrateAuth: async () => { /* 迁移 auth.ts 逻辑 */ },
  login: async (username, password, rememberMe) => { /* 迁移 */ },
  logout: async () => { /* 迁移 */ },
  refreshUser: async () => { /* 迁移 */ },
}));
```

**核心差异**：
- Pinia 的 `computed` → Zustand 中用 `get()` 在 selector 中计算
- Pinia 的 `watch` → Zustand 中用 `subscribe` 或在组件 useEffect 中监听
- Pinia 的 `defineStore` setup 语法 → Zustand 的 `create` 几乎 1:1

---

## 4. 推荐 React 技术栈

### 4.1 核心选型

```json
{
  "框架": "React 18+ (函数组件 + Hooks)",
  "路由": "React Router v7 (含数据加载/守卫能力)",
  "状态管理": "Zustand (替代 Pinia)",
  "服务端状态": "TanStack Query v5 (替代手动 axios 调用)",
  "样式": "Tailwind CSS v4 (不变)",
  "UI 组件": "shadcn/ui (React 版)",
  "动画": "framer-motion",
  "编辑器": "@tiptap/react",
  "图表": "echarts-for-react",
  "表单": "react-hook-form + zod",
  "HTTP": "axios (不变) + TanStack Query",
  "构建工具": "Vite + @vitejs/plugin-react",
  "类型检查": "TypeScript (不变)",
  "代码质量": "ESLint + Prettier (不变)"
}
```

### 4.2 为什么选这些？

| 选择 | 理由 |
|------|------|
| **Zustand** | API 最接近 Pinia，无需 Provider，TypeScript 友好，体积小 |
| **TanStack Query** | 自动缓存、重试、乐观更新、DevTools，替代手动 loading/error 状态 |
| **React Router v7** | 支持 loader/action 模式（类似 Vue Router 守卫 + 数据预取） |
| **framer-motion** | motion-v 的原版，API 一致（initial/animate/exit/whileHover） |
| **react-hook-form** | 性能最优的 React 表单库，配合 zod 做类型安全校验 |
| **Vite** | 你已熟悉 Vite 配置，只需替换 Vue 插件为 React 插件 |

### 4.3 SSG 方案选择

你的项目使用 `vite-ssg`，有以下替代方案：

| 方案 | 适合场景 | 学习成本 |
|------|---------|---------|
| **Next.js (App Router)** | 内容型页面 + 动态功能混合 | 中 |
| **Vite + react-router-dom** | SPA 为主，SSG 非核心 | 低 |
| **Astro + React Islands** | 内容为主，交互为辅 | 中 |

**推荐**：鉴于你的项目有大量动态功能（认证、编辑器、实时数据），建议使用 **Vite + React Router v7** 作为 SPA 起步。如果确实需要 SSG，再考虑 Next.js。

---

## 5. 分步迁移策略

### 阶段一：基础设施搭建 (1-2 天)

```
目标：建立可运行的 React 项目骨架
```

**步骤**：

1. **创建新项目**（建议独立目录，不覆盖原 Vue 项目）
```bash
pnpm create vite frontend-react --template react-ts
cd frontend-react
pnpm install
```

2. **安装核心依赖**
```bash
# 路由
pnpm add react-router-dom

# 状态管理
pnpm add zustand

# UI 组件
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select
pnpm add class-variance-authority clsx tailwind-merge lucide-react

# 动画
pnpm add framer-motion

# 编辑器
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-underline ...

# 图表
pnpm add echarts echarts-for-react

# 表单
pnpm add react-hook-form @hookform/resolvers zod

# 工具
pnpm add axios dayjs dompurify highlight.js lowlight

# 开发工具
pnpm add -D @tailwindcss/vite tailwindcss
```

3. **配置 Tailwind CSS v4**（与 Vue 项目相同）
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 5174, // 避免与 Vue 项目冲突
    proxy: {
      '/api/v1/': {
        target: 'http://localhost:5555',
        changeOrigin: true,
      },
    },
  },
});
```

4. **配置路径别名**（tsconfig.json）
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

5. **迁移全局样式**
   - 复制 `base.css`、`squircle.css` 等
   - 复制 Tailwind 配置
   - 复制 `highlight.js` 主题

### 阶段二：共享层迁移 (2-3 天)

```
目标：迁移类型定义、API 层、工具函数、认证模块
```

**迁移顺序**：

1. **类型定义** (`src/types/`)
   - 直接复制 TypeScript 接口（无需修改）
   - Post, Category, Comment, BookItem, Message, RssArticle 等

2. **API 层** (`src/api/`)
   - `request.ts`：Axios 实例创建 + 拦截器（几乎不变）
   - `csrf.ts`：CSRF token 获取（不变）
   - `refresh.ts`：Token 刷新逻辑（不变）
   - `refreshToken.ts`：Token 存储（不变）

3. **认证模块** (`src/auth/`)
   - `types.ts`：UserInfo 接口（不变）
   - `authGateway.ts`：API 调用封装（不变）
   - `tokenService.ts`：Token 存取（不变）
   - `userCache.ts`：用户缓存（不变）
   - `heartbeat.ts`：心跳上报（不变）
   - `sideEffects.ts`：副作用（需适配 React 通知系统）

4. **工具函数** (`src/utils/`)
   - `formatdate.ts`：日期格式化（不变）
   - `imageCompressor.ts`：图片压缩（不变）
   - `handlePic.ts`：图片处理（不变）
   - `visitorTracker.ts`：访客追踪（不变）
   - `mitt.ts`：事件总线 → **删除**，React 中不需要

5. **共享工具** (`src/lib/utils.ts`)
   - `cn()` 函数（不变，shadcn 通用工具）

### 阶段三：状态管理迁移 (1-2 天)

```
目标：将 6 个 Pinia Store 转换为 Zustand Stores
```

**转换对照**：

#### 3.1 notificationStore（最简单，先做）

```typescript
// Vue (Pinia)
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationStore = defineStore('notification', () => {
  const toasts = ref<ToastItem[]>([]);
  let idCounter = 1;
  
  function push(message: string, type: ToastType = 'info', timeout = 4000) {
    const id = idCounter++;
    toasts.value.push({ id, message, type, timeout });
    if (timeout > 0) setTimeout(() => dismiss(id), timeout);
    return id;
  }
  
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }
  
  return { toasts, push, success, error, info, warning, dismiss, clear };
});

// React (Zustand)
import { create } from 'zustand';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  timeout?: number;
}

interface NotificationState {
  toasts: ToastItem[];
  push: (message: string, type?: ToastType, timeout?: number) => number;
  success: (message: string, timeout?: number) => number;
  error: (message: string, timeout?: number) => number;
  info: (message: string, timeout?: number) => number;
  warning: (message: string, timeout?: number) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

let idCounter = 1;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  push: (message, type = 'info', timeout = 4000) => {
    const id = idCounter++;
    set(state => ({ toasts: [...state.toasts, { id, message, type, timeout }] }));
    if (timeout > 0) setTimeout(() => get().dismiss(id), timeout);
    return id;
  },
  success: (message, timeout) => get().push(message, 'success', timeout ?? 3000),
  error: (message, timeout) => get().push(message, 'error', timeout ?? 10000),
  info: (message, timeout) => get().push(message, 'info', timeout ?? 3000),
  warning: (message, timeout) => get().push(message, 'warning', timeout ?? 4000),
  dismiss: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
```

#### 3.2 themeStore

```typescript
// React (Zustand)
import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const applyTheme = (newTheme: Theme) => {
  const root = document.documentElement;
  const isDark = newTheme === 'dark' || 
    (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
  
  if (newTheme === 'system') {
    localStorage.removeItem('theme');
  } else {
    localStorage.setItem('theme', newTheme);
  }
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = (localStorage.getItem('theme') as Theme) || 'system';
  
  // 初始化时应用主题
  applyTheme(initialTheme);
  
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (get().theme === 'system') applyTheme('system');
  });
  
  return {
    theme: initialTheme,
    setTheme: (newTheme) => {
      applyTheme(newTheme);
      set({ theme: newTheme });
    },
    toggleTheme: () => {
      const current = get().theme;
      if (current === 'light') get().setTheme('dark');
      else if (current === 'dark') get().setTheme('light');
      else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        get().setTheme(isDark ? 'light' : 'dark');
      }
    },
  };
});
```

#### 3.3 deviceStore

```typescript
// React (Zustand) — 需配合自定义 hook
import { create } from 'zustand';

interface DeviceState {
  isMobile: boolean;
}

export const useDeviceStore = create<DeviceState>({
  isMobile: window.matchMedia('(max-width: 768px)').matches,
});

// 自定义 hook 替代 @vueuse useMediaQuery
import { useEffect } from 'react';
import { useDeviceStore } from '@/stores/deviceStore';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  
  return matches;
}

// 在组件中使用
function MyComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  // 同步更新 store
  useEffect(() => {
    useDeviceStore.setState({ isMobile });
  }, [isMobile]);
}
```

#### 3.4 authStore（最复杂）

```typescript
// React (Zustand) — 核心逻辑不变，仅改 API
import { create } from 'zustand';
import { createAuthGateway } from '@/auth/authGateway';
import { createHeartbeat } from '@/auth/heartbeat';
import { tokenService } from '@/auth/tokenService';
import { userCache } from '@/auth/userCache';
import type { UserInfo } from '@/auth/types';

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  isHydrated: boolean;
  // 计算属性通过 selector 获取
  // Actions
  hydrateAuth: () => Promise<void>;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const authGateway = createAuthGateway();

export const useAuthStore = create<AuthState>((set, get) => {
  const heartbeat = createHeartbeat({
    isAuthenticated: () => !!get().user,
    postHeartbeat: () => authGateway.postHeartbeat(),
    onError: (error) => console.error('心跳上报失败:', error),
  });
  
  return {
    user: null,
    loading: false,
    isHydrated: false,
    
    hydrateAuth: async () => {
      if (get().isHydrated) return;
      try {
        const cached = userCache.get();
        if (cached) {
          set({ user: cached, isHydrated: true });
          heartbeat.start();
          return;
        }
        const userData = await authGateway.fetchUser();
        set({ user: userData, isHydrated: true });
        if (userData) heartbeat.start();
      } catch {
        set({ user: null, isHydrated: true });
      }
    },
    
    login: async (username, password, rememberMe = false) => {
      set({ loading: true });
      try {
        const res = await authGateway.login(username, password, rememberMe);
        await authGateway.initCSRF();
        tokenService.save(res.refreshToken);
        userCache.set(res.user);
        set({ user: res.user });
        heartbeat.start();
        // 通知成功用 React 的 notification store
      } finally {
        set({ loading: false });
      }
    },
    
    logout: async () => {
      set({ loading: true });
      try {
        await authGateway.logout();
      } finally {
        heartbeat.stop();
        tokenService.save('');
        userCache.clear();
        set({ user: null, loading: false });
        // 导航用 React Router
      }
    },
    
    refreshUser: async () => {
      const userData = await authGateway.fetchUser();
      set({ user: userData });
      userCache.set(userData);
    },
  };
});

// 组件中获取计算属性
// const isAuthenticated = useAuthStore(s => !!s.user);
// const isAdmin = useAuthStore(s => !!s.user?.is_admin);
```

#### 3.5 todoStore

```typescript
// 转换思路与 authStore 相同
// 关键差异：
// 1. watch(auth.isAuthenticated, ...) → useEffect 监听 auth store 变化
// 2. useStorage('todos-collapsed', false) → useState + localStorage 或 zustand persist middleware
```

### 阶段四：路由系统迁移 (1 天)

```
目标：将 Vue Router 配置转换为 React Router v7
```

**关键映射**：

| Vue Router | React Router v7 |
|-----------|----------------|
| `createRouter({ routes })` | `createBrowserRouter(routes)` |
| `component: () => import(...)` | `lazy(() => import(...))` |
| `meta: { requiresAuth: true }` | `loader` 中检查并重定向 |
| `router.beforeEach` | `loader` 或自定义 `<ProtectedRoute>` |
| `router.afterEach` | `useLocation` + `useEffect` |
| `<RouterView>` | `<Outlet>` |
| `<router-link>` | `<Link>` |
| `router.push()` | `navigate()` from `useNavigate()` |
| `useRoute()` | `useLocation()` + `useParams()` |
| `useRouter()` | `useNavigate()` |

**React Router 配置示例**：

```typescript
// router/index.tsx
import { createBrowserRouter, redirect } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import BasicLayout from '@/layouts/BasicLayout';

// 懒加载页面
const HomeView = lazy(() => import('@/views/general/HomeView'));
const EntryView = lazy(() => import('@/views/entry/EntryView'));
const BlogListView = lazy(() => import('@/views/blog/BlogListView'));
const BlogPostView = lazy(() => import('@/views/blog/BlogPostView'));
const BlogEditorView = lazy(() => import('@/views/blog/BlogEditorView'));
// ... 其他页面

// 认证守卫 loader
async function authLoader() {
  const { useAuthStore } = await import('@/stores/authStore');
  const store = useAuthStore.getState();
  
  if (!store.isHydrated) {
    await store.hydrateAuth();
  }
  
  if (!store.user) {
    return redirect('/login?redirect=' + window.location.pathname);
  }
  return null;
}

export const router = createBrowserRouter([
  {
    element: <BasicLayout />,
    children: [
      { path: '/', element: <EntryView /> },
      { path: '/home', element: <HomeView /> },
      { path: '/about', element: <AboutView /> },
      { path: '/blog', element: <BlogListView /> },
      { path: '/blog/:id', element: <BlogPostView /> },
      { 
        path: '/blog/new', 
        element: <BlogEditorView />,
        loader: authLoader, // 替代 meta.requiresAuth
      },
      { 
        path: '/blog/edit/:id', 
        element: <BlogEditorView />,
        loader: authLoader,
      },
      // ... 其他路由
      { path: '*', element: <NotFoundView /> },
    ],
  },
]);
```

**路由守卫替代方案**：

Vue 的 `router.beforeEach` 在 React Router 中有两种替代方式：

1. **Loader 模式**（推荐）：在路由配置中定义 `loader` 函数，在数据加载前检查权限
2. **组件模式**：创建 `<ProtectedRoute>` 包装组件

```tsx
// 组件模式（更直观）
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => !!s.user);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [isHydrated, isAuthenticated, navigate, location]);
  
  if (!isHydrated) return <LoadingSpinner />;
  if (!isAuthenticated) return null;
  
  return <>{children}</>;
}
```

### 阶段五：布局组件迁移 (1-2 天)

```
目标：迁移 BasicLayout、导航、页脚等布局组件
```

**BasicLayout 迁移要点**：

1. **模板 → JSX**：`class` → `className`，`v-if` → `{condition && ...}`，`v-for` → `.map()`
2. **响应式判断**：`useDeviceStore().isMobile` → 自定义 `useMediaQuery` hook
3. **滚动逻辑**：`useScroll` from @vueuse → 自定义 `useScroll` hook
4. **背景轮播**：`setInterval` + `watch` → `useEffect` + cleanup
5. **路由过渡**：`<transition>` → `framer-motion` AnimatePresence
6. **Teleport**：`<Teleport to="body">` → `createPortal()`

```tsx
// BasicLayout.tsx (核心结构)
import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDeviceStore } from '@/stores/deviceStore';
import BasicNav from '@/components/nav/BasicNav';
import BasicFooter from '@/components/basic/BasicFooter';
import BackToTop from '@/components/layout/BackToTop';
import ToastContainer from '@/components/layout/ToastContainer';
import { createPortal } from 'react-dom';

const BACKGROUND_IMAGES = [
  '/background/bg-1.webp',
  // ... 10 张背景图
];

function BasicLayout() {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isEntryView = location.pathname === '/';
  const isAboutView = location.pathname === '/about';
  
  // 背景图索引（持久化）
  const [bgIndex, setBgIndex] = useState(() => {
    return Number(localStorage.getItem('readinglist_bg_index')) || 0;
  });
  
  // 导航栏可见性
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  
  // 滚动处理
  useEffect(() => {
    let lastScrollY = 0;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY && currentY > 250) {
        setIsHeaderVisible(false);
      } else if (currentY < lastScrollY) {
        setIsHeaderVisible(true);
      }
      lastScrollY = currentY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 背景轮播
  useEffect(() => {
    if (isMobile || BACKGROUND_IMAGES.length <= 1) return;
    const timer = setInterval(() => {
      setBgIndex(prev => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 60000);
    return () => clearInterval(timer);
  }, [isMobile]);
  
  // 持久化背景索引
  useEffect(() => {
    localStorage.setItem('readinglist_bg_index', String(bgIndex));
  }, [bgIndex]);
  
  const switchBackground = useCallback(() => {
    setBgIndex(prev => (prev + 1) % BACKGROUND_IMAGES.length);
  }, []);
  
  return (
    <div className="relative isolate grid min-h-dvh grid-rows-[auto_1fr_auto]">
      {/* 背景图 */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 transform-gpu bg-cover bg-fixed blur-md transition-all duration-800"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGES[bgIndex]}')` }}
      />
      
      {isMobile ? (
        <MobileHeader onSwitchBackground={switchBackground} />
      ) : (
        <header>
          <BasicNav isEntryView={isEntryView} isVisible={!isEntryView} />
        </header>
      )}
      
      <main className="relative scroll-smooth">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      
      <BasicFooter isEntryView={isEntryView} isAboutView={isAboutView} />
      <BackToTop />
      {createPortal(<ToastContainer />, document.body)}
    </div>
  );
}
```

### 阶段六：页面组件迁移 (5-8 天)

```
目标：逐个迁移所有页面组件
```

**迁移优先级**（从简单到复杂）：

| 优先级 | 页面 | 复杂度 | 关键学习点 |
|--------|------|--------|-----------|
| P0 | NotFound | ⭐ | 基础 JSX |
| P0 | AboutView / ChangelogView | ⭐ | 静态内容 |
| P1 | LoginView / RegisterView | ⭐⭐ | 表单、react-hook-form |
| P1 | HomeView | ⭐⭐ | 数据获取、列表渲染 |
| P1 | TodoListView | ⭐⭐ | Zustand 集成、CRUD |
| P2 | BlogListView | ⭐⭐⭐ | 分页、搜索、分类过滤 |
| P2 | BlogPostView | ⭐⭐⭐ | 文章渲染、代码高亮、评论 |
| P2 | BookShelf | ⭐⭐⭐ | 网格布局、分页 |
| P3 | BlogEditorView | ⭐⭐⭐⭐ | Tiptap 编辑器、草稿系统 |
| P3 | EntryView (Bento) | ⭐⭐⭐⭐ | 动态布局、framer-motion |
| P3 | AnalyticsView | ⭐⭐⭐⭐ | ECharts 图表集成 |
| P4 | RssSubscriptionsView | ⭐⭐⭐⭐ | 多 Tab、复杂状态 |
| P4 | FishingMapView | ⭐⭐⭐⭐ | 高德地图集成 |
| P4 | PicGallery | ⭐⭐⭐ | 拖拽、随机布局 |
| P4 | ImageToolboxView | ⭐⭐⭐ | 文件处理、本地计算 |

#### 迁移模板（每个页面）

```tsx
// 1. 导入
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// 2. 组件定义
function BlogListView() {
  // 3. 路由
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 4. 状态
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  // 5. 数据获取
  const fetchPosts = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await request.get('/blogs', {
        params: { page, search: searchParams.get('search') },
      });
      if (res.data.status === 'success') {
        setPosts(res.data.data.posts);
        // ...
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);
  
  // 6. 副作用
  useEffect(() => {
    fetchPosts(Number(searchParams.get('page')) || 1);
  }, [searchParams, fetchPosts]);
  
  // 7. 计算属性
  const visiblePages = useMemo(() => {
    if (!pagination) return [];
    // 计算可见页码...
  }, [pagination]);
  
  // 8. 事件处理
  const handleSearch = useCallback(() => {
    setSearchParams({ search: searchQuery, page: '1' });
  }, [searchQuery, setSearchParams]);
  
  // 9. 渲染
  if (isLoading) return <LoadingSpinner />;
  if (errorMessage) return <ErrorState message={errorMessage} onRetry={() => fetchPosts()} />;
  
  return (
    <BasicDetail title="Blog" subtitle="...">
      {/* 搜索框 */}
      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      <button onClick={handleSearch}>搜索</button>
      
      {/* 文章列表 */}
      {posts.map(post => (
        <BlogPostCard key={post._id} post={post} />
      ))}
      
      {/* 分页 */}
      <Pagination ... />
    </BasicDetail>
  );
}
```

### 阶段七：组件库迁移 (3-5 天)

```
目标：迁移所有可复用组件
```

**组件分类与迁移策略**：

#### 7.1 UI 基础组件 (components/ui/)

shadcn-vue → shadcn/ui (React)，使用 CLI 重新生成：

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button select dropdown-menu dialog slider alert-dialog
```

这些组件会自动生成 React 版本，Tailwind 类名完全一致。

#### 7.2 业务组件迁移模式

```tsx
// Vue: defineProps + defineEmits
// React: Props interface + callback props

// Before (Vue)
// <CategorySidebar @filterPosts="handleFilter" @resetFilter="handleReset" />

// After (React)
interface CategorySidebarProps {
  onFilterPosts: (posts: Post[], category: string) => void;
  onResetFilter: () => void;
}

function CategorySidebar({ onFilterPosts, onResetFilter }: CategorySidebarProps) {
  return (
    <div>
      <button onClick={() => onResetFilter()}>重置</button>
      <button onClick={() => onFilterPosts(filtered, name)}>筛选</button>
    </div>
  );
}
```

#### 7.3 Slot 迁移

```tsx
// Vue: <slot name="actions">
// React: children 或命名 props

// Before (Vue)
// <ArticleDetailLayout>
//   <template #actions><EditButton /><DeleteButton /></template>
// </ArticleDetailLayout>

// After (React)
function ArticleDetailLayout({ 
  children, 
  actions 
}: { 
  children: React.ReactNode; 
  actions?: React.ReactNode; 
}) {
  return (
    <div>
      {actions && <div className="actions">{actions}</div>}
      {children}
    </div>
  );
}

// 使用
<ArticleDetailLayout actions={<><EditButton /><DeleteButton /></>}>
  文章内容
</ArticleDetailLayout>
```

### 阶段八：特殊模块迁移 (2-3 天)

#### 8.1 Tiptap 编辑器

```tsx
// @tiptap/vue-3 → @tiptap/react
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

function TiptapEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link,
      Image,
      // ... 其他扩展（与 Vue 版本相同）
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });
  
  if (!editor) return null;
  
  return (
    <div>
      <TiptapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
```

**关键差异**：
- `useEditor` hook 替代 Vue 的 `useEditor` + ref
- `onUpdate` 回调替代 `watch(editor.getHTML())`
- 草稿系统：localStorage 逻辑完全不变，只是状态管理方式改变

#### 8.2 ECharts 图表

```tsx
// vue-echarts → echarts-for-react
import ReactECharts from 'echarts-for-react';

function AreaChart({ data }: { data: ChartData[] }) {
  const option = {
    xAxis: { type: 'category', data: data.map(d => d.date) },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: data.map(d => d.value) }],
    // ... 配置与 Vue 版本相同
  };
  
  return <ReactECharts option={option} style={{ height: '300px' }} />;
}
```

#### 8.3 高德地图

```tsx
// AMap 集成逻辑基本不变
// 主要差异：
// 1. onMounted → useEffect
// 2. ref 获取 DOM 节点 → useRef
// 3. 清理逻辑 → useEffect cleanup

function FishingMapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // 初始化地图
    AMapLoader.load({ key: '...', version: '2.0' }).then((AMap) => {
      mapInstance.current = new AMap.Map(mapContainer.current, {
        center: [120, 30],
        zoom: 12,
      });
      // ... 添加标记、路线等
    });
    
    return () => {
      mapInstance.current?.destroy();
    };
  }, []);
  
  return <div ref={mapContainer} style={{ width: '100%', height: '500px' }} />;
}
```

#### 8.4 Bento 网格布局

EntryView 的 Bento 布局是最复杂的部分：

```tsx
// 关键转换：
// 1. computed 位置 → useMemo
// 2. ref + nextTick → useRef + useEffect
// 3. ResizeObserver → useEffect + new ResizeObserver
// 4. 卡片延迟显示 → useState + setTimeout
// 5. motion-v → framer-motion (API 几乎一致)

import { motion, AnimatePresence } from 'framer-motion';

function EntryView() {
  const [showCards, setShowCards] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // 卡片延迟显示逻辑
    cardNames.forEach((name, index) => {
      setTimeout(() => {
        setShowCards(prev => ({ ...prev, [name]: true }));
      }, index * 100);
    });
  }, []);
  
  return (
    <div ref={containerRef} style={containerStyle}>
      <AnimatePresence>
        {showCards['BentoGreeting'] && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={greetingPosition}
          >
            <BentoGreeting />
          </motion.div>
        )}
        {/* 其他卡片... */}
      </AnimatePresence>
    </div>
  );
}
```

### 阶段九：测试与优化 (2-3 天)

```
目标：确保功能完整、性能达标
```

1. **功能测试清单**：
   - [ ] 所有路由可正常访问
   - [ ] 认证流程正常（登录/登出/Passkey）
   - [ ] 博客 CRUD 正常
   - [ ] 编辑器功能正常（富文本/Markdown/草稿）
   - [ ] 主题切换正常
   - [ ] 响应式布局正常
   - [ ] 动画效果正常
   - [ ] 表单验证正常

2. **性能优化**：
   - 使用 `React.memo` 优化重复渲染的组件
   - 使用 `useMemo` / `useCallback` 避免不必要的重渲染
   - 路由懒加载（React.lazy + Suspense）
   - 图片懒加载
   - 代码分割（Vite manualChunks）

3. **Vite 构建配置**：
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tiptap')) return 'tiptap';
            if (id.includes('echarts')) return 'echarts';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('react-router')) return 'router';
            if (id.includes('zustand')) return 'store';
            if (id.includes('axios')) return 'axios';
            if (id.includes('dayjs')) return 'dayjs';
          }
        },
      },
    },
  },
});
```

---

## 6. 核心模块重构详解

### 6.1 Vue Composition API → React Hooks 对照

这是迁移中最核心的思维转换。以下是完整对照表：

| Vue 概念 | React 概念 | 说明 |
|---------|-----------|------|
| `ref<T>(value)` | `useState<T>(value)` | 响应式变量 |
| `computed(() => expr)` | `useMemo(() => expr, [deps])` | 派生状态 |
| `watch(source, cb)` | `useEffect(cb, [deps])` | 副作用监听 |
| `watchEffect(cb)` | `useEffect(cb)`（无依赖数组） | 自动追踪依赖 |
| `onMounted(cb)` | `useEffect(() => { cb() }, [])` | 挂载后执行 |
| `onUnmounted(cb)` | `useEffect(() => cb, [])` 的返回值 | 卸载前清理 |
| `nextTick(cb)` | `useEffect(cb)` 或 `requestAnimationFrame` | 等待 DOM 更新 |
| `provide/inject` | `createContext/useContext` | 依赖注入 |
| `defineProps()` | 函数参数 `props` | 组件属性 |
| `defineEmits()` | 回调函数 props | 事件通知 |
| `defineExpose()` | `useImperativeHandle` + `forwardRef` | 暴露子组件方法 |
| `v-model` | `value` + `onChange` | 双向绑定 |
| `v-if` / `v-show` | `{condition && ...}` / CSS display | 条件渲染 |
| `v-for` | `.map()` | 列表渲染 |
| `:class` / `:style` | `className` / `style` | 动态样式 |
| `@click` | `onClick` | 事件绑定 |
| `<slot>` | `children` / 命名 props | 内容插槽 |
| `<Teleport>` | `createPortal()` | 传送门 |
| `<Transition>` | `framer-motion` | 过渡动画 |
| `<KeepAlive>` | 无直接等价，需自行实现 | 组件缓存 |

### 6.2 @vueuse/core 替代方案

| @vueuse Composable | React 替代 | 实现方式 |
|-------------------|-----------|---------|
| `useStorage(key, default)` | `useState` + localStorage | 自定义 hook |
| `useMediaQuery(query)` | `useState` + matchMedia | 自定义 hook |
| `useDebounceFn(fn, delay)` | `useDebounceCallback` | `usehooks-ts` 或手写 |
| `useScroll(el)` | `useState` + scroll event | 自定义 hook |
| `useTemplateRef(name)` | `useRef()` | React 内置 |
| `useHead(options)` | `react-helmet-async` | 第三方库 |
| `useDropZone(options)` | 原生 drag events | 手写或使用 `react-dropzone` |

**示例：useStorage 自定义 Hook**

```tsx
function useStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue];
}
```

### 6.3 生命周期对照

```
Vue                    React
─────────────────────────────────────────
setup()                函数体（每次渲染执行）
onMounted()            useEffect(..., [])
onUnmounted()          useEffect(() => cleanup, [])
onBeforeMount()        无直接等价（很少需要）
onUpdated()            useEffect(..., [deps])
watch(source, cb)      useEffect(cb, [source])
watchEffect(cb)        useEffect(cb)
computed(() => ...)    useMemo(() => ...) 或直接计算
```

---

## 7. 常见陷阱与避坑指南

### 陷阱 1：把 watch 直接翻译成 useEffect

**错误做法**：
```tsx
// ❌ Vue 的 watch 直接翻译
useEffect(() => {
  if (someValue) {
    doSomething();
  }
}); // 无依赖数组 = 每次渲染都执行！
```

**正确做法**：
```tsx
// ✅ 明确依赖
useEffect(() => {
  if (someValue) {
    doSomething();
  }
}, [someValue]); // 仅当 someValue 变化时执行

// 或者：如果是派生值，根本不需要 useEffect
const derivedValue = useMemo(() => {
  return computeFrom(someValue);
}, [someValue]);
```

### 陷阱 2：直接修改状态

**错误做法**：
```tsx
// ❌ Vue 中可以这样，React 不行
const [todos, setTodos] = useState<Todo[]>([]);
todos.push(newTodo); // 不会触发重渲染！
```

**正确做法**：
```tsx
// ✅ 创建新对象/数组
setTodos(prev => [...prev, newTodo]);
setTodos(prev => prev.filter(t => t.id !== id));
setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
```

### 陷阱 3：useEffect 中的闭包陷阱

**错误做法**：
```tsx
// ❌ count 永远是初始值
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count); // 永远是 0
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

**正确做法**：
```tsx
// ✅ 使用函数式更新或添加依赖
useEffect(() => {
  const timer = setInterval(() => {
    setCount(prev => prev + 1); // 函数式更新
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### 陷阱 4：过度使用 useEffect 做数据获取

**错误做法**：
```tsx
// ❌ 用 useEffect 获取数据（容易出错）
useEffect(() => {
  fetchPosts().then(setPosts);
}, []);
```

**正确做法**：
```tsx
// ✅ 使用 TanStack Query
const { data: posts, isLoading, error } = useQuery({
  queryKey: ['posts', page],
  queryFn: () => fetchPosts(page),
});
```

### 陷阱 5：忘记清理副作用

**错误做法**：
```tsx
// ❌ 事件监听器未清理
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  // 没有 return cleanup
});
```

**正确做法**：
```tsx
// ✅ 总是清理
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

### 陷阱 6：Context 性能问题

**错误做法**：
```tsx
// ❌ 所有消费者都会重渲染
const AuthContext = createContext<AuthState>(null!);
```

**正确做法**：
```tsx
// ✅ 使用 Zustand（内置 selector 优化）
const user = useAuthStore(s => s.user); // 仅 user 变化时重渲染
```

---

## 8. 文件结构对照

### Vue 项目结构 → React 项目结构

```
frontend/                          frontend-react/
├── src/                           ├── src/
│   ├── main.ts                    │   ├── main.tsx              # 入口（.tsx）
│   ├── App.vue                    │   ├── App.tsx               # 根组件
│   ├── router/index.ts            │   ├── router/index.tsx      # React Router 配置
│   │                              │   ├── hooks/                # 自定义 Hooks
│   │                              │   │   ├── useMediaQuery.ts
│   │   │   │   │   ├── useScroll.ts
│   │   │   │   │   ├── useStorage.ts
│   │   │   │   │   └── useDebounce.ts
│   ├── stores/                    │   ├── stores/               # Zustand stores
│   │   ├── auth.ts                │   │   ├── authStore.ts
│   │   ├── theme.ts               │   │   ├── themeStore.ts
│   │   ├── todos.ts               │   │   ├── todoStore.ts
│   │   ├── notification.ts        │   │   ├── notificationStore.ts
│   │   ├── device.ts              │   │   └── deviceStore.ts
│   │   └── counter.ts             │   │   └── counterStore.ts
│   ├── auth/                      │   ├── auth/                 # 认证模块（基本不变）
│   │   ├── authGateway.ts         │   │   ├── authGateway.ts
│   │   ├── tokenService.ts        │   │   ├── tokenService.ts
│   │   ├── heartbeat.ts           │   │   ├── heartbeat.ts
│   │   ├── userCache.ts           │   │   ├── userCache.ts
│   │   ├── types.ts               │   │   ├── types.ts
│   │   └── sideEffects.ts         │   │   └── sideEffects.ts
│   ├── api/                       │   ├── api/                  # API 层（基本不变）
│   │   ├── request.ts             │   │   ├── request.ts
│   │   ├── csrf.ts                │   │   ├── csrf.ts
│   │   ├── refresh.ts             │   │   ├── refresh.ts
│   │   └── refreshToken.ts        │   │   └── refreshToken.ts
│   ├── types/                     │   ├── types/                # 类型定义（不变）
│   ├── views/                     │   ├── views/                # 页面组件
│   │   ├── entry/                 │   │   ├── entry/
│   │   ├── blog/                  │   │   ├── blog/
│   │   ├── books/                 │   │   ├── books/
│   │   ├── auth/                  │   │   ├── auth/
│   │   ├── general/               │   │   ├── general/
│   │   ├── analyse/               │   │   ├── analyse/
│   │   ├── rss/                   │   │   ├── rss/
│   │   ├── pic/                   │   │   ├── pic/
│   │   └── toolbox/               │   │   └── toolbox/
│   ├── components/                │   ├── components/           # 可复用组件
│   │   ├── ui/                    │   │   ├── ui/               # shadcn/ui (React)
│   │   ├── basic/                 │   │   ├── basic/
│   │   ├── nav/                   │   │   ├── nav/
│   │   ├── layout/                │   │   ├── layout/
│   │   ├── editor/                │   │   ├── editor/
│   │   ├── bento/                 │   │   ├── bento/
│   │   └── ...                    │   │   └── ...
│   ├── layouts/                   │   ├── layouts/
│   ├── service/                   │   ├── service/
│   ├── utils/                     │   ├── utils/
│   ├── lib/                       │   ├── lib/
│   └── assets/                    │   └── assets/
├── vite.config.ts                 ├── vite.config.ts
├── tsconfig.json                  ├── tsconfig.json
└── package.json                   └── package.json
```

**新增目录**：
- `hooks/`：React 自定义 Hooks（替代 @vueuse/core）

**删除目录**：
- 无（所有 Vue 目录都有 React 对应）

---

## 9. 学习路线建议

### 阶段式学习路径

```
Week 1: React 基础
  ├── JSX 语法与组件思维
  ├── useState / useEffect 核心 Hooks
  ├── Props 与组件通信
  └── 条件渲染与列表渲染

Week 2: React 进阶
  ├── useContext / useReducer
  ├── 自定义 Hooks
  ├── React Router v7
  └── 表单处理 (react-hook-form)

Week 3: 状态管理与生态
  ├── Zustand 状态管理
  ├── TanStack Query 服务端状态
  ├── framer-motion 动画
  └── shadcn/ui 组件使用

Week 4: 项目实战
  ├── 搭建项目骨架
  ├── 迁移共享层（类型、API、工具）
  ├── 迁移状态管理
  └── 开始迁移页面
```

### 推荐学习资源

| 资源 | 内容 | 链接 |
|------|------|------|
| React 官方文档 | 最权威的学习资料 | https://react.dev |
| React Router v7 文档 | 路由配置与数据加载 | https://reactrouter.com |
| Zustand 文档 | 状态管理 | https://zustand.docs.pmnd.rs |
| TanStack Query 文档 | 服务端状态 | https://tanstack.com/query |
| framer-motion 文档 | 动画 | https://www.framer.com/motion |
| shadcn/ui 文档 | UI 组件 | https://ui.shadcn.com |
| Tiptap React 文档 | 富文本编辑器 | https://tiptap.dev/docs/editor/getting-started/install/react |

### 学习建议

1. **先学 React 思维，再写代码**：React 的"不可变更新"和"显式依赖"与 Vue 差异很大，先理解概念
2. **从小组件开始**：先迁移 NotFound、About 等简单页面，建立信心
3. **对照着写**：打开 Vue 源文件和 React 新文件并排，逐行对照迁移
4. **遇到 useEffect 多思考**：这是最容易出错的地方，先问自己"这个逻辑能不能不用 useEffect？"
5. **善用 TypeScript**：类型系统会在迁移过程中帮你发现大量问题
6. **不要追求完美**：第一版能跑就行，后续再优化

---

## 附录：快速参考卡片

### Vue → React 速查

```
Vue                      → React
─────────────────────────────────────────────
ref('hello')             → useState('hello')
const x = ref(0)         → const [x, setX] = useState(0)
x.value = 1              → setX(1)
computed(() => x*2)      → useMemo(() => x*2, [x])
watch(x, fn)             → useEffect(fn, [x])
onMounted(fn)            → useEffect(fn, [])
v-model="val"            → value={val} onChange={e => setVal(e.target.value)}
v-if="show"              → {show && <Component />}
v-for="item in list"     → {list.map(item => <Item key={item.id} />)}
:class="{ active: bool }"→ className={cn(bool && 'active')}
@click="handler"         → onClick={handler}
<slot />                 → {children}
<Teleport to="body">     → {createPortal(content, document.body)}
<transition>             → <motion.div initial animate exit>
$router.push('/path')    → navigate('/path')
$route.params.id         → params.id (from useParams)
$route.query.search      → searchParams.get('search')
defineProps<{...}>()     → function Comp({ prop1, prop2 }: Props)
defineEmits<{...}>()     → function Comp({ onChange }: Props)
```

### 项目迁移检查清单

- [ ] 创建 React 项目并配置 Vite
- [ ] 安装所有依赖
- [ ] 配置 Tailwind CSS
- [ ] 迁移类型定义
- [ ] 迁移 API 层
- [ ] 迁移认证模块
- [ ] 迁移工具函数
- [ ] 创建 Zustand stores
- [ ] 配置 React Router
- [ ] 迁移 BasicLayout
- [ ] 迁移 ToastContainer
- [ ] 迁移导航组件
- [ ] 迁移所有页面（按优先级）
- [ ] 迁移所有组件
- [ ] 迁移 Tiptap 编辑器
- [ ] 迁移 ECharts 图表
- [ ] 迁移高德地图
- [ ] 迁移 Bento 布局
- [ ] 配置代码分割
- [ ] 测试所有功能
- [ ] 性能优化
- [ ] 部署

---

> 💡 **提示**：这份指南是你学习 React 的路线图，不是需要一次性完成的任务清单。建议按阶段逐步推进，每个阶段完成后都确保项目可以正常运行。遇到具体问题时，参考 React 官方文档和本文档中的代码示例。
