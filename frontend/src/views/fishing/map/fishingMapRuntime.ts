/**
 * FishingMapRuntime —— 地图行为深模块。
 *
 * 把原本埋在 MapContainer.vue 里的三类行为收拢到一处:
 * - 钓点标记渲染 (markers)
 * - 驾车路线规划 (planRoute / clearRoute)
 * - 当前位置解析 (getCurrentPosition, 委托给 LocationResolver)
 *
 * AMap 实例从构造参数直接传入;坐标转换作为私有对象满足 CoordConverter 端口,
 * LocationResolver 通过该端口调用,生产用 AMap、测试可注入 in-memory 实现。
 */
import type { AMapWithPlugins } from '@/views/fishing/map/amapNamespace';
import type { CoordConverter } from '@/views/fishing/map/locationResolver';
import { resolveCurrentPosition } from '@/views/fishing/map/locationResolver';
import type { MapMarker } from '@/types/marker';
import type { RouteInfo } from '@/views/fishing/composables/useFishingRoute';

// ---- AMap 内部服务类型(本文件独占,不导出)----

interface DrivingService {
  search(
    origin: [number, number] | AMap.LngLat,
    destination: [number, number] | AMap.LngLat,
    callback: (
      status: 'complete' | 'no_data' | string,
      result: unknown,
    ) => void,
  ): void;
  clear(): void;
}

/** 钓点标记 SVG —— 24×32 极简几何:圆头 + 下方三角,蓝描边。 */
export const FISHING_MARKER_CONTENT = `
  <div style="width:24px;height:32px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(37,99,235,0.3));">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32" aria-hidden="true">
      <path
        d="M12 1.5C6.2 1.5 1.5 6.05 1.5 11.65c0 7.7 8.7 17.5 9.7 18.55a1.1 1.1 0 0 0 1.6 0c1-.05 9.7-10.85 9.7-18.55C22.5 6.05 17.8 1.5 12 1.5Z"
        fill="#FFFFFF"
        stroke="#2563EB"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <circle cx="12" cy="11.5" r="3" fill="#2563EB"/>
    </svg>
  </div>
`;

/** marker 点击时抛出的载荷 —— 闭包从 MapMarker 带下来,上层无需再按 index 反查 */
export interface MarkerClickPayload {
  index: number;
  spot: MapMarker;
}

export class FishingMapRuntime {
  private readonly map: AMap.Map;
  private readonly ns: AMapWithPlugins;

  private readonly converter: CoordConverter;
  private markers: AMap.Marker[] = [];
  /** 与 this.markers 一一对应,保留 source MapMarker(含 extraData)供点击回调带回 */
  private markerSources: MapMarker[] = [];
  private userLocationMarker: AMap.Marker | null = null;
  private driving: DrivingService | null = null;

  /**
   * 标记点击回调(由组件注入,转发到上层 emit)。
   * payload.spot.extraData 含钓点业务字段(name/description/tags/rating/images…),
   * payload.position 为经纬度 —— 规划路线 / 详情 Modal 各取所需。
   */
  onMarkerClick: ((payload: MarkerClickPayload) => void) | null = null;

  constructor(map: AMap.Map, ns: AMapWithPlugins) {
    this.map = map;
    this.ns = ns;
    this.converter = {
      fromGps: (lng, lat) => this.fromGps(lng, lat),
      locateByIp: () => this.locateByIp(),
    };
  }

  /** 渲染钓点标记;调用前会清除旧标记 */
  renderMarkers(markers: MapMarker[]): void {
    this.clearMarkers();
    const { map, ns } = this;

    markers.forEach((markerData, index) => {
      const marker = new ns.Marker({
        position: markerData.position,
        content: markerData.content ?? FISHING_MARKER_CONTENT,
        offset: new ns.Pixel(-13, -30),
      });

      marker.on('click', () => {
        // 1. 获取当前点击的 Marker 位置
        // const position = marker.getPosition(); // 返回 AMap.LngLat 对象

        // // 2. 地图视角移动到该点并放大
        // map.setZoomAndCenter(15, position as AMap.LocationValue);
        this.onMarkerClick?.({ index, spot: this.markerSources[index] });
      });
      marker.setMap(map);
      this.markers.push(marker);
      this.markerSources.push(markerData);
    });
  }

  /** 清除所有钓点标记 */
  clearMarkers(): void {
    this.markers.forEach((m) => m.setMap(null));
    this.markers = [];
    this.markerSources = [];
  }

  /** 容器尺寸变化后通知 AMap 重新测量(运行时方法,类型未声明) */
  resize(): void {
    (this.map as unknown as { resize: () => void }).resize();
  }

