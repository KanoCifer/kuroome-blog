/**
 * 地图标记点 DTO（不耦合 AMap SDK —— MapContainer 内部转为 AMap.Marker）。
 *
 * 字段:
 * - position: 经纬度 [lng, lat]
 * - content:  自定义 DOM 字符串（可选；MapContainer 默认使用内置 SVG）
 * - offset:   像素偏移 [x, y]（可选；与 content 配合使用）
 */
export interface MapMarker {
  position: [number, number];
  content?: string;
  offset?: [number, number];
}
