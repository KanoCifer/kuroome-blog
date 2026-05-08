<script setup lang="ts">
import type { Subscription } from "@/api/subscriptionGateway";

interface Props {
  subscriptions: Subscription[];
  selectedSubId: number | null;
  isLoading: boolean;
  errorMessage: string;
  pendingStatusId: number | null;
  deletePendingId: number | null;
  toDateInputValue: (value: string) => string;
  getDaysUntil: (value: string) => number;
  getCycleLabel: (cycle: string) => string;
  formatPrice: (price: number, currency: string) => string;
  getStatusMeta: (status: string) => {
    label: string;
    dotClass: string;
    badgeClass: string;
  };
  getReminderChannelsText: (config: Record<string, unknown> | null) => string;
  getReminderPointsText: (config: Record<string, unknown> | null) => string;
}

defineProps<Props>();

const emit = defineEmits<{
  select: [subId: number];
  retry: [];
  edit: [subscription: Subscription];
  reminder: [subscription: Subscription];
  toggleStatus: [subscription: Subscription];
  delete: [subscription: Subscription];
}>();
</script>

<template>
  <section
    class="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/85"
  >
    <header class="mb-4 flex items-center justify-between gap-3">
      <h3
        class="text-sm font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300"
      >
        订阅列表
      </h3>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ subscriptions.length }} 项
      </p>
    </header>

    <div
      v-if="errorMessage"
      class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
    >
      <div class="flex items-center justify-between gap-4">
        <span>{{ errorMessage }}</span>
        <button
          type="button"
          class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
          @click="emit('retry')"
        >
          重试
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="space-y-4">
      <div
        v-for="idx in 3"
        :key="idx"
        class="animate-pulse rounded-2xl border border-slate-200/70 bg-slate-100/80 p-6 dark:border-slate-700/70 dark:bg-slate-800/80"
      >
        <div
          class="mb-4 h-5 w-36 rounded-full bg-slate-200 dark:bg-slate-700"
        />
        <div class="h-10 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>

    <div
      v-else-if="subscriptions.length === 0"
      class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300"
    >
      还没有订阅记录，点击「新增订阅」开始管理。
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="subscription in subscriptions"
        :key="subscription.id"
        class="cursor-pointer rounded-2xl border bg-white p-5 shadow-[0_12px_40px_rgb(0,0,0,0.04)] transition hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)] dark:bg-slate-800/70 dark:backdrop-blur-xl"
        :class="
          selectedSubId === subscription.id
            ? 'border-indigo-300 ring-2 ring-indigo-400/20 dark:border-indigo-500/60 dark:ring-indigo-500/20'
            : 'border-slate-100 dark:border-white/10'
        "
        @click="emit('select', subscription.id)"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex min-w-0 items-center gap-4">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-lg font-bold text-slate-500 dark:border-slate-600/50 dark:bg-slate-700/80 dark:text-blue-400"
            >
              {{ subscription.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <h4
                class="truncate text-lg font-bold text-slate-900 dark:text-white"
              >
                {{ subscription.name }}
              </h4>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {{ subscription.provider }} ·
                {{ getCycleLabel(subscription.billing_cycle) }}
              </p>
            </div>
          </div>

          <div class="text-right">
            <p class="text-xl font-bold text-[#00288e] dark:text-blue-400">
              {{ formatPrice(subscription.price, subscription.currency) }}
            </p>
            <p
              class="text-[10px] tracking-wider text-slate-400 uppercase dark:text-slate-500"
            >
              {{ subscription.currency }}
            </p>
          </div>
        </div>

        <div
          class="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50"
        >
          <span class="text-sm text-slate-500 dark:text-slate-400"
            >下次扣费:</span
          >
          <span class="text-sm font-bold text-slate-900 dark:text-slate-200">
            {{ toDateInputValue(subscription.next_billing_date) }}
          </span>
          <span class="text-xs text-slate-400 dark:text-slate-500">
            ({{ getDaysUntil(subscription.next_billing_date) }} 天后)
          </span>
          <span
            class="ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
            :class="getStatusMeta(subscription.status).badgeClass"
          >
            <span
              class="mr-1 h-1.5 w-1.5 rounded-full"
              :class="getStatusMeta(subscription.status).dotClass"
            />
            {{ getStatusMeta(subscription.status).label }}
          </span>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div
            class="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
          >
            <p class="text-slate-500 dark:text-slate-400">提醒渠道</p>
            <p class="mt-1 font-medium text-slate-700 dark:text-slate-200">
              {{ getReminderChannelsText(subscription.reminder_config) }}
            </p>
          </div>
          <div
            class="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
          >
            <p class="text-slate-500 dark:text-slate-400">提醒节点</p>
            <p class="mt-1 font-medium text-slate-700 dark:text-slate-200">
              {{ getReminderPointsText(subscription.reminder_config) }}
            </p>
          </div>
        </div>

        <p
          class="mt-3 line-clamp-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
        >
          {{ subscription.notes?.trim() || "暂无备注" }}
        </p>

        <div class="mt-4 grid grid-cols-4 gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            @click.stop="emit('edit', subscription)"
          >
            编辑
          </button>
          <button
            type="button"
            class="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            @click.stop="emit('reminder', subscription)"
          >
            通知
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            :disabled="pendingStatusId === subscription.id"
            @click.stop="emit('toggleStatus', subscription)"
          >
            {{ subscription.status === "active" ? "暂停" : "恢复" }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
            :disabled="deletePendingId === subscription.id"
            @click.stop="emit('delete', subscription)"
          >
            删除
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
