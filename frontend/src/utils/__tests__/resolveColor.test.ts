import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveCssColor } from '../resolveColor';

/**
 * 创建一个可控的 mock CanvasRenderingContext2D
 * 通过 fillStyle setter 计数 + 可控返回值
 */
function createMockCtx(fillAfterSet: string) {
  let fills = 0;
  const ctx = {
    get fillStyle() {
      return fills > 1 ? fillAfterSet : '#000';
    },
    set fillStyle(_v: string) {
      fills++;
    },
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

describe('resolveCssColor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // 默认 getComputedStyle 返回空
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CSS 变量为空时返回 fallback', () => {
    expect(resolveCssColor('--primary', '#3b82f6')).toBe('#3b82f6');
  });

  it('canvas 成功解析颜色时返回 rgb 字符串', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => 'oklch(60% 0.2 250)',
    } as unknown as CSSStyleDeclaration);

    vi.spyOn(document, 'createElement').mockReturnValue({
      getContext: () => createMockCtx('rgb(66, 135, 245)'),
    } as unknown as HTMLCanvasElement);

    const result = resolveCssColor('--primary', '#3b82f6');
    expect(result).toBe('rgb(66, 135, 245)');
  });

  it('canvas 解析失败（fillStyle 停在 #000 且 raw 非黑）返回 fallback', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => 'invalid-color',
    } as unknown as CSSStyleDeclaration);

    // fillStyle 第二次（赋 raw 后）仍是 #000
    vi.spyOn(document, 'createElement').mockReturnValue({
      getContext: () => createMockCtx('#000000'),
    } as unknown as HTMLCanvasElement);

    const result = resolveCssColor('--primary', '#3b82f6');
    expect(result).toBe('#3b82f6');
  });

  it('raw 为黑色(#000)时正确返回 #000000', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '#000',
    } as unknown as CSSStyleDeclaration);

    vi.spyOn(document, 'createElement').mockReturnValue({
      getContext: () => createMockCtx('#000000'),
    } as unknown as HTMLCanvasElement);

    const result = resolveCssColor('--primary', '#3b82f6');
    expect(result).toBe('#000000');
  });
});
