<template>
  <section class="grid grid-cols-2 gap-4">
    <!-- Total Price (Spans 2 columns on large screens) -->
    <div
      class="squircle col-span-2 flex items-center justify-between border border-slate-100 bg-white p-10 shadow-lg dark:border-white/10 dark:bg-slate-800/70 dark:shadow-xl dark:shadow-slate-900/50 dark:backdrop-blur-xl"
    >
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">设备总价格</p>
        <p class="text-brand-devices dark:text-brand-devices mt-1 text-3xl font-bold tracking-tight">
          ¥{{ totalPrice.toFixed(2) }}
        </p>
      </div>
      <div
        class="text-brand-devices dark:text-brand-devices flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/20"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    </div>

    <!-- Active -->
    <div
      class="squircle flex items-center gap-4 border border-slate-100 bg-white p-8 shadow-lg dark:border-white/10 dark:bg-slate-800/70 dark:shadow-xl dark:shadow-slate-900/50 dark:backdrop-blur-xl"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-emerald-500/20 dark:text-emerald-400"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">使用中</p>
        <p class="mt-1 text-xl font-bold text-slate-900 dark:text-white">
          {{ activeCount }}
        </p>
      </div>
    </div>

    <!-- Total -->
    <div
      class="squircle flex items-center gap-4 border border-slate-100 bg-white p-8 shadow-lg dark:border-white/10 dark:bg-slate-800/70 dark:shadow-xl dark:shadow-slate-900/50 dark:backdrop-blur-xl"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div>
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">设备总数</p>
        <p class="mt-1 text-xl font-bold text-slate-900 dark:text-white">
          {{ totalCount }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Device } from "@/services/deviceService";
import { computed } from "vue";

interface Props {
  devices: Device[];
}

const props = defineProps<Props>();

const activeCount = computed(() => props.devices.filter((d) => d.status === "active").length);
const totalPrice = computed(() => props.devices.reduce((total, device) => total + device.price, 0));
const totalCount = computed(() => props.devices.length);
</script>
