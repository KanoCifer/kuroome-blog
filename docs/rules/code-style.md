# Code Style

## Backend (FastAPI + Python 3.14+)

- Imports: **absolute imports only** (`from app...`) — `ban-relative-imports = "all"` enforced by Ruff
- Naming: functions/variables `snake_case`, classes `PascalCase`
- Services raise domain errors (`BlogDomainError`, `RssDomainError`, etc.), API layer maps to HTTP via exception handlers
- Async: prefer async/await for all DB and I/O operations
- Logging: use `structlog`'s `logger` (`from app.core.logger import logger`), never stdlib root logger
- Line length: 79 chars; formatter: Ruff (4-space indent, double quotes); 中文 allowed

## Frontend — Vue (`frontend/`)

- Use `<script setup lang="ts">` + Composition API
- Type safety: avoid `any`; use `unknown` + narrowing for external inputs; keep props/emits/store types explicit
- Naming: variables/functions `camelCase`, components/types `PascalCase`, component file `PascalCase.vue`, utility file `camelCase.ts`
- Styling: **Tailwind semantic tokens only** (`bg-paper`, `text-muted`, `bg-accent`, `bg-muted`...). No custom CSS, no hardcoded colors
- Package manager: `pnpm` only (Node ^26.4)
- Error handling: async flows use try/catch; narrow caught values before property access; route user-visible failures to notification flows
- Lint/format: Oxlint (`pnpm run lint:fix`) + Prettier (with `prettier-plugin-tailwindcss` auto-sort); no ESLint
- Import alias: `@/` → `src/`；所有源码导入走别名，禁止相对路径穿越（如 `../../../lib/...`）

### 目录结构（features/ 按业务域聚合）

顶层 `src/`：

```
src/
├── features/                        # 业务域（按视图域收拢 api/composables/stores/types/components，视图置于域根）
│   ├── blog/ books/ fishing/ moments/ rss/ subscription/ pic/
│   ├── todos/ device/ analytics/ auth/ entry/ pages/ toolbox/
│   │   ├── <View>.vue               # 路由级页面（平铺在域根，禁止建 views/ 子目录）
│   │   ├── api/                     # 该域的 API gateway（平铺，禁止嵌套子目录）+ index.ts 桶
│   │   ├── components/              # 该域私有组件（平铺，禁止嵌套子目录如 article/ editor/）+ index.ts 桶
│   │   ├── composables/             # 该域 composable（hooks；平铺，禁止嵌套子目录）+ index.ts 桶
│   │   ├── stores/                  # 该域 Pinia store（平铺）
│   │   └── types/                   # 该域 TypeScript 类型（单文件 types/index.ts）
│   └── ...
├── shared/                          # 跨域基础设施
│   ├── api/                        # request + 共享 gateway 聚合（barrel index）
│   ├── auth/                       # 全局认证（store 被 router 守卫 + 全 feature 调用）
│   ├── components/                 # 真正可复用 UI（ui/ icons/ basic/ shared/ layout/ nav/ bento/）
│   ├── composables/                # 跨域 composable（shared/ route-transition/）
│   ├── stores/                     # 跨域 store（theme/ notification/ visitorCount/ background/ counter/）
│   └── types/                      # 跨域/共享类型（axios.d.ts 模块扩展、Website、LoginForm 等被多域引用的类型）
├── layouts/                        # 应用外壳（BasicLayout + Header/Footer/GlobalOverlays）
├── router/                         # Vue Router 配置
├── lib/ utils/ constants/          # 纯技术基础设施
├── assets/ data/                   # 静态资源（data/card-styles.json 等）
├── App.vue main.ts
└── test/                           # 全局测试 setup
```

**规则**：

- 新增业务域 → 在 `features/<domain>/` 下建域，把 api/composables/stores/types/components 收拢进来，禁止散落在顶层
- **扁平原则**：`components/`、`composables/`、`api/` 内禁止嵌套子目录（如 `components/article/`、`composables/weread/`）；所有 .vue/.ts 平铺在对应目录根部，通过 `index.ts` 桶导出。视图文件直接放在域根（`<View>.vue`），禁止新建 `views/` 子目录
- 跨域复用（被 3+ 域使用）→ 放 `shared/`，不放进任何 `features/` 域
- `router/`、`layouts/`、`lib/`、`utils/`、`constants/` 属全局基础设施，不迁入 features
- 顶层不再保留 `views/`、`auth/`、`components/`、`composables/`、`stores/`、`api/`、`plugins/`、`types/`（已清空）
- **类型就近原则**：域专用类型（只被一个 `features/<domain>/` 引用）放在 `features/<domain>/types/index.ts`（单文件桶）；跨域/共享类型（被 2+ 域或 `shared/` 引用）放在 `shared/types/`。禁止新增域类型散落在 `types/index.ts`
- 测试文件（`*.test.ts`）与源码就近放置（`__tests__/` 子目录），随该域迁移
- 每个 `components/`、`composables/` 目录必须有 `index.ts` 桶导出其下全部成员

## Go Backend

- Imports: 标准库 → 第三方 → 内部包，三组空行分隔；`internal/` 包按层划分
- 错误处理: 显式 `if err != nil`，禁止 panic；下层返回 error，上层包装上下文
- 日志: 使用 `internal/logger` 的 `slog`，禁止 `fmt.Println`
- Handler 通过接口依赖 Service（便于 mock 测试），构造函数注入配置
- 格式化: `gofmt -w .`；静态检查: `go vet ./...`
- 测试: `go test ./...`（handler/service/dto/middleware 全覆盖）

## Mobile (React + TS)

- Use function components + hooks
- State: Zustand with `useShallow` for object selectors to prevent infinite re-renders; avoid returning new object references in selectors
- Naming: same as Vue — `camelCase` for functions/vars, `PascalCase` for components/types
- Styling: same Tailwind semantic token contract as Vue, shared themes from `packages/brand/`
- Services: organized by domain subdirectories (`blogService/`, `galleryService/`, `momentsService/`, `rssService/`, `todoService/`, `wereadService/`)
- Lint/format: Oxlint (`pnpm run lint:fix`) + Prettier; type-check via `tsc --noEmit`
