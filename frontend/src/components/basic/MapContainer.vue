<template>
  <div class="relative h-full w-full">
    <div ref="containerRef" class="map-container shadow-md"></div>
    <button
      v-if="props.showGeolocation"
      type="button"
      :class="[
        'bg-card/90 text-foreground hover:bg-card border-border/40 absolute right-2.5 bottom-5 z-10 flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm backdrop-blur-md transition-colors disabled:opacity-50',
        isLocating && 'text-primary',
      ]"
      :disabled="isLocating"
      aria-label="定位到当前位置"
      @click="handleLocateClick"
    >
      <Locate v-if="!isLocating" class="h-4 w-4" />
      <Loader2 v-else class="h-4 w-4 animate-spin" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { mapGateway } from '@/api/mapGateway';
import AMapLoader from '@amap/amap-jsapi-loader';
import { Loader2, Locate } from '@lucide/vue';
import type { MapMarker } from '@/types/marker';
import { onMounted, onUnmounted, ref, watch, useTemplateRef } from 'vue';

/* -------------------------------------------------------------------------
 * 插件服务类型 —— @types/amap-js-api 只覆盖核心 map API。
 * Driving / Geolocation / CitySearch / ToolBar / Scale 属于插件服务,
 * 没有官方类型;只在本组件使用,内联为私有接口。
 * ----------------------------------------------------------------------- */

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

interface CitySearchService {
  getLocalCity(
    callback: (status: 'complete' | string, result: unknown) => void,
  ): void;
}

/**
 * 把官方 AMap 核心类 + 插件 ctor 合并为单一视图,
 * loader 返回 any,这里断言后即可在组件内用 AMap.X 访问。
 */
type AMapWithPlugins = typeof AMap & {
  CitySearch: new () => CitySearchService;
  Driving: new (options?: {
    map?: AMap.Map;
    policy?: number;
    showTraffic?: boolean;
  }) => DrivingService;
  ToolBar: new (opts?: { position?: string }) => object;
  Scale: new () => object;
};

declare global {
  interface Window {
    _AMapSecurityConfig: { securityJsCode: string };
  }
}

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');

export interface Props {
  center?: [number, number];
  zoom?: number;
  viewMode?: '2D' | '3D';
  plugins?: string[];
  markers?: MapMarker[];
  showToolBar?: boolean;
  showScale?: boolean;
  showGeolocation?: boolean;
  isDarkMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [113.389549, 23.050067],
  zoom: 11,
  viewMode: '2D',
  plugins: () => [
    'AMap.Scale',
    'AMap.ToolBar',
    'AMap.CitySearch',
    'AMap.Driving',
  ],
  markers: () => [],
  showToolBar: true,
  showScale: true,
  showGeolocation: false,
  isDarkMode: false,
});

const emit = defineEmits<{
  (e: 'click', event: unknown): void;
  (e: 'markerClick', index: number): void;
  (e: 'mapReady', map: unknown): void;
  (e: 'error', message: string): void;
}>();

let map: AMap.Map | null = null;
let markerInstances: AMap.Marker[] = [];
let driving: DrivingService | null = null;
let currentRoute: AMap.Polyline | null = null;
let clickHandler: ((e: unknown) => void) | null = null;
let userLocationMarker: AMap.Marker | null = null;

const isLocating = ref(false);

const fetchSecurityKey = async (): Promise<string> => {
  try {
    const response = await mapGateway.getSecurityKey();
    const encodedKey = response.securityJsCode || '';

    if (encodedKey) {
      try {
        const decoded = atob(encodedKey);

        return decoded;
      } catch {
        return encodedKey;
      }
    }

    return import.meta.env.VITE_AMAP_SECURITY_CODE || '';
  } catch {
    return import.meta.env.VITE_AMAP_SECURITY_CODE || '';
  }
};

