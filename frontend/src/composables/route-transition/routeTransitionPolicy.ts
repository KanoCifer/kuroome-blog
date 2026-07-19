// 路由过渡动画策略 —— 纯模块，不依赖 Vue / Pinia，可独立单测。
// 单一职责：route.meta.transition → { name, duration, easing }。

/** 已支持的过渡动画名。router meta 中只允许写这些值。 */
export type RouteTransitionName = 'fade' | 'slide-up';

/** 单个过渡动画的完整描述（供 <Transition> 与 CSS 校验使用）。 */
export interface RouteTransitionSpec {
  readonly name: RouteTransitionName;
  /** 进入/离开动画时长（秒）。 */
  readonly duration: number;
  /** cubic-bezier 控制点（CSS 语法）。 */
  readonly easing: string;
}

/** router meta 未声明 transition 时使用的默认动画。 */
export const DEFAULT_TRANSITION_NAME: RouteTransitionName = 'slide-up';

/** 已知过渡动画的注册表 —— 单一事实来源。 */
export const TRANSITION_SPECS: Readonly<
  Record<RouteTransitionName, RouteTransitionSpec>
> = {
  fade: {
    name: 'fade',
    duration: 0.15,
    easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
  },
  'slide-up': {
    name: 'slide-up',
    duration: 0.28,
    easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
  },
} as const;

const VALID_NAMES = new Set<RouteTransitionName>(
  Object.keys(TRANSITION_SPECS) as RouteTransitionName[],
);

/** 类型守卫：判断给定字符串是否为合法的过渡动画名。 */
export function isRouteTransitionName(
  value: unknown,
): value is RouteTransitionName {
  return typeof value === 'string' && VALID_NAMES.has(value as RouteTransitionName);
}

/**
 * 把 router meta 上的 transition 字段解析为完整的动画规格。
 * 缺失或未知值一律降级到 DEFAULT_TRANSITION_NAME —— 调用方无需关心兜底。
 */
export function resolveTransitionSpec(
  metaTransition: unknown,
): RouteTransitionSpec {
  const name = isRouteTransitionName(metaTransition)
    ? metaTransition
    : DEFAULT_TRANSITION_NAME;
  return TRANSITION_SPECS[name];
}