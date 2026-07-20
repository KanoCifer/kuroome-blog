export { default as request } from './request';
export type { ApiResponse } from './request';

export { analyticsGateway } from '@/features/analytics/api/analyticsGateway';
export type {
  AnalyticsGateway,
  AnalyticsOverviewData,
  PostViewData,
} from '@/features/analytics/api/analyticsGateway';

export { deviceGateway } from '@/features/device/api/deviceGateway';
export type {
  DeviceGateway,
  Device,
  DeviceInput,
} from '@/features/device/api/deviceGateway';

export { fetchStatusDetail } from '@/features/pages/api/statusGateway';
export type {
  StatusDetailData,
  VersionInfo,
  ServiceInfo,
  SystemInfo,
} from '@/features/pages/api/statusGateway';

export { fetchRecentEvents } from './logGateway';
export type {
  EventItem,
  EventListData,
  FetchRecentEventsOptions,
} from './logGateway';
