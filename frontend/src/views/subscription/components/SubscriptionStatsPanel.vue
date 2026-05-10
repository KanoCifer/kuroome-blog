<script setup lang="ts">
interface Props {
  totalCount: number;
  activeCount: number;
  monthlyEstimate: number;
  dueSoonCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  refresh: [];
  add: [];
}>();
</script>

<template>
  <section
    class="rounded-[28px] border border-slate-200/80 bg-white/92 p-7 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/85"
  >
    <div class="flex flex-wrap items-start justify-between gap-5">
      <div class="max-w-3xl">
        <p class="mb-2 text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
          Subscription
        </p>
        <h2 class="font-serif text-3xl font-semibold text-slate-900 dark:text-white">桌面订阅看板</h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          参考移动端订阅卡片设计，重构为更适合桌面端的双栏结构，支持高密度信息查看与快速操作。
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          :disabled="isLoading || isRefreshing"
          class="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          @click="emit('refresh')"
        >
          {{ isRefreshing ? "刷新中..." : "刷新列表" }}
        </button>
        <button
          type="button"
          class="from-brand-devices hover:from-brand-devices inline-flex items-center rounded-xl bg-linear-to-r to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:to-blue-400"
          @click="emit('add')"
        >
          新增订阅
        </button>
        <RouterLink
          to="/device-tracker"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3m-3 9h3"
            />
          </svg>
          设备管理
        </RouterLink>
      </div>
    </div>

    <div class="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article
        class="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/70"
      >
        <p class="text-xs text-slate-500 dark:text-slate-400">总订阅数</p>
        <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {{ totalCount }}
        </p>
      </article>
      <article
        class="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-900/20"
      >
        <p class="text-xs text-emerald-700 dark:text-emerald-300">活跃订阅</p>
        <p class="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
          {{ activeCount }}
        </p>
      </article>
      <article
        class="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4 dark:border-indigo-500/30 dark:bg-indigo-900/20"
      >
        <p class="text-xs text-indigo-700 dark:text-indigo-300">月度估算</p>
        <p class="mt-2 text-2xl font-semibold text-indigo-700 dark:text-indigo-300">
          ¥{{ monthlyEstimate.toFixed(2) }}
        </p>
      </article>
      <article
        class="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-900/20"
      >
        <p class="text-xs text-amber-700 dark:text-amber-300">7 天内到期</p>
        <p class="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300">
          {{ dueSoonCount }}
        </p>
      </article>
    </div>
  </section>
</template>
