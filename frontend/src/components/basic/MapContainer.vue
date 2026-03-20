<template>
  <div ref="containerRef" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import AMapLoader from "@amap/amap-jsapi-loader";
import request from "@/request";

interface AMapSecurityConfig {
  securityJsCode: string;
}

interface AMapMarker {
  position: [number, number];
  title?: string;
  content?: string;
}

interface Props {
  center?: [number, number];
  zoom?: number;
  viewMode?: "2D" | "3D";
  plugins?: string[];
  markers?: AMapMarker[];
  showToolBar?: boolean;
  showScale?: boolean;
  showGeolocation?: boolean;
}

interface AMapMapInstance {
  addControl: (control: unknown) => void;
  on: (event: "click", handler: (e: unknown) => void) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  destroy: () => void;
}

interface AMapMarkerInstance {
  on: (event: "click", handler: () => void) => void;
  setMap: (mapInstance: AMapMapInstance | null) => void;
}

interface AMapNamespace {
  Map: new (
    container: HTMLDivElement,
    options: {
      viewMode: "2D" | "3D";
      zoom: number;
      center: [number, number];
    },
  ) => AMapMapInstance;
  Marker: new (options: { position: [number, number] }) => AMapMarkerInstance;
  ToolBar: new () => unknown;
  Scale: new () => unknown;
  Geolocation: new () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  center: () => [113.389549, 23.050067],
  zoom: 11,
  viewMode: "2D",
  plugins: () => ["AMap.Scale", "AMap.ToolBar"],
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

const containerRef = ref<HTMLDivElement | null>(null);
let map: AMapMapInstance | null = null;
let markerInstances: AMapMarkerInstance[] = [];

const fetchSecurityKey = async (): Promise<string> => {
  try {
    const response = await request.get("/amap/security-key");
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
        const toolbar = new AMap.ToolBar();
        map.addControl(toolbar);
      }

      if (props.showScale) {
        const scale = new AMap.Scale();
        map.addControl(scale);
      }

      if (props.showGeolocation) {
        const geolocation = new AMap.Geolocation();
        map.addControl(geolocation);
      }

      // 添加标记点
      addMarkers(AMap);

      // 添加点击事件
      map.on("click", (e: unknown) => emit("click", e));

      emit("mapReady", map);
    })
    .catch((e: unknown) => {
      console.error("AMap loading error:", e);
    });
});

// 添加标记点
const addMarkers = (AMap: AMapNamespace) => {
  // 清除旧标记
  markerInstances.forEach((marker) => marker.setMap(null));
  markerInstances = [];

  props.markers.forEach((markerData, index) => {
    const marker = new AMap.Marker({
      position: markerData.position,
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

onUnmounted(() => {
  markerInstances.forEach((marker) => marker.setMap(null));
  markerInstances = [];
  map?.destroy();
  map = null;
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
