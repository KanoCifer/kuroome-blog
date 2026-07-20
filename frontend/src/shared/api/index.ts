export { default as apiClient } from './apiClient';
export type { ApiResponse } from './apiClient';

export { analyticsGateway } from '@/features/analytics/api/analyticsGateway';
export type { AnalyticsGateway } from '@/features/analytics/api/analyticsGateway';
// 统计领域类型 —— 真源在 @/features/analytics/types
export type {
  AnalyticsOverviewData,
  PostViewData,
} from '@/features/analytics/types';

export { deviceGateway } from '@/features/device/api/deviceGateway';
export type { DeviceGateway } from '@/features/device/api/deviceGateway';
// 设备领域类型 —— 真源在 @/features/device/types
export type { Device, DeviceInput } from '@/features/device/types';

export { fetchStatusDetail } from '@/features/pages/api/statusGateway';
// 状态页领域类型 —— 真源在 @/features/pages/types
export type {
  ServiceInfo,
  StatusDetailData,
  SystemInfo,
  VersionInfo,
} from '@/features/pages/types';

export { fetchRecentEvents } from '../../features/pages/api/logGateway';
export type {
  EventItem,
  EventListData,
  FetchRecentEventsOptions,
} from '../../features/pages/api/logGateway';
