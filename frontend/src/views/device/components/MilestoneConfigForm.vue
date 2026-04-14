<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" @click="handleClose" />
    </Transition>

    <!-- Modal -->
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-x-4 inset-y-24 z-50 flex items-center justify-center sm:inset-x-auto sm:inset-y-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
      >
        <div
          class="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-slate-100 shadow-2xl dark:bg-[#1a2133] dark:shadow-xl dark:shadow-slate-900/60"
        >
          <!-- Header -->
          <div
            class="sticky top-0 z-10 border-b border-gray-200 bg-slate-100 px-6 pt-6 pb-4 dark:border-white/10 dark:bg-[#1a2133]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 shadow-lg shadow-blue-500/30 dark:shadow-blue-900/50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-5 w-5 text-white"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                    />
                  </svg>
                </div>
                <div>
                  <h2 class="font-serif text-2xl font-bold text-slate-800 dark:text-slate-100">里程碑提醒</h2>
                  <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{{ device.name }}</p>
                </div>
              </div>
              <span
                class="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              >
                提醒配置
              </span>
            </div>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-6 bg-slate-50 p-6 dark:bg-[#111827]">
            <!-- Enable Toggle -->
            <div
              class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-[#0f172a]"
            >
              <div class="flex items-center gap-3">
                <div
                  v-if="form.enabled"
                  class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 shadow-md"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-4 w-4 text-white"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                  </svg>
                </div>
                <div v-else class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-4 w-4 text-slate-500"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">启用里程碑提醒</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500">在设备到达里程碑天数时发送通知</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="form.enabled"
                @click="form.enabled = !form.enabled"
                :class="[
                  'relative flex h-6 w-11 shrink-0 rounded-full transition-colors duration-300',
                  form.enabled ? 'bg-blue-700' : 'bg-slate-300 dark:bg-slate-600',
                ]"
              >
                <span
                  :class="[
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300',
                    form.enabled ? 'translate-x-5.5' : 'translate-x-0.5',
                  ]"
                />
              </button>
            </div>

            <!-- Milestones -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div
                  class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700"
                />
                <span
                  class="shrink-0 text-xs font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500"
                  >里程碑节点</span
                >
                <div
                  class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700"
                />
              </div>

              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="preset in milestonePresets"
                  :key="preset.days"
                  type="button"
                  @click="toggleMilestone(preset.days)"
                  :class="[
                    'relative flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-xs font-semibold transition-all duration-200',
                    form.milestones.includes(preset.days)
                      ? 'bg-blue-700 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-900/40'
                      : 'bg-white text-slate-500 shadow-sm hover:bg-slate-50 dark:border dark:dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-white/5',
                  ]"
                >
                  <span class="text-base">{{ formatMilestone(preset.days) }}</span>
                  <span
                    :class="[
                      'text-[10px] font-medium',
                      form.milestones.includes(preset.days) ? 'text-blue-100' : 'text-slate-400 dark:text-slate-600',
                    ]"
                    >Day {{ preset.days }}</span
                  >
                  <span
                    v-if="form.milestones.includes(preset.days)"
                    class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="3"
                      stroke="currentColor"
                      class="h-2 w-2 text-blue-700"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </button>
              </div>

              <!-- Custom milestone -->
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <input
                    v-model.number="customMilestone"
                    type="number"
                    min="1"
                    placeholder="自定义天数..."
                    class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-12 pl-4 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                  />
                  <span class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-slate-400"
                    >天</span
                  >
                </div>
                <button
                  type="button"
                  @click="addCustomMilestone"
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 active:scale-95 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:border-blue-500/30 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-[18px] w-[18px]"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>

              <!-- Selected milestones tags -->
              <div
                v-if="form.milestones.length > 0"
                class="flex min-w-0 flex-wrap gap-1.5 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-3 dark:border-blue-500/30 dark:bg-blue-900/20"
              >
                <span
                  v-for="d in form.milestones"
                  :key="d"
                  class="inline-flex items-center gap-1 rounded-full bg-blue-100 py-0.5 pr-1.5 pl-2.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                >
                  {{ formatMilestone(d) }}
                  <button
                    type="button"
                    @click="toggleMilestone(d)"
                    class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="3"
                      stroke="currentColor"
                      class="h-2 w-2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
            </div>

            <!-- Channels -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div
                  class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700"
                />
                <span
                  class="shrink-0 text-xs font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500"
                  >通知渠道</span
                >
                <button
                  type="button"
                  :disabled="testLoading"
                  @click="handleTestNotification"
                  class="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                >
                  <svg
                    v-if="testLoading"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-3 w-3 animate-spin"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="h-3 w-3"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
                    />
                  </svg>
                  测试通知
                </button>
                <div
                  class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700"
                />
              </div>

              <div class="flex gap-2">
                <button
                  v-for="opt in channelOptions"
                  :key="opt.value"
                  type="button"
                  @click="toggleChannel(opt.value)"
                  :class="[
                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200',
                    form.channels.includes(opt.value)
                      ? 'bg-blue-700 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-900/40'
                      : 'bg-white text-slate-500 shadow-sm hover:bg-slate-50 dark:border dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-white/5',
                  ]"
                >
                  <span v-html="opt.icon" />
                  {{ opt.label }}
                </button>
              </div>

              <!-- Channel-specific fields -->
              <label v-if="form.channels.includes('email')" class="block space-y-1">
                <span class="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">邮件地址</span>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="example@domain.com"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                />
              </label>

              <label v-if="form.channels.includes('feishu')" class="block space-y-1">
                <span class="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">飞书 Webhook URL</span>
                <input
                  v-model="form.feishu_webhook_url"
                  type="url"
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                />
              </label>

              <label v-if="form.channels.includes('bark')" class="block space-y-1">
                <span class="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Bark Device Key</span>
                <input
                  v-model="form.bark_device_key"
                  type="text"
                  placeholder="设备Key或完整推送URL"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 ring-2 ring-transparent transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/30 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                />
              </label>
            </div>

            <!-- Error -->
            <p v-if="formError" class="py-2 text-center text-xs font-medium text-red-500 dark:text-red-400">
              {{ formError }}
            </p>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex w-full items-center justify-center gap-2 rounded-full bg-blue-700 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              <svg
                v-if="isSubmitting"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-[18px] w-[18px] animate-spin"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span v-if="isSubmitting">保存中...</span>
              <template v-else>
                <span>保存配置</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="h-[18px] w-[18px]"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </template>
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Device } from "@/services/deviceService";
import { deviceGateway } from "@/api/deviceGateway";
import { deviceService } from "@/services/deviceService";
import { useNotificationStore } from "@/stores/notification";
import { reactive, ref, watch, onMounted } from "vue";
import dayjs from "dayjs";

