import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * 创建 mock canvas ctx。
 * @param resolvedColor 第二次 set fillStyle 后，getter 应返回的值
 */
function createMockCtx(resolvedColor: string) {
  let callCount = 0;
  return {
    get fillStyle() {
      // 第 1 次赋 '#000' 后返回 '#000'；第 2 次赋 raw 后返回模拟的解析结果
      return callCount >= 2 ? resolvedColor : '#000';
    },
    set fillStyle(_v: string) {
      callCount++;
    },
  } as unknown as CanvasRenderingContext2D;
}

describe('resolveCssColor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules(); // 重置模块缓存，清除内部的 probe

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration);

    vi.spyOn(document, 'createElement').mockImplementation(
      () =>
        ({
          getContext: () => createMockCtx(''),
        }) as unknown as HTMLCanvasElement,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CSS 变量为空时返回 fallback', async () => {
    const { resolveCssColor } = await import('../resolveColor');
    expect(resolveCssColor('--primary', '#3b82f6')).toBe('#3b82f6');
  });

  it('canvas 成功解析颜色时返回 rgb 字符串', async () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => 'oklch(60% 0.2 250)',
    } as unknown as CSSStyleDeclaration);

    (document.createElement as any).mockImplementation(() => ({
      getContext: () => createMockCtx('rgb(66, 135, 245)'),
    }));

    const { resolveCssColor } = await import('../resolveColor');
    const result = resolveCssColor('--primary', '#3b82f6');
    expect(result).toBe('rgb(66, 135, 245)');
  });

  it('canvas 解析失败（fillStyle 停在 #000 且 raw 非黑）返回 fallback', async () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => 'invalid-color',
    } as unknown as CSSStyleDeclaration);

    // 模拟失败：即使 set 了无效 color，fillStyle 仍是 '#000000'
    // (canvas 内部把 #000 展开为 #000000)
    (document.createElement as any).mockImplementation(() => ({
      getContext: () => createMockCtx('#000000'),
    }));

    const { resolveCssColor } = await import('../resolveColor');
    const result = resolveCssColor('--primary', '#3b82f6');
    expect(result).toBe('#3b82f6');
  });

  it('raw 为黑色(#000)时正确返回 #000000', async () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '#000',
    } as unknown as CSSStyleDeclaration);

    (document.createElement as any).mockImplementation(() => ({
      getContext: () => createMockCtx('#000000'),
    }));

    const { resolveCssColor } = await import('../resolveColor');
    const result = resolveCssColor('--primary', '#3b82f6');
    expect(result).toBe('#000000');
  });
});