onMounted(async () => {
  const securityCode = await fetchSecurityKey();
  window._AMapSecurityConfig = {
    securityJsCode: securityCode,
  };

  const plugins = [...props.plugins];
  if (props.showToolBar && !plugins.includes('AMap.ToolBar')) {
    plugins.push('AMap.ToolBar');
  }
  if (props.showScale && !plugins.includes('AMap.Scale')) {
    plugins.push('AMap.Scale');
  }

  AMapLoader.load({
    key: import.meta.env.VITE_JS_API,
    version: '2.0',
    plugins,
  })
    .then((loadedAMap) => {
      const AMap = loadedAMap as AMapWithPlugins;
      if (!containerRef.value) return;

      map = new AMap.Map(containerRef.value, {
        viewMode: props.viewMode,
        zoom: props.zoom,
        center: props.center,
        layers: [new AMap.TileLayer.Satellite()],
        mapStyle: props.isDarkMode
          ? 'amap://styles/dark'
          : 'amap://styles/normal',
      });

      // 添加控件
      if (props.showToolBar) {
        const toolbar = new AMap.ToolBar({ position: 'RT' });
        map.addControl(toolbar);
      }

      if (props.showScale) {
        const scale = new AMap.Scale();
        map.addControl(scale);
      }

      // 添加标记点
      addMarkers(AMap);

      // 初始化路线规划
      try {
        driving = new AMap.Driving({
          map: map,
          showTraffic: true,
        });
      } catch (error) {
        console.error('路线规划初始化失败:', error);
      }

      // 添加点击事件
      clickHandler = (e: unknown) => emit('click', e);
      map.on('click', clickHandler);

      emit('mapReady', map);
    })
    .catch((e: unknown) => {
      console.error('AMap loading error:', e);
    });
});

