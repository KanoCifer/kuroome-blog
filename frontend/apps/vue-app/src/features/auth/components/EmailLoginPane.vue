<script setup lang="ts">
/**
 * EmailLoginPane — 邮箱魔法登录 tab（接 handoff §1 `POST /v3/email/magic-login`）
 *
 * 三个状态：
 *  - request  : 单字段 email + 发送链接 CTA
 *  - sent     : 展示脱敏邮箱 + 倒计时 + Resend + "Use a different email"
 *  - error    : 通过 props.errors.email 透传
 */
import { Button, FieldError } from '@/components';
import { Check, Loader2, Mail } from '@lucide/vue';
import { ref } from 'vue';

const props = defineProps<{
  emailError: string | null;
  isRequesting: boolean;
  sentTo: string | null;
}>();

const emit = defineEmits<{
  (e: 'submit', email: string): void;
  (e: 'resend', email: string): void;
  (e: 'reset'): void;
}>();

const email = ref<string>('');

const onSubmit = () => emit('submit', email.value.trim());
const onResend = () => emit('resend', email.value.trim());
const onReset = () => {
  email.value = '';
  emit('reset');
};

// 10 分钟 TTL 倒计时 — 仅 UI 信号；真实限流在服务端
const remaining = ref<number>(600);
let timer: number | null = null;

const fmtTime = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

const startCountdown = () => {
  stopCountdown();
  remaining.value = 600;
  timer = window.setInterval(() => {
    if (remaining.value <= 0) {
      stopCountdown();
      return;
    }
    remaining.value -= 1;
  }, 1000);
};

const stopCountdown = () => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
};

// 进入 "sent" 态时启动倒计时
const watching = (val: string | null) => {
  if (val) startCountdown();
  else stopCountdown();
};
// 用 watchEffect 替代以避免引入 watch 类型依赖
import { watchEffect } from 'vue';
watchEffect(() => watching(props.sentTo));

// Resend 节流：点击后 60s 内不能再次触发
const resendLocked = ref<boolean>(false);
const onLockedResend = async () => {
  if (resendLocked.value) return;
  resendLocked.value = true;
  onResend();
  window.setTimeout(() => {
    resendLocked.value = false;
  }, 60_000);
};
</script>

<template>
  <!-- ─── Request 状态 ─── -->
  <form
    v-if="!sentTo"
    @submit.prevent="onSubmit"
    class="flex w-full flex-col"
    novalidate
  >
    <div class="relative my-4">
      <div
        class="text-muted/60 pointer-events-none absolute top-1/2 left-0 z-10 flex -translate-y-1/2 items-center pl-4"
      >
        <Mail class="size-6" />
      </div>
      <input
        v-model="email"
        type="email"
        name="email"
        autocomplete="email"
        inputmode="email"
        spellcheck="false"
        placeholder="you@example.com"
        :aria-invalid="emailError ? 'true' : 'false'"
        :aria-describedby="emailError ? 'email-error' : undefined"
        class="form-control bg-surface text-ink focus:ring-accent/30 w-full rounded-xl py-3 pr-4 pl-11 transition-colors placeholder:font-serif placeholder:italic focus:ring-2 focus:outline-none"
        :class="{
          'border-destructive focus:border-destructive focus:ring-destructive/30':
            emailError,
        }"
      />
    </div>
    <FieldError id="email-error" :message="emailError" />

    <div class="mt-2 flex items-start gap-2 text-xs text-zinc-500">
      <span class="mt-0.5 shrink-0">ⓘ</span>
      <span>
        无需密码。我们不会发送任何可读内容；链接 10 分钟内有效且只能点一次。
      </span>
    </div>

    <Button
      type="submit"
      variant="default"
      :disabled="isRequesting"
      class="!bg-accent !text-contrast shadow-accent/30 hover:!bg-accent/90 focus:!ring-accent/30 mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Loader2 v-if="isRequesting" class="h-5 w-5 animate-spin" />
      <Mail v-else class="h-5 w-5" />
      <span>{{ isRequesting ? '正在发送…' : '发送登录链接' }}</span>
    </Button>
  </form>

  <!-- ─── Sent 状态 ─── -->
  <div v-else class="flex flex-col items-center text-center">
    <div
      class="bg-accent/15 text-accent mb-5 flex h-16 w-16 items-center justify-center rounded-full"
      aria-hidden="true"
    >
      <Mail class="size-7" />
    </div>
    <h3 class="font-headline text-ink text-2xl font-extrabold tracking-tight">
      请检查你的收件箱
    </h3>
    <div class="mt-3 inline-block rounded-md border border-border bg-card px-3 py-1.5">
      <code class="font-mono text-sm text-ink">{{ sentTo }}</code>
    </div>
    <p class="text-muted mt-4 max-w-sm text-sm leading-relaxed">
      我们已发送一次性登录链接，10
      分钟内有效。点击邮件里的按钮即可回到这里登录。
    </p>

    <div class="text-muted mt-5 flex items-center gap-1.5 text-sm">
      <span>没收到？</span>
      <button
        type="button"
        :disabled="resendLocked || isRequesting"
        class="text-accent hover:bg-accent/10 rounded-md px-2 py-0.5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        @click="onLockedResend"
      >
        <Check v-if="!resendLocked && !isRequesting" class="mr-0.5 inline size-3.5" />
        {{ resendLocked ? `已重发` : '重新发送' }}
      </button>
    </div>

    <div class="text-muted mt-2 inline-flex items-center gap-1.5 text-xs">
      <span
        class="bg-success inline-block size-2 rounded-full"
        :class="{ 'animate-pulse': remaining > 0 }"
        aria-hidden="true"
      />
      <span>剩余 {{ fmtTime(remaining) }}</span>
    </div>

    <button
      type="button"
      class="text-muted hover:text-ink mt-6 text-sm underline transition-colors"
      @click="onReset"
    >
      使用其他邮箱
    </button>
  </div>
</template>