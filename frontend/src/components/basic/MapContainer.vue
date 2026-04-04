<template>
  <div ref="containerRef" class="map-container shadow-md"></div>
</template>

<script setup lang="ts">
import { mapService } from "@/service/mapService";
import type {
  AMapDriving,
  AMapMapInstance,
  AMapMarker,
  AMapMarkerInstance,
  AMapNamespace,
  AMapPolyline,
  AMapSecurityConfig,
} from "@/types/maptype";
import AMapLoader from "@amap/amap-jsapi-loader";
import { onMounted, onUnmounted, ref, watch } from "vue";

export interface Props {
  center?: [number, number];
  zoom?: number;
  viewMode?: "2D" | "3D";
  plugins?: string[];
  markers?: AMapMarker[];
  showToolBar?: boolean;
  showScale?: boolean;
  showGeolocation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [113.389549, 23.050067],
  zoom: 11,
  viewMode: "2D",
  plugins: () => ["AMap.Scale", "AMap.ToolBar", "AMap.Geolocation", "AMap.Driving"],
  markers: () => [],
  showToolBar: true,
  showScale: true,
  showGeolocation: false,
});

const emit = defineEmits<{
  (e: "click", event: unknown): void;
  (e: "markerClick", index: number): void;
  (e: "mapReady", map: unknown): void;
}>();

declare global {
  interface Window {
    _AMapSecurityConfig: AMapSecurityConfig;
  }
}
declare global {
  interface Window {
    AMap: AMapNamespace;
  }
}

const containerRef = ref<HTMLDivElement | null>(null);
let map: AMapMapInstance | null = null;
let markerInstances: AMapMarkerInstance[] = [];
let driving: AMapDriving | null = null;
let currentRoute: AMapPolyline | null = null;
let clickHandler: ((e: unknown) => void) | null = null;

const fetchSecurityKey = async (): Promise<string> => {
  try {
    const response = await mapService.getSecurityKey();
    const encodedKey = response.data?.data?.securityJsCode || "";

    // Decode base64 encoded key
    if (encodedKey) {
      try {
        return atob(encodedKey);
      } catch {
        return encodedKey;
      }
    }

    return "";
  } catch (error) {
    console.error("Failed to fetch Amap security key:", error);
    return "";
  }
};

onMounted(async () => {
  const securityCode = await fetchSecurityKey();
  window._AMapSecurityConfig = {
    securityJsCode: securityCode,
  };

  const plugins = [...props.plugins];
  if (props.showToolBar && !plugins.includes("AMap.ToolBar")) {
    plugins.push("AMap.ToolBar");
  }
  if (props.showScale && !plugins.includes("AMap.Scale")) {
    plugins.push("AMap.Scale");
  }
  if (props.showGeolocation && !plugins.includes("AMap.Geolocation")) {
    plugins.push("AMap.Geolocation");
  }

  AMapLoader.load({
    key: import.meta.env.VITE_JS_API,
    version: "2.0",
    plugins,
  })
    .then((loadedAMap) => {
      const AMap = loadedAMap as AMapNamespace;
      if (!containerRef.value) return;

      map = new AMap.Map(containerRef.value, {
        viewMode: props.viewMode,
        zoom: props.zoom,
        center: props.center,
      });

      // 添加控件
      if (props.showToolBar) {
        const toolbar = new AMap.ToolBar({ position: "RT" });
        map.addControl(toolbar);
      }

      if (props.showScale) {
        const scale = new AMap.Scale();
        map.addControl(scale);
      }

      if (props.showGeolocation) {
        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          buttonPosition: "RB",
          buttonOffset: new AMap.Pixel(10, 20),
        });
        map.addControl(geolocation);
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
        console.error("路线规划初始化失败:", error);
      }

      // 添加点击事件
      clickHandler = (e: unknown) => emit("click", e);
      map.on("click", clickHandler);

      emit("mapReady", map);
    })
    .catch((e: unknown) => {
      console.error("AMap loading error:", e);
    });
});

