import type { FishingSpot } from '@/api/fishing';

/** 钓点业务字段(location 除外)—— MapMarker.extraData 的精确类型 */
export type SpotDetail = Omit<FishingSpot, 'location'>;

/**
 * 地图标记点 DTO（不耦合 AMap SDK —— MapContainer 内部转为 AMap.Marker）。
 *
 * 字段:
 * - position:  经纬度 [lng, lat]
 * - content:   自定义 DOM 字符串（可选；MapContainer 默认使用内置 SVG）
 * - offset:    像素偏移 [x, y]（可选；与 content 配合使用）
 * - extraData: 钓点业务数据（name/description/tags/rating/images 等，location 除外）
 *             来源：FishingSpot DTO；地图渲染层（renderMarkers / planFromMarker）
 *             只消费 position —— 挂 extraData 是给 infoWindow / 详情面板等上层用。
 */
export interface MapMarker {
  position: [number, number];
  content?: string;
  offset?: [number, number];
  extraData?: Omit<FishingSpot, 'location'>;
}

/**
 * FishingSpot DTO → MapMarker transform。
 * location 拆为 position；其余字段收进 extraData。
 *
 * 纯函数、无副作用 —— 可在 composable / 测试中直接调用。
 */
export function toMapMarker(spot: FishingSpot): MapMarker {
  const { location, ...rest } = spot;
  return {
    position: location,
    extraData: rest,
  };
}

/** 批量 transform —— fishingSpotsGateway.list() 结果直接喂给本函数 */
export function toMapMarkers(spots: FishingSpot[]): MapMarker[] {
  return spots.map(toMapMarker);
}
