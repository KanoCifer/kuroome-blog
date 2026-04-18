<script setup lang="ts">
import { fishingService } from "@/service/fishingService";
import { useNotificationStore } from "@/stores/notification";
import type { FishingIndexData } from "@/views/general/fishing/types";
import { onMounted, ref } from "vue";

interface Props {
  location?: [number, number];
}

const props = withDefaults(defineProps<Props>(), {
  location: () => [113.389549, 23.050067],
});

const emit = defineEmits<{
  (e: "feedback-click", data: FishingIndexData): void;
}>();

const notifier = useNotificationStore();
const loading = ref(false);
const error = ref("");
const indexData = ref<FishingIndexData | null>(null);

const levelColors: Record<string, string> = {
  爆护: "text-red-500",
  极好: "text-orange-500",
  好: "text-yellow-500",
  一般: "text-green-500",
  差: "text-blue-500",
  空军: "text-gray-500",
};

const levelBg: Record<string, string> = {
  爆护: "bg-red-50 dark:bg-red-950/30",
  极好: "bg-orange-50 dark:bg-orange-950/30",
  好: "bg-yellow-50 dark:bg-yellow-950/30",
  一般: "bg-green-50 dark:bg-green-950/30",
  差: "bg-blue-50 dark:bg-blue-950/30",
  空军: "bg-gray-50 dark:bg-gray-800/30",
};

const fetchIndex = async () => {
  loading.value = true;
  error.value = "";

  try {
    indexData.value = await fishingService.fetchFishingIndex({
      location: props.location,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取钓鱼指数失败";
    error.value = message;
    notifier.error(message);
  } finally {
    loading.value = false;
  }
};

const handleFeedback = () => {
  if (indexData.value) {
    emit("feedback-click", indexData.value);
  }
};

onMounted(() => {
  void fetchIndex();
});
</script>

<template>
  <article
    class="squircle relative border border-white/40 p-6 shadow-sm backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl dark:border-gray-700/60"
    :class="indexData ? levelBg[indexData.level] || 'bg-gray-50' : 'bg-gray-50'"
  >
    <div class="absolute top-0 right-0 overflow-hidden rounded-full p-8 blur-2xl">
      <div class="h-24 w-24 rounded-full bg-linear-to-br from-blue-200/60 to-green-200/60" />
    </div>

    <div class="mb-3 flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold tracking-tight text-gray-900 dark:text-white">钓鱼指数</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">基于实时天气、潮汐综合计算</p>
      </div>
      <button
        class="rounded-lg bg-white/60 px-2 py-1 text-xs text-gray-600 hover:bg-white/80 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800/80"
        :disabled="loading"
        @click="fetchIndex"
      >
        {{ loading ? "刷新中..." : "刷新" }}
      </button>
    </div>

    <p v-if="loading && !indexData" class="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
    <p v-else-if="error && !indexData" class="text-sm text-red-500">{{ error }}</p>
    <template v-else-if="indexData">
      <div class="mb-3 flex items-end gap-3">
        <span class="text-5xl font-bold" :class="levelColors[indexData.level] || 'text-gray-500'">
          {{ indexData.fishing_index }}
        </span>
        <span class="mb-1 text-lg font-medium" :class="levelColors[indexData.level] || 'text-gray-500'">
          {{ indexData.level }}
        </span>
      </div>

      <div class="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div class="rounded-lg bg-white/60 px-2 py-2 dark:bg-gray-800/60">
          默认权重
          <div class="mt-1 font-medium text-gray-900 dark:text-white">{{ indexData.expert_score }}</div>
        </div>
        <div class="rounded-lg bg-white/60 px-2 py-2 dark:bg-gray-800/60">
          权重调整
          <div class="mt-1 font-medium text-gray-900 dark:text-white">
            {{ indexData.residual > 0 ? "+" : "" }}{{ indexData.residual }}
          </div>
        </div>
        <div class="rounded-lg bg-white/60 px-2 py-2 dark:bg-gray-800/60">
          综合指数
          <div class="mt-1 font-medium text-gray-900 dark:text-white">{{ indexData.fishing_index }}</div>
        </div>
      </div>

      <details v-if="Object.keys(indexData.feature_breakdown).length > 0" class="mt-2 cursor-pointer text-xs">
        <summary class="text-gray-500 dark:text-gray-400">特征详情</summary>
        <div class="mt-2 grid grid-cols-3 gap-1">
          <div
            v-for="(value, key) in indexData.feature_breakdown"
            :key="key"
            class="rounded bg-white/40 px-1 py-1 dark:bg-gray-800/40"
          >
            <span class="text-gray-500 dark:text-gray-400">{{ key.replace("_", " ") }}:</span>
            <span class="font-medium text-gray-900 dark:text-white"> {{ value }} </span>
          </div>
        </div>
      </details>

      <button
        class="mt-3 w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
        @click="handleFeedback"
      >
        提交钓鱼反馈
      </button>
    </template>
    <p v-else class="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
  </article>
</template>
