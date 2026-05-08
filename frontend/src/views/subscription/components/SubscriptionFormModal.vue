<script setup lang="ts">
import { reactive, watch } from "vue";
import type { SubscriptionFormState } from "@/views/subscription/types";
import {
  cycleOptions,
  statusOptions,
} from "@/views/subscription/subscriptionUtils";

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  submitText: string;
  loadingText: string;
  isSubmitting: boolean;
  form: SubscriptionFormState;
  errorMessage: string;
  currencySuggestions: string[];
  includeStatus?: boolean;
  mode: "create" | "edit";
}

const emit = defineEmits<{
  close: [];
  submit: [form: SubscriptionFormState];
}>();

const props = withDefaults(defineProps<Props>(), {
  includeStatus: false,
});

const localForm = reactive<SubscriptionFormState>({
  name: "",
  provider: "",
  price: "",
  currency: "USD",
  billing_cycle: "monthly",
  next_billing_date: "",
  status: "active",
  notes: "",
});

function syncLocalForm(source: SubscriptionFormState): void {
  localForm.name = source.name;
  localForm.provider = source.provider;
  localForm.price = source.price;
  localForm.currency = source.currency;
  localForm.billing_cycle = source.billing_cycle;
  localForm.next_billing_date = source.next_billing_date;
  localForm.status = source.status;
  localForm.notes = source.notes;
}

function emitSubmit(): void {
  emit("submit", {
    name: localForm.name,
    provider: localForm.provider,
    price: localForm.price,
    currency: localForm.currency,
    billing_cycle: localForm.billing_cycle,
    next_billing_date: localForm.next_billing_date,
    status: localForm.status,
    notes: localForm.notes,
  });
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      syncLocalForm(props.form);
    }
  },
  { immediate: true },
);
</script>

<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <button
          type="button"
          aria-label="关闭弹窗"
          class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          @click="emit('close')"
        />
        <section
          class="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <header class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ title }}
              </h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ description }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              @click="emit('close')"
            >
              关闭
            </button>
          </header>

          <form class="space-y-4" @submit.prevent="emitSubmit">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span
                  class="text-xs font-medium text-slate-600 dark:text-slate-300"
                  >订阅名称</span
                >
                <input
                  v-model="localForm.name"
                  type="text"
                  placeholder="例如：Spotify Premium"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label class="space-y-1">
                <span
                  class="text-xs font-medium text-slate-600 dark:text-slate-300"
                  >服务商</span
                >
                <input
                  v-model="localForm.provider"
                  type="text"
                  placeholder="例如：Spotify"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </div>

            <div class="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
              <label class="space-y-1">
                <span
                  class="text-xs font-medium text-slate-600 dark:text-slate-300"
                  >价格</span
                >
                <input
                  v-model="localForm.price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label class="space-y-1">
                <span
                  class="text-xs font-medium text-slate-600 dark:text-slate-300"
                  >币种</span
                >
                <input
                  v-model="localForm.currency"
                  type="text"
                  :list="`subscription-currency-options-${mode}`"
                  maxlength="10"
                  placeholder="例如：USD / CNY / 元"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <datalist :id="`subscription-currency-options-${mode}`">
                  <option
                    v-for="currency in currencySuggestions"
                    :key="currency"
                    :value="currency"
                  />
                </datalist>
              </label>
              <label class="space-y-1">
                <span
                  class="text-xs font-medium text-slate-600 dark:text-slate-300"
                  >计费周期</span
                >
                <select
                  v-model="localForm.billing_cycle"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option
                    v-for="cycle in cycleOptions"
                    :key="cycle.value"
                    :value="cycle.value"
                  >
                    {{ cycle.label }}
                  </option>
                </select>
              </label>
            </div>

            <div
              class="grid gap-3"
              :class="includeStatus ? 'sm:grid-cols-2' : ''"
            >
              <label class="space-y-1">
                <span
                  class="text-xs font-medium text-slate-600 dark:text-slate-300"
                  >下次扣费日期</span
                >
                <input
                  v-model="localForm.next_billing_date"
                  type="date"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label v-if="includeStatus" class="space-y-1">
                <span
                  class="text-xs font-medium text-slate-600 dark:text-slate-300"
                  >状态</span
                >
                <select
                  v-model="localForm.status"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option
                    v-for="status in statusOptions"
                    :key="status.value"
                    :value="status.value"
                  >
                    {{ status.label }}
                  </option>
                </select>
              </label>
            </div>

            <label class="space-y-1">
              <span
                class="text-xs font-medium text-slate-600 dark:text-slate-300"
                >备注</span
              >
              <textarea
                v-model="localForm.notes"
                rows="3"
                placeholder="可选备注，例如套餐人数、自动续费规则等。"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <p
              v-if="errorMessage"
              class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
            >
              {{ errorMessage }}
            </p>

            <footer class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="emit('close')"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isSubmitting ? loadingText : submitText }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </transition>
  </teleport>
</template>
