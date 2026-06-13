import fishingSpotsData from '@/data/fishing-spots.json';
import type { MapMarker } from '@/types/marker';

export const MAP_CENTER: [number, number] = [113.389549, 23.050067];
export const MAP_ZOOM = 13;
export const MAP_PLUGIN_LIST = [
  'AMap.Scale',
  'AMap.ToolBar',
  'AMap.Geolocation',
  'AMap.Driving',
];
export const AMAP_SCRIPT_ID = 'amap-jsapi-v2';
export const DEFAULT_TIDE_SPOT_NAME = '黄埔港';

export const fishingSpots = fishingSpotsData as MapMarker[];
