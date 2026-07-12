/**
 * 把 design-system 的 CSS 变量值（oklch / hex / rgb / 命名色）解析成
 * ECharts 能吃的 'rgb(r, g, b)' / 'rgba(r, g, b, a)' 字符串。
 *
 * 为什么：ECharts 内部用 canvas fillStyle 喂浏览器，但其颜色处理流水线
 * 对 oklch() 支持不完整，且要在前端做透明度叠加时会 silent fail。
 * 借 <canvas> 的 fillStyle setter 让浏览器自己做颜色解析，统一吐 rgb。
 *
 * 用法：
 *   resolveCssColor('--primary', '#3b82f6')
 */

let probe: CanvasRenderingContext2D | null = null;

function getProbe(): CanvasRenderingContext2D | null {
  if (probe) return probe;
  if (typeof document === 'undefined') return null;
  const ctx = document.createElement('canvas').getContext('2d');
  probe = ctx;
  return ctx;
}

/**
 * 读取 :root 上的 CSS 变量，返回浏览器解析后的标准 rgb 字符串。
 * 仅用在客户端(onMounted)——CSS 变量在此时已存在,解析到对应 rgb。
 * fallback 供解析失败或 SSR 兜底;默认黑色,保证 ECharts 一定拿到合法色值。
 */
export function resolveCssColor(
  cssVar: string,
  fallback = '#000000',
): string {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  if (!raw) return fallback;

  const ctx = getProbe();
  if (!ctx) return fallback;

  try {
    // 先重置成确定值，再赋 raw —— 若 raw 解析失败，fillStyle 不会改
    ctx.fillStyle = '#000';
    ctx.fillStyle = raw;
    const resolved = ctx.fillStyle;
    // canvas 解析失败时 fillStyle 仍是 '#000'，此时 raw 不是黑也算失败
    if (resolved === '#000000' && !/^#0{3,6}$/i.test(raw)) {
      return fallback;
    }
    return resolved as string;
  } catch {
    return fallback;
  }
}
