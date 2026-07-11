# Code Style

## Backend (FastAPI + Python 3.14+)

- Imports: **absolute imports only** (`from app...`) — `ban-relative-imports = "all"` enforced by Ruff
- Naming: functions/variables `snake_case`, classes `PascalCase`
- Services raise domain errors (`BlogDomainError`, `RssDomainError`, etc.), API layer maps to HTTP via exception handlers
- Async: prefer async/await for all DB and I/O operations
- Logging: use `structlog`'s `logger` (`from app.core.logger import logger`), never stdlib root logger
- Line length: 79 chars; formatter: Ruff (4-space indent, double quotes); 中文 allowed

## Desktop (Vue + TS)

- Use `<script setup lang="ts">` + Composition API
- Type safety: avoid `any`; use `unknown` + narrowing for external inputs; keep props/emits/store types explicit
- Naming: variables/functions `camelCase`, components/types `PascalCase`, component file `PascalCase.vue`, utility file `camelCase.ts`
- Styling: **Tailwind semantic tokens only** (`bg-background`, `text-foreground`, `bg-primary`, `bg-muted`...). No custom CSS, no hardcoded colors
- Composables: organized by domain (`shared/`, `card/`, `article/`, `pic/`, `rss/`, `todo/`, `weread/`, `comment/`), barrel export from each `index.ts`
- Package manager: `pnpm` only (Node ^26.4)
- Error handling: async flows use try/catch; narrow caught values before property access; route user-visible failures to notification flows
- Lint/format: Oxlint (`pnpm run lint:fix`) + Prettier (with `prettier-plugin-tailwindcss` auto-sort); no ESLint

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
