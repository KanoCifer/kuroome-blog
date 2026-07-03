# 前端测试规范

## 工具链

- **运行器**：Vitest 4.x
- **DOM 环境**：happy-dom（比 jsdom 快，覆盖足够）
- **组件工具**：@vue/test-utils 2.x
- **命令**：`pnpm run test:unit`（watch 模式）或 `pnpm run test:unit -- --run`（单次运行）

## 文件约定

- 测试文件放在被测模块同级的 `__tests__/` 目录，命名为 `<模块名>.test.ts`
- 例：`src/utils/__tests__/formatdate.test.ts`、`src/composables/shared/__tests__/useTypewriter.test.ts`
- 全局 setup 在 `src/test/setup.ts`，通过 `vitest.config.ts` 的 `setupFiles` 注册

## 测试风格

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useXxx } from '../useXxx';

describe('useXxx', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('描述行为', () => {
    // arrange → act → assert
  });
});
```

- 用 `describe/it/expect`，**禁止** `test()` 别名
- 用 `vi.spyOn` 而非直接赋值来 mock 原型方法
- 异步测试直接 `async/await`，不用 `done` 回调

## 浏览器 API Mock

`src/test/setup.ts` 已提供：

- `requestAnimationFrame` / `cancelAnimationFrame` — 配合 `flushRAF()` 手动推进帧
- `matchMedia` — 默认返回 `matches: false`
- `IntersectionObserver` / `ResizeObserver` — 空实现

```ts
import { flushRAF } from '@/test/setup';

flushRAF(0); // 推进一帧，时间戳 0
```

## 分层策略

| 层级 | 对象 | 工具 | 优先级 |
|------|------|------|--------|
| 纯函数 | utils/、format/ | 直接 import | 🔴 高 |
| Composables | composables/ | `vi.spyOn` + `flushRAF` | 🔴 高 |
| Pinia Store | stores/ | `setActivePinia(createPinia())` | 🟡 中 |
| 组件 | components/ | `@vue/test-utils` mount | 🟢 低 |

## 类型检查

测试文件也纳入 `vue-tsc` 类型检查范围（`tsconfig.vitest.json` 包含 `src/**/__tests__/*`）。