type Channel = "email" | "feishu" | "bark";

interface MilestoneFormState {
  enabled: boolean;
  milestones: number[];
  channels: Channel[];
  email: string;
  feishu_webhook_url: string;
  bark_device_key: string;
}

interface GlobalConfig {
  email?: string;
  feishu_webhook_url?: string;
  bark_device_key?: string;
}

const milestonePresets = [
  { label: "100天", days: 100 },
  { label: "1年", days: 365 },
  { label: "2年", days: 730 },
];

const channelOptions = [
  {
    value: "email" as Channel,
    label: "邮件",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-[14px] w-[14px]"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>`,
  },
  {
    value: "feishu" as Channel,
    label: "飞书",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-[14px] w-[14px]"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>`,
  },
  {
    value: "bark" as Channel,
    label: "Bark",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-[14px] w-[14px]"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>`,
  },
];

interface Props {
  modelValue: boolean;
  device: Device;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "success", device: Device): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const notificationStore = useNotificationStore();

function createInitialState(device: Device, globalConfig?: GlobalConfig | null): MilestoneFormState {
  const cfg = device.reminder_config as Record<string, unknown> | undefined;
  return {
    enabled: (cfg?.enabled as boolean) ?? true,
    milestones: Array.isArray(cfg?.milestones) ? (cfg.milestones as number[]) : [100, 365, 730],
    channels: Array.isArray(cfg?.channels) ? (cfg.channels as Channel[]) : ["email"],
    email: (cfg?.email as string) || globalConfig?.email || "",
    feishu_webhook_url: (cfg?.feishu_webhook_url as string) || globalConfig?.feishu_webhook_url || "",
    bark_device_key: (cfg?.bark_device_key as string) || globalConfig?.bark_device_key || "",
  };
}

