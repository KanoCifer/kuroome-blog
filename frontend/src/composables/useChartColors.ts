import { resolveCssColor } from '@/lib';
import { computed, onMounted, onUnmounted, ref } from 'vue';

export interface ChartPalette {
  primary: string;
  warning: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  card: string;
  /** 5 个主题系列色，喂给 ECharts `color` 数组 */
  series: [string, string, string, string, string];
}

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
  'warning',
  'foreground',
  'mutedForeground',
  'border',
  'card',
];

export function useChartColors() {
  const themeVersion = ref(0);
  let observer: MutationObserver | null = null;
  /** 上一轮 palette 的快照:6 个 flat token 全等 + series 数组全等则复用同一引用。 */
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
    const series: [string, string, string, string, string] = [
      resolveCssColor('--color-chart-1', '#5470c6'),
      resolveCssColor('--color-chart-2', '#91cc75'),
      resolveCssColor('--color-chart-3', '#fac858'),
      resolveCssColor('--color-chart-4', '#ee6666'),
      resolveCssColor('--color-chart-5', '#73c0de'),
    ];
    const fresh: ChartPalette = {
      primary: resolveCssColor('--color-accent', '#3b82f6'),
      warning: resolveCssColor('--color-warning', '#f97316'),
      foreground: resolveCssColor('--color-ink', '#1f2937'),
      mutedForeground: resolveCssColor('--color-muted', '#9ca3af'),
      border: resolveCssColor('--color-border', '#e5e7eb'),
      card: resolveCssColor('--color-page', '#ffffff'),
      series,
    };
    if (
      cached &&
      PALETTE_KEYS.every((k) => cached![k] === fresh[k]) &&
      cached.series.every((c, i) => c === series[i])
    ) {
      return cached;
    }
    cached = fresh;
    return fresh;
  });

  return { themeVersion, palette };
}
