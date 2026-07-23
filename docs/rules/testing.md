# 前端测试规范

## 工具链

- **运行器**：Vitest 4.x
- **DOM 环境**：happy-dom
- **后端**：pytest

## 文件约定 (Vue + React 通用)

- 测试文件放在被测模块同级的 `__tests__/` 目录，命名为 `<模块名>.test.ts` / `.test.tsx`
- 例：`src/utils/__tests__/formatdate.test.ts`、`src/hooks/__tests__/useWebsocket.test.ts`
- 全局 setup 在 `src/test/setup.ts`，通过 `vitest.config.ts` 的 `setupFiles` 注册

## 测试风格 (Vue)

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useXxx } from "../useXxx";
import { flushRAF } from "@/test/setup";

describe("useXxx", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("描述行为", () => {
    // arrange → act → assert
  });
});
```

- 用 `describe/it/expect`，**禁止** `test()` 别名
- 用 `vi.spyOn` 而非直接赋值来 mock 原型方法
- 异步测试直接 `async/await`，不用 `done` 回调

## 测试风格 (React)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

describe("useXxx", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("描述行为", () => {
    const { result } = renderHook(() => useXxx());
    // assert on result.current
  });
});
```

## 浏览器 API Mock (Vue)

`src/test/setup.ts` 已提供：

- `requestAnimationFrame` / `cancelAnimationFrame` — 配合 `flushRAF()` 手动推进帧
- `matchMedia` — 默认返回 `matches: false`
- `IntersectionObserver` / `ResizeObserver` — 空实现

```ts
import { flushRAF } from "@/test/setup";

flushRAF(0); // 推进一帧，时间戳 0
```

## 分层策略

| 层级              | 对象 (Vue)      | 对象 (React)      | 工具                                         | 优先级 |
| ----------------- | --------------- | ----------------- | -------------------------------------------- | ------ |
| 纯函数            | utils/          | utils/            | 直接 import                                  | 🔴 高  |
| Hooks/Composables | composables/    | hooks/            | `vi.spyOn` + `flushRAF` / `renderHook`       | 🔴 高  |
| Store             | stores/ (Pinia) | stores/ (Zustand) | `setActivePinia` / `act()`                   | 🟡 中  |
| 组件              | components/     | components/       | `@vue/test-utils` / `@testing-library/react` | 🟢 低  |
