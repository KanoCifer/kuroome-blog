<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" @click="handleClose" />
    </Transition>

    <!-- Form Container -->
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-x-8 inset-y-24 z-50 flex items-center justify-center">
        <div
          class="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-slate-100 shadow-2xl dark:bg-[#1a2133] dark:shadow-xl dark:shadow-slate-900/60"
        >
          <!-- Header -->
          <div
            class="sticky top-0 z-10 border-b border-gray-200 bg-slate-100 px-6 pt-6 pb-4 dark:border-white/10 dark:bg-[#1a2133]"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100">添加设备</h2>
                <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">记录你的电子设备资产</p>
              </div>
              <span
                class="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              >
                新建设备
              </span>
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="space-y-5 bg-slate-50 p-6 dark:bg-[#111827]">
            <!-- Name -->
            <label class="block space-y-1.5">
              <span class="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400"> 设备名称 * </span>
              <input
                v-model="form.name"
                type="text"
                placeholder="例如：iPhone 15 Pro Max"
                maxlength="100"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
              />
            </label>

            <!-- Purchase Date -->
            <label class="block space-y-1.5">
              <span class="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400"> 购买日期 * </span>
              <input
                v-model="form.purchase_date"
                type="date"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
              />
            </label>

            <!-- Currency & Price -->
            <div class="grid grid-cols-[0.4fr_0.6fr] gap-4">
              <label class="block space-y-1.5">
                <span class="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400"> 货币 </span>
                <select
                  v-model="form.currency"
                  class="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                >
                  <option v-for="c in currencyOptions" :key="c" :value="c">
                    {{ c }}
                  </option>
                </select>
              </label>

              <label class="block space-y-1.5">
                <span class="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400"> 价格 </span>
                <input
                  v-model.number="form.price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                />
              </label>
            </div>

            <!-- Notes -->
            <label class="block space-y-1.5">
              <span class="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400"> 备注（可选） </span>
              <input
                v-model="form.notes"
                type="text"
                placeholder="例如：256GB 银色、国行版本"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
              />
            </label>

            <!-- Status Toggle -->
            <div class="space-y-2">
              <span class="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400"> 设备状态 </span>
              <div
                class="flex rounded-full bg-slate-200/80 p-1 backdrop-blur-sm dark:border dark:border-white/10 dark:bg-[#0f172a]"
              >
                <button
                  v-for="option in statusOptions"
                  :key="option.value"
                  type="button"
                  @click="form.status = option.value"
                  :class="[
                    'flex-1 rounded-full px-3 py-2.5 text-xs font-semibold transition-all duration-200',
                    form.status === option.value
                      ? 'bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10',
                  ]"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- Error -->
            <p v-if="formError" class="py-2 text-center text-xs font-medium text-red-500 dark:text-red-400">
              {{ formError }}
            </p>
            <p v-else class="text-center text-[10px] text-slate-400 dark:text-slate-500">* 为必填项</p>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex w-full items-center justify-center gap-2 rounded-full bg-blue-700 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              <span v-if="isSubmitting">添加中...</span>
              <span v-else>添加设备</span>
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { deviceService } from "@/services/deviceService";
import { useNotificationStore } from "@/stores/notification";
import type { DeviceInput } from "@/services/deviceService";
import { reactive, ref, watch } from "vue";
import dayjs from "dayjs";

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "success", device: DeviceInput): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const currencyOptions = ["CNY", "USD", "EUR", "JPY", "HKD", "GBP"];
const statusOptions: Array<{ value: "active" | "retired"; label: string }> = [
  { value: "active", label: "使用中" },
  { value: "retired", label: "已退役" },
];

const form = reactive({
  name: "",
  purchase_date: "",
  price: 0,
  currency: "CNY",
  notes: "",
  status: "active" as "active" | "retired",
});

const formError = ref<string | null>(null);
const isSubmitting = ref(false);

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      resetForm();
    }
  },
);

function resetForm() {
  const today = dayjs();
  form.name = "";
  form.purchase_date = today.format("YYYY-MM-DD");
  form.price = 0;
  form.currency = "CNY";
  form.notes = "";
  form.status = "active";
  formError.value = null;
  isSubmitting.value = false;
}

function handleClose() {
  emit("update:modelValue", false);
}

async function handleSubmit() {
  formError.value = null;

  const name = form.name.trim();
  if (!name) {
    formError.value = "请填写设备名称";
    return;
  }

  if (name.length > 100) {
    formError.value = "设备名称不能超过 100 个字符";
    return;
  }

  if (!form.purchase_date) {
    formError.value = "请选择购买日期";
    return;
  }

  if (!Number.isFinite(form.price) || form.price < 0) {
    formError.value = "请输入有效的价格";
    return;
  }

  isSubmitting.value = true;

  const payload: DeviceInput = {
    name,
    purchase_date: form.purchase_date,
    price: form.price,
    currency: form.currency,
    notes: form.notes.trim() || undefined,
    status: form.status,
    reminder_config: {},
  };

  try {
    await deviceService.createDevice(payload);
    useNotificationStore().success("设备添加成功");
    emit("success", payload);
    handleClose();
  } catch (err) {
    const message = err instanceof Error ? err.message : "添加失败，请稍后重试";
    formError.value = message;
    useNotificationStore().error(message);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
