<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="onClose"
      >
        <div
          class="fixed top-1/2 left-1/2 z-50 h-[60vh] w-[90vw] max-w-md min-w-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900"
          @click.stop
        >
          <v-chart :option="chartOption" autoresize class="h-full w-full" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Device } from "@/services/deviceService";
import { PieChart } from "echarts/charts";
import {
  GridComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { computed, onMounted, onUnmounted, ref } from "vue";
import VChart from "vue-echarts";

use([TitleComponent, TooltipComponent, GridComponent, PieChart, SVGRenderer]);

const props = defineProps<{
  data: Device[];
  isOpen: boolean;
  onClose: () => void;
}>();

const isDark = ref(document.documentElement.classList.contains("dark"));

onMounted(() => {
  const observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains("dark");
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  onUnmounted(() => observer.disconnect());
});

const chartOption = computed(() => {
  const isDarkMode = document.documentElement.classList.contains("dark");
  return {
    title: {
      text: "Device Price Distribution",
      left: 0,
      top: 15,
      textStyle: {
        fontSize: 18,
        fontWeight: "bold",
        color: isDarkMode ? "#ccc" : "rgb(50, 50, 50)",
      },
    },
    tooltip: {
      trigger: "item",
    },
    legend: {
      top: "bottom",
    },
    toolbox: {
      show: true,
      feature: {
        mark: { show: true },
        dataView: { show: true, readOnly: true },
        restore: { show: true },
        saveAsImage: { show: true },
      },
    },
    itemStyle: {
      borderRadius: 8,
    },
    series: [
      {
        color: [
          "#ee6666",
          "#73c0de",
          "#3ba272",
          "#fc8452",
          "#9a60b4",
          "#ea7ccc",
        ],
        type: "pie",
        data: props.data.map((device) => ({
          name: device.name,
          value: device.price,
        })),
        roseType: "area",
        colorBy: "data",
        legendHoverLink: true,
      },
    ],
  };
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
