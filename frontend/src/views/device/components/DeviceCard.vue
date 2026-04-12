<template>
  <article
    class="group squircle overflow-hidden border border-slate-100 bg-white p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-white/10 dark:bg-slate-800/70 dark:shadow-slate-900/50 dark:backdrop-blur-xl"
  >
    <div class="mb-6 flex items-start justify-between">
      <div class="flex items-center gap-4">
        <!-- Logo placeholder -->
        <div
          class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-inner dark:border-slate-600/50 dark:bg-slate-700/80"
        >
          <span class="text-2xl font-bold text-slate-400 dark:text-blue-400">
            {{ device.name.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">
            {{ device.name }}
          </h3>
          <p
            v-if="isActive"
            class="mt-0.5 w-fit rounded-full bg-green-100 px-2 py-0.5 text-center text-sm font-medium text-green-600 dark:bg-green-700/20 dark:text-emerald-400"
          >
            使用中
          </p>
          <p
            v-else
            class="mt-0.5 w-fit rounded-full bg-red-100 px-2 py-0.5 text-center text-sm font-medium text-red-500 dark:bg-red-700/20 dark:text-red-400"
          >
            已退役
          </p>
          <span class="text-xs text-slate-500 dark:text-slate-400">
            {{ formatPurchaseDate(device.purchase_date) }}
          </span>
        </div>
      </div>
      <div class="text-right">
        <p class="text-xl font-bold text-[#00288e] dark:text-blue-400">
          {{ formatPrice(device.price, device.currency) }}
        </p>
        <p class="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
          {{ device.currency }}
        </p>
      </div>
    </div>

    <!-- Notes Banner -->
    <div
      v-if="device.notes"
      class="mb-6 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50"
    >
      <svg
        class="h-4 w-4 scale-75 text-[#00288e] dark:text-blue-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span class="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
        {{ device.notes }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        :disabled="isPending"
        @click="handleToggleStatus"
        class="rounded-full bg-[#00288e] px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600"
      >
        {{ isPending ? "处理中..." : isActive ? "标记退役" : "恢复使用" }}
      </button>
      <button
        type="button"
        @click="handleDelete"
        class="rounded-full border border-red-200 bg-red-300/50 px-4 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 active:scale-95 dark:border-red-800 dark:bg-red-700/30 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        删除设备
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Device } from "@/services/deviceService";
import dayjs from "dayjs";
import { computed } from "vue";

interface Props {
  device: Device;
  pendingId: number | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  toggleStatus: [device: Device];
  delete: [device: Device];
}>();

const isPending = computed(() => props.pendingId === props.device.id);
const isActive = computed(() => props.device.status === "active");

function formatPrice(price: number, currency: string): string {
  const normalized = currency?.toUpperCase() ?? "CNY";
  if (normalized === "CNY") {
    return `¥${price.toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}

function formatPurchaseDate(dateStr: string): string {
  if (!dateStr) return "";
  return dayjs(dateStr).format("YYYY-MM-DD");
}

function handleToggleStatus() {
  emit("toggleStatus", props.device);
}

function handleDelete() {
  emit("delete", props.device);
}
</script>
