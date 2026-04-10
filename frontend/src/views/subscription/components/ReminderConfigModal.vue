<script setup lang="ts">
import { reactive, watch } from "vue";
import type { ReminderFormState } from "@/views/subscription/types";
import { channelOptions, reminderPointOptions } from "@/views/subscription/subscriptionUtils";

interface Props {
  isOpen: boolean;
  form: ReminderFormState;
  isTesting: boolean;
  isSaving: boolean;
  errorMessage: string;
  testResult: Record<string, boolean> | null;
}

const emit = defineEmits<{
  close: [];
  test: [form: ReminderFormState];
  save: [form: ReminderFormState];
}>();

const props = defineProps<Props>();

const localForm = reactive<ReminderFormState>({
  channels: [],
  days_30: false,
  days_7: true,
  days_3: false,
  days_1: true,
  day_of: true,
  email: "",
  feishu_webhook_url: "",
  bark_device_key: "",
});

function syncLocalForm(source: ReminderFormState): void {
  localForm.channels = [...source.channels];
  localForm.days_30 = source.days_30;
  localForm.days_7 = source.days_7;
  localForm.days_3 = source.days_3;
  localForm.days_1 = source.days_1;
  localForm.day_of = source.day_of;
  localForm.email = source.email;
  localForm.feishu_webhook_url = source.feishu_webhook_url;
  localForm.bark_device_key = source.bark_device_key;
}

function emitSave(): void {
  emit("save", {
    channels: [...localForm.channels],
    days_30: localForm.days_30,
    days_7: localForm.days_7,
    days_3: localForm.days_3,
    days_1: localForm.days_1,
    day_of: localForm.day_of,
    email: localForm.email,
    feishu_webhook_url: localForm.feishu_webhook_url,
    bark_device_key: localForm.bark_device_key,
  });
}

function emitTest(): void {
  emit("test", {
    channels: [...localForm.channels],
    days_30: localForm.days_30,
    days_7: localForm.days_7,
    days_3: localForm.days_3,
    days_1: localForm.days_1,
    day_of: localForm.day_of,
    email: localForm.email,
    feishu_webhook_url: localForm.feishu_webhook_url,
    bark_device_key: localForm.bark_device_key,
  });
}

function toggleChannel(channel: string): void {
  const hasChannel = localForm.channels.includes(channel);
  localForm.channels = hasChannel
    ? localForm.channels.filter((item) => item !== channel)
    : [...localForm.channels, channel];
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
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">通知渠道配置</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                选择通知渠道和提醒触发时间点，可先发送测试通知。
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

          <div class="space-y-4">
            <section>
              <p class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                通知渠道
              </p>
              <div class="grid gap-2 sm:grid-cols-3">
                <button
                  v-for="channel in channelOptions"
                  :key="channel.value"
                  type="button"
                  class="rounded-xl border px-3 py-2 text-sm transition"
                  :class="
                    localForm.channels.includes(channel.value)
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-300'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  "
                  @click="toggleChannel(channel.value)"
                >
                  {{ channel.label }}
                </button>
              </div>
            </section>

            <section>
              <p class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                提醒时间点
              </p>
              <div class="grid gap-2 sm:grid-cols-3">
                <label
                  v-for="point in reminderPointOptions"
                  :key="point.key"
                  class="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <input
                    v-model="localForm[point.key]"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 dark:border-slate-500"
                  />
                  {{ point.label }}
                </label>
              </div>
            </section>

            <section class="grid gap-3">
              <label v-if="localForm.channels.includes('email')" class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">邮箱地址（Email）</span>
                <input
                  v-model="localForm.email"
                  type="email"
                  placeholder="name@example.com"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label v-if="localForm.channels.includes('feishu')" class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">飞书 Webhook URL</span>
                <input
                  v-model="localForm.feishu_webhook_url"
                  type="text"
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label v-if="localForm.channels.includes('bark')" class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Bark Device Key</span>
                <input
                  v-model="localForm.bark_device_key"
                  type="text"
                  placeholder="请输入 Bark 设备 Key"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </section>

            <div
              v-if="testResult"
              class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <p class="mb-2 font-medium">测试结果</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="(success, channel) in testResult"
                  :key="channel"
                  class="rounded-full px-2.5 py-1"
                  :class="
                    success
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                  "
                >
                  {{ channel }}: {{ success ? "成功" : "失败" }}
                </span>
              </div>
            </div>

            <p
              v-if="errorMessage"
              class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
            >
              {{ errorMessage }}
            </p>

            <footer class="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="emit('close')"
              >
                取消
              </button>
              <button
                type="button"
                :disabled="isTesting"
                class="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                @click="emitTest"
              >
                {{ isTesting ? "测试中..." : "发送测试通知" }}
              </button>
              <button
                type="button"
                :disabled="isSaving"
                class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                @click="emitSave"
              >
                {{ isSaving ? "保存中..." : "保存配置" }}
              </button>
            </footer>
          </div>
        </section>
      </div>
    </transition>
  </teleport>
</template>
