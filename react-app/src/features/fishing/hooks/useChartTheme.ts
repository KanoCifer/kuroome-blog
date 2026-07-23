import { useEffect, useState } from 'react';

/**
 * 把 ECharts 的硬编码色（#3b82f6 / #f97316 / #06b6d4 …）替换成主题 token。
 *
 * 两个坑：
 * 1. `@theme inline` 的 `--color-*` 不会作为 CSS 自定义属性落到 :root，
 *    所以读「原始」主题变量（--ink / --chart-* / --border-color …），它们才真正 emit。
 * 2. zrender（ECharts 的渲染层）解析不了 oklch()，只认 rgb/hex。
 *    用一个隐藏 probe 元素：把 oklch 赋给它的 color，再读 computed color，
 *    浏览器会替我们把 oklch 折算成 rgb。
 *
 * 主题切换（.dark class / data-color-scheme 属性）时 MutationObserver 重算。
 */
export interface ChartTheme {
  ink: string;
  muted: string;
  border: string;
  accent: string;
  paper: string;
  tide: string;
  temp: string;
  rain: string;
  success: string;
  warning: string;
  destructive: string;
}

const VAR_MAP: Record<keyof ChartTheme, string> = {
  ink: '--ink',
  muted: '--muted-text',
  border: '--border-color',
  accent: '--accent',
  paper: '--page',
  tide: '--chart-3',
  temp: '--chart-1',
  rain: '--chart-3',
  success: '--color-emerald-500',
  warning: '--color-amber-500',
  destructive: '--color-rose-500',
};

const FALLBACK: ChartTheme = {
  ink: 'rgb(40, 37, 32)',
  muted: 'rgb(107, 100, 90)',
  border: 'rgb(224, 219, 210)',
  accent: 'rgb(140, 108, 74)',
  paper: 'rgb(248, 245, 240)',
  tide: 'rgb(120, 134, 170)',
  temp: 'rgb(179, 120, 74)',
  rain: 'rgb(120, 134, 170)',
  success: 'rgb(16, 185, 129)',
  warning: 'rgb(245, 158, 11)',
  destructive: 'rgb(244, 63, 94)',
};

function resolveChartTheme(): ChartTheme {
  if (typeof document === 'undefined') return FALLBACK;
  const probe = document.createElement('span');
  probe.style.cssText =
    'position:absolute;opacity:0;pointer-events:none;width:0;height:0';
  document.body.appendChild(probe);
  const rootStyle = getComputedStyle(document.documentElement);
  const out = {} as ChartTheme;
  (Object.keys(VAR_MAP) as (keyof ChartTheme)[]).forEach((key) => {
    const raw = rootStyle.getPropertyValue(VAR_MAP[key]).trim();
    if (!raw) {
      out[key] = FALLBACK[key];
      return;
    }
    probe.style.color = raw;
    const resolved = getComputedStyle(probe).color;
    out[key] = resolved || FALLBACK[key];
  });
  probe.remove();
  return out;
}

/** `rgb(r, g, b)` → `rgba(r, g, b, a)`（用于图表面积渐变的透明尾巴）。
 *  防御性: 输入非字符串 / 非 rgb 格式 / undefined 时, 返回带 fallback 的 rgba,
 *  避免 zrender 在 addColorStop 里撞到 'undefined'。*/
export function withAlpha(
  rgb: string | undefined | null,
  alpha: number,
): string {
  if (!rgb || typeof rgb !== 'string') {
    return `rgba(120, 134, 170, ${alpha})`;
  }
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) {
    // 不是 rgb/rgba 格式 (可能是 oklch / hsl 等), 直接返回透明黑色 fallback,
    // 比让 zrender 撞到 undefined 安全
    return `rgba(120, 134, 170, ${alpha})`;
  }
  const [r, g, b] = m[1].split(',').map((v) => v.trim());
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(resolveChartTheme);

  useEffect(() => {
    const recompute = () => setTheme(resolveChartTheme());
    // 主题切换后 CSS 变量可能在下一帧才落定，rAF 兜一手。
    const observer = new MutationObserver(() =>
      requestAnimationFrame(recompute),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-color-scheme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
