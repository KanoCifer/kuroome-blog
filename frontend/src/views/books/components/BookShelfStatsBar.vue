<template>
  <button
    v-if="weeklySnapshot"
    type="button"
    class="group block w-full border-t border-white/15 bg-black/30 px-4 py-2.5 text-left backdrop-blur-md transition-colors hover:bg-black/40 sm:px-6 md:px-10 md:py-3"
    @click="router.push('/bookshelf/stats')"
  >
    <div class="mx-auto flex max-w-6xl items-center gap-3 sm:gap-5">
      <!-- 本周阅读时长 -->
      <span class="inline-flex items-baseline gap-1.5 text-white">
        <span class="text-xs font-medium text-white/60">本周</span>
        <span class="font-serif text-sm font-bold tabular-nums sm:text-base">
          {{ formatDuration(weeklySnapshot.totalReadTime) }}
        </span>
      </span>

      <Dot />

      <!-- 阅读天数 -->
      <span class="inline-flex items-baseline gap-1.5 text-white">
        <span class="text-xs font-medium text-white/60">阅读</span>
        <span class="font-serif text-sm font-bold tabular-nums sm:text-base">
          {{ weeklySnapshot.readDays ?? 0 }}
        </span>
        <span class="text-xs text-white/60">天</span>
      </span>

      <!-- 最近在读(sm 以上才显示,移动端太挤) -->
      <template v-if="latestBook">
        <Dot class="hidden sm:inline-block" />
        <span
          class="hidden min-w-0 flex-1 items-baseline gap-1.5 text-white sm:inline-flex"
        >
          <span class="flex-shrink-0 text-xs font-medium text-white/60">
            最近
          </span>
          <span
            class="truncate text-sm font-medium"
            :title="latestBook.title ?? ''"
          >
            「{{ latestBook.title }}」
          </span>
          <span v-if="recencyLabel" class="flex-shrink-0 text-xs text-white/60">
            {{ recencyLabel }}
          </span>
        </span>
      </template>

      <!-- 占位让 CTA 靠右(没有 latestBook 时) -->
      <span v-else class="flex-1" />

      <!-- CTA -->
      <span
        class="inline-flex flex-shrink-0 items-center gap-1 text-xs font-medium text-white/70 transition-colors group-hover:text-white"
      >
        <span class="hidden sm:inline">看详情</span>
        <ChevronRight class="h-3.5 w-3.5" />
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';
import dayjs from 'dayjs';
import { computed, h } from 'vue';
import { useRouter } from 'vue-router';
import { useReadStatsStore } from '@/stores/readStats';

const router = useRouter();
const statsStore = useReadStatsStore();

const weeklySnapshot = computed(() => statsStore.weeklySnapshot);

const latestBook = computed(() => {
  const s = statsStore.weeklySnapshot;
  if (!s?.readLongest?.length) return null;
  return s.readLongest[0];
});

const recencyLabel = computed(() => {
  // readLongest 里的项目目前没有 readUpdateTime 字段(它来自周快照),
  // 暂用 weeklySnapshot 的 fetched_at 作为相对时间提示,后期接入更精确字段时替换。
  const ts = statsStore.weeklySnapshot?.fetched_at;
  if (!ts) return '';
  const d = dayjs(ts);
  if (!d.isValid()) return '';
  const diffH = dayjs().diff(d, 'hour');
  if (diffH < 1) return '刚刚';
  if (diffH < 24) return `${diffH} 小时前`;
  const diffD = dayjs().diff(d, 'day');
  if (diffD === 1) return '昨天';
  if (diffD < 7) return `${diffD} 天前`;
  return d.format('M/D');
});

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// 内联小点分隔符
const Dot = () =>
  h('span', {
    'aria-hidden': 'true',
    class: 'h-1 w-1 flex-shrink-0 rounded-full bg-white/30',
  });
</script>