function formatMilestone(days: number): string {
  if (days < 365) return `${days}天`;
  const years = Math.floor(days / 365);
  const remaining = days % 365;
  if (remaining === 0) return `${years}年`;
  if (remaining === 182) return `${years}年零半年`;
  return `${years}年${remaining}天`;
}

const form = reactive<MilestoneFormState>(createInitialState(props.device, null));
const formError = ref<string | null>(null);
const isSubmitting = ref(false);
const testLoading = ref(false);
const customMilestone = ref<number | "">("");

async function fetchGlobalConfig() {
  try {
    const res = await deviceGateway.getUserGlobalConfig();
    const cfg = res.config as GlobalConfig;
    form.email = form.email || cfg?.email || "";
    form.feishu_webhook_url = form.feishu_webhook_url || cfg?.feishu_webhook_url || "";
    form.bark_device_key = form.bark_device_key || cfg?.bark_device_key || "";
  } catch {
    notificationStore.error("获取全局配置失败");
  }
}

onMounted(() => {
  void fetchGlobalConfig();
});

function toggleMilestone(days: number) {
  if (form.milestones.includes(days)) {
    form.milestones = form.milestones.filter((d) => d !== days);
  } else {
    form.milestones = [...form.milestones, days].sort((a, b) => a - b);
  }
}

function addCustomMilestone() {
  const val = customMilestone.value;
  if (!val || val <= 0) return;
  if (form.milestones.includes(val)) {
    customMilestone.value = "";
    return;
  }
  form.milestones = [...form.milestones, val].sort((a, b) => a - b);
  customMilestone.value = "";
}

function toggleChannel(ch: Channel) {
  if (form.channels.includes(ch)) {
    form.channels = form.channels.filter((c) => c !== ch);
  } else {
    form.channels = [...form.channels, ch];
  }
}

async function handleTestNotification() {
  if (testLoading.value) return;
  testLoading.value = true;
  try {
    await deviceService.testNotification(props.device.id);
    notificationStore.success("测试通知已发送，请检查您的通知渠道");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "测试通知发送失败，请检查配置";
    notificationStore.error(msg);
  } finally {
    testLoading.value = false;
  }
}

async function handleSubmit() {
  formError.value = null;

  if (form.channels.length === 0 && form.enabled) {
    formError.value = "请至少选择一个通知渠道";
    return;
  }
  if (form.milestones.length === 0 && form.enabled) {
    formError.value = "请至少选择一个里程碑";
    return;
  }
  if (form.channels.includes("email") && !form.email.trim()) {
    formError.value = "请填写邮件地址";
    return;
  }
  if (form.channels.includes("feishu") && !form.feishu_webhook_url.trim()) {
    formError.value = "请填写飞书 Webhook 地址";
    return;
  }
  if (form.channels.includes("bark") && !form.bark_device_key.trim()) {
    formError.value = "请填写 Bark Device Key";
    return;
  }

  isSubmitting.value = true;

  const payload = {
    enabled: form.enabled,
    milestones: form.milestones,
    channels: form.channels,
    ...(form.email && { email: form.email.trim() }),
    ...(form.feishu_webhook_url && { feishu_webhook_url: form.feishu_webhook_url.trim() }),
    ...(form.bark_device_key && { bark_device_key: form.bark_device_key.trim() }),
  };

  try {
    const updated = await deviceService.updateDeviceReminderConfig(props.device.id, payload);
    notificationStore.success("里程碑配置已保存");
    emit("success", updated);
    handleClose();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "保存失败，请稍后重试";
    formError.value = msg;
    notificationStore.error(msg);
  } finally {
    isSubmitting.value = false;
  }
}

function handleClose() {
  emit("update:modelValue", false);
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      // Reset form when opening
      Object.assign(form, createInitialState(props.device, null));
      formError.value = null;
      void fetchGlobalConfig();
    }
  },
);
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
