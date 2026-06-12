import { resolveCssColor } from '@/utils/resolveColor';
import { computed, onMounted, onUnmounted, ref } from 'vue';

/**
 * 跟踪 :root 上的主题切换（深色模式 + 配色方案），把 CSS token
 * 解析成 ECharts 能吃的 'rgb(...)' 字符串。
 *
 * 为什么不用 useChartColors：那个直接把 oklch raw 值返回给 ECharts，
 * ECharts 颜色流水线不认 oklch。这里走 resolveCssColor → canvas
 * fillStyle 解析成 rgb，并响应 data-color-scheme + class 变化。
 */
export function useEChartsTheme() {
  const themeVersion = ref(0);
  let observer: MutationObserver | null = null;

  onMounted(() => {
    observer = new MutationObserver(() => {
      themeVersion.value++;
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-color-scheme'],
    });
  });

  onUnmounted(() => observer?.disconnect());

  // 显式 touch themeVersion 让 computed 跟随主题切换重算
  const subtextColor = computed(() => {
    themeVersion.value;
    return resolveCssColor('--muted-foreground', '#6b7280');
  });
  const axisColor = computed(() => {
    themeVersion.value;
    return resolveCssColor('--border', '#e5e7eb');
  });
  const splitLineColor = computed(() => {
    themeVersion.value;
    return resolveCssColor('--border', '#f3f4f6');
  });
  const primaryColor = computed(() => {
    themeVersion.value;
    return resolveCssColor('--primary', '#3b82f6');
  });
  const mutedFillColor = computed(() => {
    themeVersion.value;
    return resolveCssColor('--muted', '#e5e7eb');
  });

  return {
    subtextColor,
    axisColor,
    splitLineColor,
    primaryColor,
    mutedFillColor,
  };
}