// 添加标记点
const addMarkers = (AMap: AMapNamespace) => {
  const content = `<div><svg t="1774099170648" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5285" width="36" height="36"><path d="M188.64 913.44a365.416 90.56 0 1 0 730.832 0 365.416 90.56 0 1 0-730.832 0Z" fill="#B8CBCD" p-id="5286"></path><path d="M846.496 376.472c0 176.328-319.28 517.224-319.28 517.224S207.944 551.808 207.944 375.472c0-176.32 142.944-318.272 319.272-318.272s319.28 142.944 319.28 319.272z" fill="#F7BB83" p-id="5287"></path><path d="M527.216 917.696H527.2a24.016 24.016 0 0 1-17.52-7.616c-13.304-14.24-325.736-350.92-325.736-534.608 0-188.728 153.992-342.272 343.272-342.272 189.288 0 343.28 153.992 343.28 343.272 0 183.704-312.464 519.432-325.768 533.632a24 24 0 0 1-17.512 7.592z m0-836.504c-162.816 0-295.272 132.008-295.272 294.272 0 128.448 198.808 375.648 295.208 482.632 65.864-73.488 295.344-339.736 295.344-481.632 0-162.808-132.464-295.272-295.28-295.272z" fill="#6E4123" p-id="5288"></path><path d="M830.296 432.576c0 167.384-303.08 490.976-303.08 490.976S224.144 599.96 224.144 432.576c0-167.376 135.688-303.072 303.072-303.072 167.384 0 303.08 135.696 303.08 303.072z" fill="#F7BB83" p-id="5289"></path><path d="M527.216 939.552a16 16 0 0 1-11.68-5.064c-12.544-13.4-307.392-330.176-307.392-501.912 0-175.936 143.136-319.072 319.072-319.072s319.08 143.136 319.08 319.072c0 171.736-294.848 488.512-307.4 501.912a16 16 0 0 1-11.68 5.064z m0-794.048c-158.288 0-287.072 128.784-287.072 287.072 0 140.912 231.84 406.104 287.072 467.256 55.224-61.16 287.08-326.344 287.08-467.256 0-158.288-128.784-287.072-287.08-287.072z" fill="#6E4123" p-id="5290"></path><path d="M836.984 432.576c0 167.384-309.768 490.976-309.768 490.976S217.072 599.96 217.072 432.576" fill="#F7BB83" p-id="5291"></path><path d="M527.216 947.552c-6.536 0-12.8-2.672-17.328-7.392-12.936-13.504-316.816-332.568-316.816-507.584a24 24 0 1 1 48 0c0 121.232 192.504 354.624 286.136 455.92 93.512-101.312 285.776-334.688 285.776-455.92a24 24 0 1 1 48 0c0 175.008-303.512 494.08-316.432 507.568a24 24 0 0 1-17.336 7.408z" fill="#6E4123" p-id="5292"></path><path d="M528.64 432m-196 0a196 196 0 1 0 392 0 196 196 0 1 0-392 0Z" fill="#FFFFFF" p-id="5293"></path><path d="M528.344 642.12c-118.488 0-214.896-93.032-214.896-207.384 0-56.808 23.336-109.808 65.696-149.248a16.008 16.008 0 0 1 21.816 23.424c-35.8 33.32-55.504 78.008-55.504 125.832 0 96.704 82.048 175.384 182.896 175.384 100.848 0 182.896-78.68 182.896-175.384 0-49.736-22.152-97.32-60.792-130.568a16 16 0 1 1 20.872-24.248c45.704 39.328 71.912 95.76 71.912 154.824 0 114.336-96.408 207.368-214.896 207.368z" fill="#6E4123" p-id="5294"></path><path d="M528.344 570.88c-105.344 0-192.096-76.488-203.624-174.88a194.112 194.112 0 0 0-1.336 22.328c0 108.912 91.768 197.208 204.96 197.208s204.968-88.296 204.968-197.208c0-7.552-0.488-15-1.352-22.328-11.528 98.4-98.272 174.88-203.616 174.88z" fill="#6E4123" p-id="5295"></path><path d="M548.64 476c0 13.2-10.8 24-24 24s-24-10.8-24-24v-96c0-13.2 10.8-24 24-24s24 10.8 24 24v96z" fill="#6E4123" p-id="5296"></path><path d="M476.64 452c-13.2 0-24-10.8-24-24s10.8-24 24-24h96c13.2 0 24 10.8 24 24s-10.8 24-24 24h-96z" fill="#6E4123" p-id="5297"></path></svg></div>`; // 可以根据需要自定义标记点内容

  props.markers.forEach((markerData, index) => {
    const marker = new AMap.Marker({
      position: markerData.position,
      content: content,
      offset: new AMap.Pixel(-13, -30),
    });

    marker.on("click", () => emit("markerClick", index));
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
        version: "2.0",
      }).then((loadedAMap) => {
        addMarkers(loadedAMap as AMapNamespace);
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

// 规划路线
const planRoute = (start: [number, number], end: [number, number]): Promise<{ distance: number; time: number }> => {
  return new Promise((resolve, reject) => {
    if (!map) {
      reject(new Error("地图未初始化"));
      return;
    }

    if (!driving) {
      try {
        const AMap = (window as { AMap: AMapNamespace }).AMap;
        driving = new AMap.Driving({
          map: map,
          showTraffic: true,
        });
      } catch (error) {
        console.error("driving 初始化失败:", error);
        reject(new Error("路线规划服务初始化失败"));
        return;
      }
    }

    // 清除之前的路线
    clearRoute();

    driving.search(start, end, (status: string, result: unknown) => {
      if (status === "complete" && result && typeof result === "object") {
        const drivingResult = result as {
          routes: Array<{
            distance: number;
            time: number;
            steps: Array<{ path: [number, number][] }>;
          }>;
        };

        if (drivingResult.routes && drivingResult.routes.length > 0) {
          const route = drivingResult.routes[0];
          const path: [number, number][] = [];

          // 提取路径点
          route.steps.forEach((step) => {
            path.push(...step.path);
          });

          // 绘制路线
          const AMap = (window as unknown as { AMap: AMapNamespace }).AMap;
          currentRoute = new AMap.Polyline({
            path: path,
            strokeColor: "#1890ff",
            strokeWeight: 6,
            strokeOpacity: 0.9,
            lineJoin: "round",
            lineCap: "round",
          });

          map!.add(currentRoute);
          map!.setFitView();

          resolve({
            distance: route.distance,
            time: route.time,
          });
        } else {
          reject(new Error("未找到路线"));
        }
      } else {
        reject(new Error("路线规划失败"));
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

// 获取用户当前位置
const getCurrentPosition = (): Promise<[number, number]> => {
  return new Promise((resolve, reject) => {
    if (!map) {
      reject(new Error("地图未初始化"));
      return;
    }

    const AMap = (window as { AMap: AMapNamespace }).AMap;
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    geolocation.getCurrentPosition((status: string, result: unknown) => {
      if (status === "complete") {
        const geoResult = result as { position: { lng: number; lat: number } };
        resolve([geoResult.position.lng, geoResult.position.lat]);
      } else {
        reject(new Error("获取位置失败"));
      }
    });
  });
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

  // 清除路线
  driving?.clear();
  driving = null;
  currentRoute = null;

  // 解绑地图的点击事件
  if (map && clickHandler) {
    map.off("click", clickHandler);
    clickHandler = null;
  }

  // 销毁地图，并清空地图容器
  if (map) {
    map.destroy();
    map = null;
  }

  // 清除地图容器的 DOM 元素（可选，Vue 会自动清理）
  if (containerRef.value) {
    containerRef.value.innerHTML = "";
  }
});
</script>

<style scoped>
.map-container {
  padding: 0px;
  margin: 0px;
  width: 100%;
  height: 600px;
}
</style>