// 添加标记点
const addMarkers = (AMap: AMapWithPlugins) => {
  const content = `<div><svg t="1774099170648" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5285" width="36" height="36"><path d="M188.64 913.44a365.416 90.56 0 1 0 730.832 0 365.416 90.56 0 1 0-730.832 0Z" fill="#B8CBCD" p-id="5286"></path><path d="M846.496 376.472c0 176.328-319.28 517.224-319.28 517.224S207.944 551.808 207.944 375.472c0-176.32 142.944-318.272 319.272-318.272s319.28 142.944 319.28 319.272z" fill="#F7BB83" p-id="5287"></path><path d="M527.216 917.696H527.2a24.016 24.016 0 0 1-17.52-7.616c-13.304-14.24-325.736-350.92-325.736-534.608 0-188.728 153.992-342.272 343.272-342.272 189.288 0 343.28 153.992 343.28 343.272 0 183.704-312.464 519.432-325.768 533.632a24 24 0 0 1-17.512 7.592z m0-836.504c-162.816 0-295.272 132.008-295.272 294.272 0 128.448 198.808 375.648 295.208 482.632 65.864-73.488 295.344-339.736 295.344-481.632 0-162.808-132.464-295.272-295.28-295.272z" fill="#6E4123" p-id="5288"></path><path d="M830.296 432.576c0 167.384-303.08 490.976-303.08 490.976S224.144 599.96 224.144 432.576c0-167.376 135.688-303.072 303.072-303.072 167.384 0 303.08 135.696 303.08 303.072z" fill="#F7BB83" p-id="5289"></path><path d="M527.216 939.552a16 16 0 0 1-11.68-5.064c-12.544-13.4-307.392-330.176-307.392-501.912 0-175.936 143.136-319.072 319.072-319.072s319.08 143.136 319.08 319.072c0 171.736-294.848 488.512-307.4 501.912a16 16 0 0 1-11.68 5.064z m0-794.048c-158.288 0-287.072 128.784-287.072 287.072 0 140.912 231.84 406.104 287.072 467.256 55.224-61.16 287.08-326.344 287.08-467.256 0-158.288-128.784-287.072-287.08-287.072z" fill="#6E4123" p-id="5290"></path><path d="M836.984 432.576c0 167.384-309.768 490.976-309.768 490.976S217.072 599.96 217.072 432.576" fill="#F7BB83" p-id="5291"></path><path d="M527.216 947.552c-6.536 0-12.8-2.672-17.328-7.392-12.936-13.504-316.816-332.568-316.816-507.584a24 24 0 1 1 48 0c0 121.232 192.504 354.624 286.136 455.92 93.512-101.312 285.776-334.688 285.776-455.92a24 24 0 1 1 48 0c0 175.008-303.512 494.08-316.432 507.568a24 24 0 0 1-17.336 7.408z" fill="#6E4123" p-id="5292"></path><path d="M528.64 432m-196 0a196 196 0 1 0 392 0 196 196 0 1 0-392 0Z" fill="#FFFFFF" p-id="5293"></path><path d="M528.344 642.12c-118.488 0-214.896-93.032-214.896-207.384 0-56.808 23.336-109.808 65.696-149.248a16.008 16.008 0 0 1 21.816 23.424c-35.8 33.32-55.504 78.008-55.504 125.832 0 96.704 82.048 175.384 182.896 175.384 100.848 0 182.896-78.68 182.896-175.384 0-49.736-22.152-97.32-60.792-130.568a16 16 0 1 1 20.872-24.248c45.704 39.328 71.912 95.76 71.912 154.824 0 114.336-96.408 207.368-214.896 207.368z" fill="#6E4123" p-id="5294"></path><path d="M528.344 570.88c-105.344 0-192.096-76.488-203.624-174.88a194.112 194.112 0 0 0-1.336 22.328c0 108.912 91.768 197.208 204.96 197.208s204.968-88.296 204.968-197.208c0-7.552-0.488-15-1.352-22.328-11.528 98.4-98.272 174.88-203.616 174.88z" fill="#6E4123" p-id="5295"></path><path d="M548.64 476c0 13.2-10.8 24-24 24s-24-10.8-24-24v-96c0-13.2 10.8-24 24-24s24 10.8 24 24v96z" fill="#6E4123" p-id="5296"></path><path d="M476.64 452c-13.2 0-24-10.8-24-24s10.8-24 24-24h96c13.2 0 24 10.8 24 24s-10.8 24-24 24h-96z" fill="#6E4123" p-id="5297"></path></svg></div>`; // 可以根据需要自定义标记点内容

  props.markers.forEach((markerData, index) => {
    const marker = new AMap.Marker({
      position: markerData.position,
      content: content,
      offset: new AMap.Pixel(-13, -30),
    });

    marker.on('click', () => emit('markerClick', index));
    marker.setMap(map);
    markerInstances.push(marker);
  });
};

// 监听标记点变化
watch(
  () => props.markers,
  () => {
    if (map) {
      AMapLoader.load({
        key: import.meta.env.VITE_JS_API,
        version: '2.0',
      }).then((loadedAMap) => {
        addMarkers(loadedAMap as AMapWithPlugins);
      });
    }
  },
  { deep: true },
);

// 监听中心点变化
watch(
  () => props.center,
  (newCenter) => {
    if (map && newCenter) {
      map.setCenter(newCenter);
    }
  },
);

// 监听缩放级别变化
watch(
  () => props.zoom,
  (newZoom) => {
    if (map && newZoom !== undefined) {
      map.setZoom(newZoom);
    }
  },
);

watch(
  () => props.isDarkMode,
  (isDarkMode) => {
    if (map) {
      map.setMapStyle(
        isDarkMode ? 'amap://styles/dark' : 'amap://styles/normal',
      );
    }
  },
);

