// analytics 模块桶导出 — 对外公开 API

export { default as AnalyticsView } from './AnalyticsView.vue';
export * from './components';
export { analyticsGateway } from './api/analyticsGateway';
export type { AnalyticsGateway } from './api/analyticsGateway';
export * from './types';
