import { computed } from 'vue';

/**
 * Read CSS custom properties for ECharts theming.
 * Returns reactive color values that update when the color scheme changes.
 */
export function useChartColors() {
  const getCSSVar = (name: string): string => {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  };

  const textColor = computed(() => getCSSVar('--foreground'));
  const mutedColor = computed(() => getCSSVar('--muted-foreground'));
  const borderColor = computed(() => getCSSVar('--border'));
  const primaryColor = computed(() => getCSSVar('--primary'));
  const backgroundColor = computed(() => getCSSVar('--background'));

  const chartColors = computed(() => [
    getCSSVar('--chart-1'),
    getCSSVar('--chart-2'),
    getCSSVar('--chart-3'),
    getCSSVar('--chart-4'),
    getCSSVar('--chart-5'),
  ]);

  return {
    textColor,
    mutedColor,
    borderColor,
    primaryColor,
    backgroundColor,
    chartColors,
    getCSSVar,
  };
}
