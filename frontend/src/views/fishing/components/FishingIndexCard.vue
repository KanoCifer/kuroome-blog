<script setup lang="ts">
import { useFishingMapStore } from "@/stores/fishingMap";
import type { FishingIndexData } from "@/views/fishing/types";
import { FishingRod, Loader } from "lucide-vue-next";
import { motion } from "motion-v";
import { storeToRefs } from "pinia";

interface Props {
  location?: [number, number];
}

const props = withDefaults(defineProps<Props>(), {
  location: () => [113.389549, 23.050067],
});

const emit = defineEmits<{
  (e: "feedback-click", data: FishingIndexData): void;
}>();

const fishingMapStore = useFishingMapStore();
const {
  indexData,
  indexLoading: loading,
  indexError: error,
} = storeToRefs(fishingMapStore);
// console.log("钓鱼指数数据：", indexData.value);
const levelColors: Record<string, string> = {
  爆护: "text-success",
  好: "text-primary",
  一般: "text-warning",
  差: "text-destructive",
  空军: "text-muted-foreground",
};

const levelBg: Record<string, string> = {
  爆护: "bg-success/10",
  好: "bg-primary/10",
  一般: "bg-warning/10",
  差: "bg-destructive/10",
  空军: "bg-muted",
};

const getGaugeColor = (percentage: number): string => {
  if (percentage >= 85) return "#22c55e";
  if (percentage >= 70) return "#06b6d4";
  if (percentage >= 50) return "#f97316";
  if (percentage <= 30) return "#ef4444";
  return "#3b82f6"; // blue-500
};

const getGaugeStyle = (value: number) => {
  if (!value) return {};
  const percentage = Math.round(value * 100);
  return {
    width: `${percentage}%`,
    background: `linear-gradient(90deg, ${getGaugeColor(percentage)}cc, ${getGaugeColor(percentage)})`,
  };
};

const formatFeatureName = (name: string): string => {
  const mapping: Record<string, string> = {
    w1_temp: "气温",
    w2_humidity: "湿度",
    w3_pressure: "气压",
    w4_wind: "风速",
    w5_rain: "降水",
    w6_tide_rising: "涨潮",
    w7_hours_to_tide: "距潮",
    w8_tide_range: "潮差",
    w9_indices: "指数",
  };
  return mapping[name] || name;
};

const fetchIndex = async () => {
  console.log("刷新钓鱼指数，位置：", props.location);
  await fishingMapStore.fetchWeatherAndFishing(props.location);
};

const handleFeedback = () => {
  if (indexData.value) {
    emit("feedback-click", indexData.value);
  }
};
</script>

<template>
  <article
    class="group squircle border-border/20 relative flex h-full cursor-pointer flex-col overflow-hidden border p-6 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-xl"
    :class="indexData ? levelBg[indexData.level] || 'bg-muted' : 'bg-muted'"
  >
    <div
      class="pointer-events-none absolute top-0 right-0 overflow-hidden rounded-full p-8 blur-3xl"
    >
      <div
        class="h-24 w-24 rounded-full bg-linear-to-br from-blue-200/60 to-green-200/60"
      />
    </div>

    <!-- 钓鱼指数标题和说明 -->
    <div class="mb-3 flex items-center justify-between">
      <div>
        <h3 class="text-foreground text-lg font-bold tracking-tight">
          钓鱼指数
        </h3>
        <p class="text-muted-foreground text-sm">基于实时天气、潮汐综合计算</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="bg-card/60 text-muted-foreground hover:bg-card/80 flex h-fit cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm disabled:cursor-not-allowed"
          :disabled="loading"
          @click="fetchIndex"
        >
          <Loader v-if="loading" class="h-3 w-3 animate-spin" />
          {{ loading ? "刷新中..." : "刷新" }}
        </button>
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-blue-500 shadow-lg shadow-sky-500/25 transition-transform duration-300 group-hover:scale-110"
        >
          <FishingRod class="text-primary-foreground" />
        </div>
      </div>
    </div>

    <p v-if="loading && !indexData" class="text-muted-foreground text-sm">
      加载中...
    </p>
    <p v-else-if="error && !indexData" class="text-destructive text-sm">
      {{ error }}
    </p>
    <template v-else-if="indexData">
      <div class="mb-3 flex items-end gap-3">
        <span
          class="text-5xl font-bold"
          :class="levelColors[indexData.level] || 'text-muted-foreground'"
        >
          {{ indexData.fishing_index }}
        </span>
        <span
          class="mb-1 text-lg font-medium"
          :class="levelColors[indexData.level] || 'text-muted-foreground'"
        >
          {{ indexData.level }}
        </span>
      </div>

      <div class="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div
          class="bg-card/60 rounded-lg px-2 py-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          默认权重
          <div class="text-foreground mt-1 font-medium">
            {{ indexData.expert_score }}
          </div>
        </div>
        <div
          class="bg-card/60 rounded-lg px-2 py-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          权重调整
          <div class="text-foreground mt-1 font-medium">
            {{ indexData.residual > 0 ? "+" : "" }}{{ indexData.residual }}
          </div>
        </div>
        <div
          class="bg-card/60 rounded-lg px-2 py-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          综合指数
          <div class="text-foreground mt-1 font-medium">
            {{ indexData.fishing_index }}
          </div>
        </div>
      </div>

      <details
        v-if="Object.keys(indexData.feature_breakdown).length > 0"
        open
        class="mt-4 cursor-pointer text-xs"
      >
        <summary class="text-muted-foreground">特征详情</summary>
        <div class="mt-2 grid grid-cols-3 gap-2">
          <motion.div
            v-for="(value, keyName) in indexData.feature_breakdown"
            :key="keyName"
            class="border-border/60 bg-card/60 rounded-xl border p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div class="text-foreground text-xs">
              {{ formatFeatureName(keyName) }}
            </div>

            <div
              class="bg-muted relative mt-1 h-1.5 w-full overflow-hidden rounded-full"
            >
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                :style="getGaugeStyle(value)"
              />
            </div>
          </motion.div>
        </div>
      </details>

      <button
        class="bg-primary text-primary-foreground hover:bg-primary/90 mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium"
        @click="handleFeedback"
      >
        提交钓鱼反馈
      </button>
    </template>
    <p v-else class="text-muted-foreground text-sm">暂无数据</p>
  </article>
</template>