// 规划路线
const planRoute = (
  start: [number, number],
  end: [number, number],
): Promise<{ distance: number; time: number }> => {
  return new Promise((resolve, reject) => {
    if (!map) {
      reject(new Error('地图未初始化'));
      return;
    }

    if (!driving) {
      try {
        const AMap = (window as unknown as { AMap: AMapWithPlugins }).AMap;
        driving = new AMap.Driving({
          map: map,
          showTraffic: true,
        });
      } catch (error) {
        console.error('driving 初始化失败:', error);
        reject(new Error('路线规划服务初始化失败'));
        return;
      }
    }

    // 清除之前的路线
    clearRoute();

    driving.search(start, end, (status: string, result: unknown) => {
      // 调试日志
      console.debug('路线规划回调:', { status, result });

      if (status === 'complete' && result && typeof result === 'object') {
        const drivingResult = result as {
          routes?: Array<{
            distance: number;
            time: number;
            steps?: Array<{ path?: [number, number][] }>;
          }>;
          info?: string;
        };

        if (drivingResult.routes && drivingResult.routes.length > 0) {
          const route = drivingResult.routes[0];

          if (!route.steps || route.steps.length === 0) {
            console.error('路线步骤为空:', result);
            reject(new Error('路线数据不完整'));
            return;
          }

          const path: [number, number][] = [];

          // 提取路径点
          route.steps.forEach((step) => {
            if (step.path) {
              path.push(...step.path);
            }
          });

          if (path.length === 0) {
            console.error('路线坐标为空:', result);
            reject(new Error('路线坐标数据为空'));
            return;
          }

          // map!.add(currentRoute);
          map!.setFitView();

          resolve({
            distance: route.distance,
            time: route.time,
          });
        } else {
          console.warn('未找到路线:', drivingResult.info);
          reject(new Error('未找到可行路线，请检查起终点位置是否可通行'));
        }
      } else if (status === 'no_data') {
        console.warn('无路线数据:', result);
        reject(new Error('起终点之间无法通行，请尝试其他目的地'));
      } else {
        console.error('路线规划失败:', { status, result });
        reject(new Error('路线规划失败，请检查网络连接或稍后重试'));
      }
    });
  });
};

// 清除路线
const clearRoute = () => {
  if (currentRoute && map) {
    map.remove(currentRoute);
    currentRoute = null;
  }
};

/**
 * WGS-84 → GCJ-02 坐标转换 (AMap.convertFrom)。
 * navigator.geolocation 返回 WGS-84,AMap 内部使用 GCJ-02;
 * 不转换的话偏差 ~100-700m,驾车/步行路线起点会偏到隔壁马路。
 */
const wgs84ToGcj02 = (lng: number, lat: number): Promise<[number, number]> => {
  return new Promise((resolve, reject) => {
    const AMap = (window as unknown as { AMap: AMapWithPlugins }).AMap;
    AMap.convertFrom([lng, lat], 'gps', (status, result) => {
      if (status !== 'complete' || typeof result === 'string' || !result.locations.length) {
        // 转换失败时降级返回原始坐标,不阻断流程
        resolve([lng, lat]);
        return;
      }
      const [loc] = result.locations;
      resolve([loc.getLng(), loc.getLat()]);
    });
  });
};

