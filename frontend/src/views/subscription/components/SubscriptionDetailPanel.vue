<script setup lang="ts">
import type { Subscription } from "@/api/subscriptionGateway";

interface Props {
  selectedSubscription: Subscription | null;
  pendingStatusId: number | null;
  deletePendingId: number | null;
  toDateInputValue: (value: string) => string;
  getCycleLabel: (cycle: string) => string;
  formatPrice: (price: number, currency: string) => string;
  formatDate: (value: string) => string;
  getStatusMeta: (status: string) => { label: string; dotClass: string; badgeClass: string };
  getReminderChannelsText: (config: Record<string, unknown> | null) => string;
  getReminderPointsText: (config: Record<string, unknown> | null) => string;
}

defineProps<Props>();

const emit = defineEmits<{
  edit: [subscription: Subscription];
  reminder: [subscription: Subscription];
  toggleStatus: [subscription: Subscription];
  delete: [subscription: Subscription];
}>();
</script>

<template>
  <aside class="xl:sticky xl:top-24 xl:h-fit">
    <section
      class="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/85"
    >
      <h3 class="text-sm font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">详情面板</h3>

      <div v-if="selectedSubscription" class="mt-4 space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="text-xl font-semibold text-slate-900 dark:text-white">{{ selectedSubscription.name }}</h4>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ selectedSubscription.provider }}</p>
          </div>
          <span
            class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
            :class="getStatusMeta(selectedSubscription.status).badgeClass"
          >
            <span class="mr-1 h-1.5 w-1.5 rounded-full" :class="getStatusMeta(selectedSubscription.status).dotClass" />
            {{ getStatusMeta(selectedSubscription.status).label }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/80">
            <p class="text-xs text-slate-500 dark:text-slate-400">价格</p>
            <p class="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {{ formatPrice(selectedSubscription.price, selectedSubscription.currency) }}
            </p>
          </div>
          <div class="rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/80">
            <p class="text-xs text-slate-500 dark:text-slate-400">周期</p>
            <p class="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {{ getCycleLabel(selectedSubscription.billing_cycle) }}
            </p>
          </div>
          <div class="rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/80">
            <p class="text-xs text-slate-500 dark:text-slate-400">下次扣费</p>
            <p class="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {{ toDateInputValue(selectedSubscription.next_billing_date) }}
            </p>
          </div>
          <div class="rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/80">
            <p class="text-xs text-slate-500 dark:text-slate-400">更新时间</p>
            <p class="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {{ formatDate(selectedSubscription.updated_at) }}
            </p>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
          <p class="text-xs text-slate-500 dark:text-slate-400">提醒配置</p>
          <p class="mt-1 text-sm text-slate-700 dark:text-slate-300">
            渠道：{{ getReminderChannelsText(selectedSubscription.reminder_config) }}
          </p>
          <p class="mt-1 text-sm text-slate-700 dark:text-slate-300">
            节点：{{ getReminderPointsText(selectedSubscription.reminder_config) }}
          </p>
        </div>

        <div
          class="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
        >
          {{ selectedSubscription.notes?.trim() || "暂无备注" }}
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            @click="emit('edit', selectedSubscription)"
          >
            编辑订阅
          </button>
          <button
            type="button"
            class="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            @click="emit('reminder', selectedSubscription)"
          >
            通知配置
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            :disabled="pendingStatusId === selectedSubscription.id"
            @click="emit('toggleStatus', selectedSubscription)"
          >
            {{ selectedSubscription.status === "active" ? "暂停订阅" : "恢复订阅" }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
            :disabled="deletePendingId === selectedSubscription.id"
            @click="emit('delete', selectedSubscription)"
          >
            删除订阅
          </button>
        </div>
      </div>

      <div
        v-else
        class="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400"
      >
        从左侧列表中选择一条订阅以查看详情。
      </div>
    </section>
  </aside>
</template>