  /** 规划驾车路线;返回距离(米)与耗时(秒)。失败抛带可读信息的 Error */
  planRoute(
    start: [number, number],
    end: [number, number],
  ): Promise<RouteInfo> {
    return new Promise((resolve, reject) => {
      const driving = this.ensureDriving();
      driving.clear();

      driving.search(start, end, (status, result) => {
        if (status === 'complete' && result) {
          const r = result as {
            routes?: Array<{ distance: number; time: number }>;
            info?: string;
          };
          if (r.routes && r.routes.length > 0) {
            const route = r.routes[0];
            this.map.setFitView();
            resolve({ distance: route.distance, time: route.time });
          } else {
            reject(new Error('未找到可行路线，请检查起终点位置是否可通行'));
          }
        } else if (status === 'no_data') {
          reject(new Error('起终点之间无法通行，请尝试其他目的地'));
        } else {
          reject(new Error('路线规划失败，请检查网络连接或稍后重试'));
        }
      });
    });
  }

  /** 清除当前路线(Driving 绑定 map,由官方渲染,用 driving.clear 移除) */
  clearRoute(): void {
    this.driving?.clear();
  }

  /** 地图视角移动到指定坐标并缩放 */
  setZoomAndCenter(zoom: number, center: [number, number]): void {
    this.map.setZoomAndCenter(zoom, center);
  }

  /** 当前位置 [lng,lat](GCJ-02);委托给 LocationResolver */
  getCurrentPosition(): Promise<[number, number]> {
    if (!this.map) {
      return Promise.reject(new Error('地图未初始化'));
    }
    return resolveCurrentPosition(this.converter);
  }

  /** 在用户位置打一个 marker;后续点击先清旧的 */
  showUserLocationMarker(lng: number, lat: number): void {
    const { map, ns } = this;
    if (this.userLocationMarker) {
      map.remove(this.userLocationMarker);
      this.userLocationMarker = null;
    }
    this.userLocationMarker = new ns.Marker({
      position: [lng, lat],
      content:
        '<div style="width:16px;height:16px;background:#1e88e5;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(30,136,229,0.25);"></div>',
      offset: new ns.Pixel(-10, -10),
      zIndex: 200,
    });
    map.add(this.userLocationMarker);
  }

  /** 释放资源(组件卸载时调用) */
  dispose(): void {
    this.clearMarkers();
    this.clearRoute();
    this.driving = null;
    this.userLocationMarker = null;
  }

  // ---- 私有:CoordConverter 端口实现 ----

  private fromGps(lng: number, lat: number): Promise<[number, number]> {
    return new Promise((resolve) => {
      this.ns.convertFrom([lng, lat], 'gps', (status, result) => {
        const r = result as
          | {
              info?: string;
              locations?: Array<{ getLng(): number; getLat(): number }>;
            }
          | string
          | undefined;
        if (
          status !== 'complete' ||
          typeof r === 'string' ||
          !r?.locations?.length
        ) {
          // 转换失败时降级返回原始坐标,不阻断流程
          resolve([lng, lat]);
          return;
        }
        const [loc] = r.locations;
        resolve([loc.getLng(), loc.getLat()]);
      });
    });
  }

  private locateByIp(): Promise<[number, number]> {
    return new Promise((resolve, reject) => {
      const citySearch = new this.ns.CitySearch();
      citySearch.getLocalCity((status, result) => {
        const r = result as { rectangle?: string; info?: string } | null;
        if (status !== 'complete') {
          reject(new Error(r?.info || '未知'));
          return;
        }
        if (!r?.rectangle) {
          reject(new Error('IP 定位未返回坐标范围'));
          return;
        }
        const [p1, p2] = r.rectangle.split(';');
        if (!p1 || !p2) {
          reject(new Error('IP 定位坐标格式异常'));
          return;
        }
        const [lng1, lat1] = p1.split(',').map(Number);
        const [lng2, lat2] = p2.split(',').map(Number);
        if ([lng1, lat1, lng2, lat2].some(Number.isNaN)) {
          reject(new Error('IP 定位坐标解析失败'));
          return;
        }
        // 矩形中心(精度到城市级,够钓鱼指数计算)
        resolve([(lng1 + lng2) / 2, (lat1 + lat2) / 2]);
      });
    });
  }

  private ensureDriving(): DrivingService {
    if (!this.driving) {
      this.driving = new this.ns.Driving({
        map: this.map,
        showTraffic: true,
      });
    }
    return this.driving;
  }
}
