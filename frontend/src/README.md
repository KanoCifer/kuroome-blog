# Packages are deep modules

Only **feature packages** (`features/<name>/`) are deep modules: a lot of
behaviour behind a small interface. A feature's **public surface is its entry
points** — the files at the feature root. Everything in its subfolders
(`api/`, `components/`, `composables/`, `stores/`, `lib/`, ...) is private.

```
src/
  features/
    blog/           ← a deep module (package)
      index.ts      ← entry point (public). Import this from outside.
      api/          ← implementation: hidden from outside.
      components/   ← implementation: hidden.
      __tests__/    ← co-located tests: hidden, exercise code through entry points.
    books/          ← another deep module
  lib/              ← infrastructure layer (framework-agnostic core)
    request.ts      ← axios 客户端 + 拦截器
    auth.ts         ← access-JWT 内存单例
    dayjs.ts        ← 日期/时长/相对时间格式化
    websocket.ts    ← WebSocketManager 类（无 Vue 依赖）
  shared/           ← shared infrastructure (NOT a package — freely importable)
    components/
    composables/
    stores/
    api/
  utils/            ← shared infrastructure (re-exports lib/ through its barrels)
  layouts/          ← shared infrastructure
  router/           ← shared infrastructure
```

`shared/`, `utils/`, `layouts/`, `router/` are **shared infrastructure**: flat
utility libraries that any feature may import freely. They are NOT subject to
boundary rules. This mirrors the model in `react-app/.dependency-cruiser.cjs`.

`lib/` is the infrastructure layer: framework-agnostic core (request, auth,
dayjs, websocket) that `utils/` re-exports through its barrel files. Features
import from `lib/` entry points, not from `utils/` internals.

## The rules

1. **Entry-point boundary** — code outside a feature (shared infra, layouts,
   other features) may import only that feature's root files (its entry points),
   never anything in its subfolders.
2. **Features don't import each other** — if a component/composable is used by 2+
   features, move it to `shared/` instead of cross-importing.
3. **Intra-package freedom** — a feature's own files import each other freely.
4. **Tests through the entry points** — `__tests__/` files import only entry
   points (any feature's) and their own fixtures, never any feature's internals
   — not even their own.
5. **No cycles** — no dependency cycles. Don't re-export page components from
   feature barrels (it creates cycles).

## Layout

- **Entry points** live at the feature root. A feature may expose several small
  entry points — prefer that over one giant barrel `index.ts`.
- **Implementation** goes in subfolders. Any subfolder is private.
- **Tests** live in `__tests__/` (repo convention), co-located and private.
- **Shared components** used by 2+ features live in `shared/components/`.

## Discourage barrel files

Don't re-export a whole subtree through one `index.ts`. Don't re-export page
components (e.g. `AnalyticsView`) from feature barrels — routes import them
directly. Keep barrels small and cycle-free.

## How to check

```bash
pnpm run lint:boundaries
```

This runs [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
with `.dependency-cruiser.cjs`.
