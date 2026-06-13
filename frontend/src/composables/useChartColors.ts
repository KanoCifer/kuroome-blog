/**
 * 图表语义色 hook —— 把 design-system token 喂给 ECharts。
 *
 * 解决三件事:
 * - Echarts 不认 oklch,而 design-system token 多是 oklch → 用 resolveCssColor
 *   通过 canvas fillStyle 让浏览器解析成 rgb 字符串。
 * - 主题切换 (theme.ts 的 setTheme / setScheme) 改 <html> 的 class /
 *   data-color-scheme,用 MutationObserver 触发 themeVersion++,
 *   计算属性显式 touch themeVersion 即可跟随主题切换重算。
 * - **稳定引用** —— 即使 themeVersion 涨了,只要 9 个 token 值一字不差就
 *   返回上次的同一 palette 引用。Vue computed 用 Object.is 判等,引用不
 *   变就不传播到下游 chartOption,避免 v-chart 反复 setOption 触发
 *   echarts animation interpolate1DArray 死循环。
 *
 * 同语义已存在 useEChartsTheme (books/bookStats),后续可逐步收敛到这里。
 */
import { resolveCssColor } from '@/utils/resolveColor';
import { computed, onMounted, onUnmounted, ref } from 'vue';

export interface ChartPalette {
  primary: string;
  success: string;
  warning: string;
  destructive: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  card: string;
  muted: string;
}

/**
 * 把 resolveCssColor 返回的 'rgb(r, g, b)' / 'rgba(r, g, b, a)' / hex 字符串
 * 套上指定 alpha。 ECharts 渐变 colorStops 不接受外层 opacity 与内层 alpha
 * 的混合,只能直接给带 alpha 的颜色字符串 (否则主题切换时新旧 stops 结构不
 * 一致会触发 interpolate1DArray 崩)。
 */
export function withAlpha(color: string, alpha: number): string {
  if (!color) return `rgba(0, 0, 0, ${alpha})`;
  if (color.startsWith('rgba(')) {
    return color.replace(/,\s*[\d.]+\s*\)$/, `, ${alpha})`);
  }
  if (color.startsWith('rgb(')) {
    return color.replace(/^rgb\(/, 'rgba(').replace(/\)$/, `, ${alpha})`);
  }
  if (typeof document !== 'undefined') {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      try {
        ctx.fillStyle = color;
        const resolved = ctx.fillStyle as string;
        if (resolved.startsWith('#') && resolved.length === 7) {
          const r = parseInt(resolved.slice(1, 3), 16);
          const g = parseInt(resolved.slice(3, 5), 16);
          const b = parseInt(resolved.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
      } catch {
        /* fall through */
      }
    }
  }
  return color;
}

const PALETTE_KEYS: Array<keyof ChartPalette> = [
  'primary',
  'success',
  'warning',
  'destructive',
  'foreground',
  'mutedForeground',
  'border',
  'card',
  'muted',
];

export function useChartColors() {
  const themeVersion = ref(0);
  let observer: MutationObserver | null = null;
  /** 上一轮 palette 的快照:9 token 字符串全等就复用同一引用。 */
  let cached: ChartPalette | null = null;

  onMounted(() => {
    observer = new MutationObserver(() => {
      themeVersion.value += 1;
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-color-scheme'],
    });
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
  });

  const palette = computed<ChartPalette>(() => {
    // 显式 touch themeVersion 让 computed 跟随主题切换重算
    void themeVersion.value;
    const fresh: ChartPalette = {
      primary: resolveCssColor('--color-primary', '#3b82f6'),
      success: resolveCssColor('--color-success', '#22c55e'),
      warning: resolveCssColor('--color-warning', '#f97316'),
      destructive: resolveCssColor('--color-destructive', '#ef4444'),
      foreground: resolveCssColor('--color-foreground', '#1f2937'),
      mutedForeground: resolveCssColor('--color-muted-foreground', '#9ca3af'),
      border: resolveCssColor('--color-border', '#e5e7eb'),
      card: resolveCssColor('--color-card', '#ffffff'),
      muted: resolveCssColor('--color-muted', '#f1f5f9'),
    };
    if (cached && PALETTE_KEYS.every((k) => cached![k] === fresh[k])) {
      return cached;
    }
    cached = fresh;
    return fresh;
  });

  return { themeVersion, palette };
}
