<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="onClose"
      >
        <div
          class="bg-card fixed top-1/2 left-1/2 z-60 h-[60vh] w-[90vw] max-w-md min-w-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-4"
          @click.stop
        >
          <button
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90 absolute top-4 right-4 z-50 rounded-full px-1.5 py-1.5"
            @click="onClose"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <v-chart :option="chartOption" autoresize class="h-full w-full" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Device } from "@/services/deviceService";
import dayjs from "dayjs";
import { computed, onMounted, onUnmounted, ref } from "vue";
import VChart from "vue-echarts";

const props = defineProps<{
  data: Device;
  isOpen: boolean;
  onClose: () => void;
}>();

// Detect dark mode
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
  const purchaseDate = dayjs(props.data.purchase_date);
  const now = dayjs();

  const usedDays = now.diff(purchaseDate, "day");
  const currentDailyCost =
    usedDays > 0 ? props.data.price / usedDays : props.data.price;

  const predictDays = 180;
  const currentTimeIndex = usedDays;

  const xAxisData: string[] = [];
  const seriesData: number[] = [];
  for (let i = 0; i <= usedDays + predictDays; i++) {
    const date = purchaseDate.add(i, "day");
    xAxisData.push(date.format("YYYY-MM-DD"));
    const dailyCost = i > 0 ? props.data.price / i : props.data.price;
    seriesData.push(dailyCost);
  }

  const textColor = isDark.value ? "#e5e7eb" : "#1f2937";
  const subtextColor = isDark.value ? "#9ca3af" : "#6b7280";
  const axisColor = isDark.value ? "#4b5563" : "#d1d5db";
  const splitLineColor = isDark.value ? "#374151" : "#f3f4f6";

  return {
    backgroundColor: "transparent",
    title: {
      text: `Daily Cost Trend: ${props.data.name}`,
      subtext: `Current: ¥${currentDailyCost.toFixed(2)}/day | Total: ¥${props.data.price}`,
      left: 0,
      top: 8,
      textStyle: { fontSize: 16, fontWeight: "bold", color: textColor },
      subtextStyle: { fontSize: 12, color: subtextColor },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: isDark.value ? "#1f2937" : "#fff",
      textStyle: { color: textColor },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `${p.name}<br/>Daily Cost: <b>¥${p.value.toFixed(2)}</b>`;
      },
    },
    grid: {
      top: "22%",
      containLabel: false,
    },
    xAxis: {
      type: "category",
      data: xAxisData,
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: {
        color: textColor,
        fontSize: 10,
        interval: 30,
        rotate: 45,
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: "log",
      name: "¥/day",
      max: Math.ceil(props.data.price * 1.1),
      nameTextStyle: { color: textColor, fontSize: 11 },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: splitLineColor } },
      axisLabel: { color: textColor },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: seriesData,
        lineStyle: { color: "#3b82f6", width: 2 },
        itemStyle: { color: "#3b82f6" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59,130,246,0.35)" },
              { offset: 1, color: "rgba(59,130,246,0.02)" },
            ],
          },
        },
        markLine:
          currentTimeIndex > 0
            ? {
                symbol: ["none", "none"],
                lineStyle: {
                  color: "#f59e0b",
                  type: "dashed",
                  width: 1.5,
                },
                label: {
                  show: true,
                  formatter: "现在",
                  color: "#f59e0b",
                  fontWeight: "600",
                  fontSize: 12,
                },
                data: [{ xAxis: currentTimeIndex }],
              }
            : undefined,
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