// 获取用户当前位置
// 链路:浏览器原生 Geolocation (WGS-84,街道级 ~10m) → convertFrom → GCJ-02 →
//      AMap.CitySearch (GCJ-02,城市级矩形中心 ~5km) → 报错
// 桌面 Mac / 关 Wi-Fi 时 CoreLocation 必失败,IP 兜底仍是核心路径
const getCurrentPosition = (): Promise<[number, number]> => {
  return new Promise((resolve, reject) => {
    if (!map) {
      reject(new Error('地图未初始化'));
      return;
    }

    // IP 兜底:AMap CitySearch(GCJ-02,城市级矩形中心)
    const tryIPFallback = (browserReason: string) => {
      try {
        const AMap = (window as unknown as { AMap: AMapWithPlugins }).AMap;
        const citySearch = new AMap.CitySearch();
        citySearch.getLocalCity((status: string, result: unknown) => {
          if (status !== 'complete') {
            const err = result as { info?: string } | null;
            reject(
              new Error(
                `浏览器定位失败 (${browserReason});IP 定位也失败 (${err?.info || '未知'})。` +
                  '请检查 macOS 位置服务 / Wi-Fi / 浏览器位置权限,或临时关闭广告拦截扩展',
              ),
            );
            return;
          }
          const r = result as { rectangle?: string };
          if (!r.rectangle) {
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
      } catch (e) {
        reject(new Error(e instanceof Error ? e.message : String(e)));
      }
    };

    // GeolocationPositionError → 可读标签
    const labelGeoError = (err: GeolocationPositionError): string => {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          return '用户拒绝授权';
        case err.POSITION_UNAVAILABLE:
          return '位置不可用(可能关 Wi-Fi / 关 macOS 定位服务)';
        case err.TIMEOUT:
          return '定位超时';
        default:
          return `未知错误 (${err.message || 'code=' + err.code})`;
      }
    };

    // 首选:浏览器原生 Geolocation(街道级精度,WGS-84 → 转 GCJ-02)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const gcj = await wgs84ToGcj02(
            pos.coords.longitude,
            pos.coords.latitude,
          );
          resolve(gcj);
        },
        (err) => {
          tryIPFallback(labelGeoError(err));
        },
        {
          enableHighAccuracy: false, // 桌面场景:省电 + 网络定位更快
          timeout: 10_000,
          maximumAge: 60_000, // 1 分钟内复用,避免重复弹权限
        },
      );
      return;
    }

    // 浏览器不支持 Geolocation(罕见,老浏览器),直接走 IP
    tryIPFallback('浏览器不支持 Geolocation API');
  });
};

// 定位按钮点击:复用 getCurrentPosition 的双链路,然后 setCenter + 打点
const handleLocateClick = async () => {
  isLocating.value = true;
  try {
    const [lng, lat] = await getCurrentPosition();
    if (!map) return;
    map.setCenter([lng, lat]);
    map.setZoom(15);
    showUserLocationMarker(lng, lat);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('定位失败:', msg);
    emit('error', `定位失败: ${msg}`);
  } finally {
    isLocating.value = false;
  }
};

// 在用户位置打一个 marker;后续点击先清旧的
const showUserLocationMarker = (lng: number, lat: number) => {
  if (!map) return;
  if (userLocationMarker) {
    map.remove(userLocationMarker);
    userLocationMarker = null;
  }
  const AMap = (window as unknown as { AMap: AMapWithPlugins }).AMap;
  userLocationMarker = new AMap.Marker({
    position: [lng, lat],
    content:
      '<div style="width:16px;height:16px;background:#1e88e5;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(30,136,229,0.25);"></div>',
    offset: new AMap.Pixel(-10, -10),
    zIndex: 200,
  });
  map.add(userLocationMarker);
};

// 暴露方法给父组件
defineExpose({
  planRoute,
  clearRoute,
  getCurrentPosition,
});

onUnmounted(() => {
  // 清除标记点
  markerInstances.forEach((marker) => marker.setMap(null));
  markerInstances = [];
  userLocationMarker = null;

  // 清除路线
  driving?.clear();
  driving = null;
  currentRoute = null;

  // 解绑地图的点击事件
  if (map && clickHandler) {
    map.off('click', clickHandler);
    clickHandler = null;
  }

  // 销毁地图，并清空地图容器
  if (map) {
    map.destroy();
    map = null;
  }

  // 清除地图容器的 DOM 元素（可选，Vue 会自动清理）
  if (containerRef.value) {
    containerRef.value.innerHTML = '';
  }
});
</script>

<style scoped>
.map-container {
  padding: 0px;
  margin: 0px;
  width: 100%;
  height: 100%;
}
</style>
