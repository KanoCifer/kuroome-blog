<script setup lang="ts">
import type { ReadDetailSnapshot } from '@/api/wereadGateway';
import VChart from 'vue-echarts';

defineProps<{
  snapshot: ReadDetailSnapshot;
  hasTrendData: boolean;
  hasPreferTimeData: boolean;
  hasReadListenData: boolean;
  trendSubtitle: string;
  preferTimeSubtitle: string;
  readListenSubtitle: string;
  trendOption: Record<string, unknown>;
  preferTimeOption: Record<string, unknown>;
  readPercent: number;
  listenPercent: number;
  formatDuration: (seconds: number | null | undefined) => string;
}>();
</script>

<template>
  <section class="mb-14 space-y-10">
    <h2
      class="text-foreground font-serif text-2xl font-semibold tracking-tight sm:text-3xl"
    >
      你的阅读节奏
    </h2>

    <!-- 趋势 -->
    <div v-if="hasTrendData">
      <p class="text-muted-foreground mb-4 text-sm">
        {{ trendSubtitle }}
      </p>
      <div class="h-56 sm:h-64">
        <v-chart :option="trendOption" autoresize />
      </div>
    </div>

    <!-- 时段 -->
    <div v-if="hasPreferTimeData">
      <p class="text-muted-foreground mb-4 text-sm">
        {{ preferTimeSubtitle }}
      </p>
      <div class="h-44 sm:h-48">
        <v-chart :option="preferTimeOption" autoresize />
      </div>
    </div>

    <!-- 文字 vs 听书 -->
    <div v-if="hasReadListenData">
      <p class="text-muted-foreground mb-4 text-sm">
        {{ readListenSubtitle }}
      </p>
      <div class="bg-muted flex h-2 overflow-hidden rounded-full">
        <div
          class="bg-primary h-full transition-all duration-700"
          :style="{ width: `${readPercent}%` }"
        />
        <div
          class="bg-success h-full transition-all duration-700"
          :style="{ width: `${listenPercent}%` }"
        />
      </div>
      <div
        class="text-muted-foreground mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs sm:text-sm"
      >
        <span class="flex items-center gap-2">
          <span class="bg-primary inline-block h-2 w-2 rounded-full" />
          文字阅读
          <span class="text-foreground tabular-nums">
            {{ formatDuration(snapshot.wrReadTime) }} · {{ readPercent }}%
          </span>
        </span>
        <span class="flex items-center gap-2">
          <span class="bg-success inline-block h-2 w-2 rounded-full" />
          听书
          <span class="text-foreground tabular-nums">
            {{ formatDuration(snapshot.wrListenTime) }} · {{ listenPercent }}%
          </span>
        </span>
      </div>
    </div>
  </section>
</template>
