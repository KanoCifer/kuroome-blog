// useRouteTransition —— 把 routeTransitionPolicy 暴露给 template 使用的 Vue 适配层。
// view 只读 { transition, isEntryView }，不再关心 router meta 的字符串细节。
import { computed, type ComputedRef } from 'vue';
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';

import {
  resolveTransitionSpec,
  type RouteTransitionSpec,
} from './routeTransitionPolicy';

export interface UseRouteTransitionOptions {
  /** 首页路由路径 —— 该路径下不做过渡动画。 */
  entryPath?: string;
}

export interface UseRouteTransitionReturn {
  /** 当前路由应使用的动画规格（name + duration + easing）。 */
  transition: ComputedRef<RouteTransitionSpec>;
  /** 当前是否位于首页（不做动画）。 */
  isEntryView: ComputedRef<boolean>;
  /** 当前路由对象，便于组件按需读取其它 meta 字段。 */
  route: ComputedRef<RouteLocationNormalizedLoaded>;
}

/**
 * 派生当前路由的过渡动画策略。
 * 纯派生：不发请求、不动 store；调用方只需在 <Transition> 上消费。
 */
export function useRouteTransition(
  options: UseRouteTransitionOptions = {},
): UseRouteTransitionReturn {
  const { entryPath = '/' } = options;
  const route = useRoute();

  const transition = computed(() =>
    resolveTransitionSpec(route.meta.transition),
  );

  const isEntryView = computed(() => route.path === entryPath);

  return {
    transition,
    isEntryView,
    route: computed(() => route),
  };
}