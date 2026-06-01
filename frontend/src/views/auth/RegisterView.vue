<script setup lang="ts">
import { authGateway } from '@/api/authGateway';
import IconCloud from '@/components/icons/IconCloud.vue';
import IconLock from '@/components/icons/IconLock.vue';
import { useNotificationStore } from '@/stores/notification';
import type { RegisterForm } from '@/types';
import axios from 'axios';
import { Mail, ShieldUser } from 'lucide-vue-next';
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

const router = useRouter();

const notifier = useNotificationStore();
const form = ref<RegisterForm>({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  emailCode: '',
});

const errors = ref<{
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  emailCode?: string;
  submit?: string;
}>({});

const isSubmitting = ref<boolean>(false);
const isSendingCode = ref<boolean>(false);
const sendCodeText = ref<string>('SendCode');
const isSent = ref<boolean>(false);

const sendEmailCode = async () => {
  if (!form.value.email) {
    errors.value.email = 'Please enter your email first';
    return;
  }

  isSendingCode.value = true;
  sendCodeText.value = 'Sending...';

  try {
    await authGateway.sendRegisterEmailCode({
      email: form.value.email,
    });
    sendCodeText.value = 'Sent!';
    notifier.success('验证码已发送到您的邮箱，请注意查收');
    // 倒计时 60 秒
    isSent.value = true;
    let countdown = 60;
    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        sendCodeText.value = 'SendCode';
        isSent.value = false;
      } else {
        sendCodeText.value = `${countdown}s`;
      }
    }, 1000);
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errors.value.email = err.response.data.message;
    }
  } finally {
    isSendingCode.value = false;
  }
};

const handleSubmit = async () => {
  errors.value = {};

  if (form.value.password !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match';
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await authGateway.register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      confirm_password: form.value.confirmPassword,
      email_code: form.value.emailCode || '',
    });

    if (response.data.status === 'success') {
      router.push('/login');
      notifier.success('注册成功！请使用您的账号登录');
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data;
      if (data.username) {
        errors.value.username = data.username[0];
      }
      if (data.email) {
        errors.value.email = data.email[0];
      }
      if (data.password) {
        errors.value.password = data.password[0];
      }
      if (data.confirm_password) {
        errors.value.confirmPassword = data.confirm_password[0];
      }
      if (data.email_code) {
        errors.value.emailCode = data.email_code[0];
      }
      if (data.error) {
        errors.value.submit = data.error;
      }
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="bg-background flex min-h-screen">
    <!-- 左侧 Branding (仅在大屏幕显示) -->
    <div
      class="relative hidden w-1/2 flex-col justify-between bg-zinc-950 p-10 text-white lg:flex"
    >
      <div class="flex items-center gap-2 text-xl font-bold tracking-tight">
        <IconCloud class="text-primary size-8" />
        <span>Kanocifer<span class="text-primary">.chat</span></span>
      </div>
      <div class="z-10 my-auto">
        <div class="flex flex-col">
          <h1 class="text-5xl font-extrabold tracking-tight xl:text-6xl">
            Start your <br />
            reading journey.
          </h1>
          <p class="mt-6 max-w-md text-lg text-zinc-400">
            Create an account to track, organize, and discover the books you
            love.
          </p>
        </div>
      </div>
      <div class="z-10 font-serif text-sm text-zinc-500">Kuroome's Blog</div>
    </div>

    <!-- 右侧 Register Form -->
    <div class="bg-card flex w-full items-center justify-center p-8 lg:w-1/2">
      <div class="w-full max-w-sm xl:max-w-md">
        <!-- 表头 -->
        <div class="mb-8 flex flex-col items-center lg:items-start">
          <div
            class="bg-primary text-primary-foreground mb-5 flex h-16 w-16 items-center justify-center rounded-full shadow-[0_8px_16px_rgba(37,99,235,0.25)] lg:hidden"
          >
            <IconCloud class="size-8" />
          </div>
          <h2
            class="font-headline text-foreground text-center text-3xl text-[28px] font-extrabold tracking-tight lg:text-left"
          >
            Create your account
          </h2>
          <p
            class="text-muted-foreground mt-2 text-center text-[15px] font-medium lg:text-left"
          >
            Fill in the details below to get started.
          </p>
        </div>

        <!-- 注册表单 -->
        <form @submit.prevent="handleSubmit" class="w-full">
          <!-- 用户名 -->
          <div>
            <div class="relative my-3">
              <div
                class="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-0 z-10 flex -translate-y-1/2 items-center pl-4"
              >
                <ShieldUser class="size-6" />
              </div>
              <input
                v-model="form.username"
                type="text"
                autocomplete="off"
                placeholder="username"
                class="form-control border-border bg-muted text-foreground focus:ring-primary/30 w-full rounded-xl py-3 pr-4 pl-11 transition-colors placeholder:font-serif placeholder:italic focus:ring-2 focus:outline-none"
                :class="{
                  'border-destructive focus:border-destructive focus:ring-destructive/30':
                    errors.username,
                }"
                required
              />
            </div>
            <span
              v-if="errors.username"
              class="text-destructive mt-1.5 flex items-center gap-1.5 text-sm"
            >
              <svg
                class="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {{ errors.username }}
            </span>
          </div>

          <!-- 邮箱 -->
          <div>
            <div class="relative my-3">
              <div
                class="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-0 z-10 flex -translate-y-1/2 items-center pl-4"
              >
                <Mail class="size-6" />
              </div>
              <input
                v-model="form.email"
                type="email"
                autocomplete="off"
                placeholder="email"
                class="form-control border-border bg-muted text-foreground focus:ring-primary/30 w-full rounded-xl py-3 pr-4 pl-11 transition-colors placeholder:font-serif placeholder:italic focus:ring-2 focus:outline-none"
                :class="{
                  'border-destructive focus:border-destructive focus:ring-destructive/30':
                    errors.email,
                }"
                required
              />
            </div>
            <span
              v-if="errors.email"
              class="text-destructive mt-1.5 flex items-center gap-1.5 text-sm"
            >
              <svg
                class="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {{ errors.email }}
            </span>
          </div>

          <!-- 密码 -->
          <div>
            <div class="relative my-3">
              <div
                class="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-0 z-10 flex -translate-y-1/2 items-center pl-4"
              >
                <IconLock class="size-6" />
              </div>
              <input
                v-model="form.password"
                type="password"
                autocomplete="off"
                placeholder="password"
                class="form-control border-border bg-muted text-foreground focus:ring-primary/30 w-full rounded-xl py-3 pr-4 pl-11 transition-colors placeholder:font-serif placeholder:italic focus:ring-2 focus:outline-none"
                :class="{
                  'border-destructive focus:border-destructive focus:ring-destructive/30':
                    errors.password,
                }"
                required
              />
            </div>
            <span
              v-if="errors.password"
              class="text-destructive mt-1.5 flex items-center gap-1.5 text-sm"
            >
              <svg
                class="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {{ errors.password }}
            </span>
          </div>

          <!-- 确认密码 -->
          <div>
            <div class="relative my-3">
              <div
                class="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-0 z-10 flex -translate-y-1/2 items-center pl-4"
              >
                <IconLock class="size-6" />
              </div>
              <input
                v-model="form.confirmPassword"
                type="password"
                autocomplete="off"
                placeholder="confirm password"
                class="form-control border-border bg-muted text-foreground focus:ring-primary/30 w-full rounded-xl py-3 pr-4 pl-11 transition-colors placeholder:font-serif placeholder:italic focus:ring-2 focus:outline-none"
                :class="{
                  'border-destructive focus:border-destructive focus:ring-destructive/30':
                    errors.confirmPassword,
                }"
                required
              />
            </div>
            <span
              v-if="errors.confirmPassword"
              class="text-destructive mt-1.5 flex items-center gap-1.5 text-sm"
            >
              <svg
                class="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {{ errors.confirmPassword }}
            </span>
          </div>

          <!-- 邮箱验证码 -->
          <div>
            <div class="relative my-3">
              <div
                class="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-0 z-10 flex -translate-y-1/2 items-center pl-4"
              >
                <Mail class="size-6" />
              </div>
              <input
                v-model="form.emailCode"
                type="text"
                autocomplete="off"
                placeholder="email code"
                class="form-control border-border bg-muted text-foreground focus:ring-primary/30 w-full rounded-xl py-3 pr-24 pl-11 transition-colors placeholder:font-serif placeholder:italic focus:ring-2 focus:outline-none"
                :class="{
                  'border-destructive focus:border-destructive focus:ring-destructive/30':
                    errors.emailCode,
                }"
                required
              />
              <button
                type="button"
                class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/30 disabled:bg-primary/50 absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-lg px-4 py-1.5 text-sm font-bold transition-colors focus:ring-2 focus:outline-none disabled:cursor-progress"
                :disabled="isSendingCode || isSent"
                @click="sendEmailCode"
              >
                {{ sendCodeText }}
              </button>
            </div>
            <span
              v-if="errors.emailCode"
              class="text-destructive mt-1.5 flex items-center gap-1.5 text-sm"
            >
              <svg
                class="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {{ errors.emailCode }}
            </span>
          </div>

          <!-- 提交按钮 -->
          <div class="mt-6">
            <button
              type="submit"
              class="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 focus:ring-primary/30 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? '注册中...' : '注册' }}
            </button>
          </div>

          <span
            v-if="errors.submit"
            class="text-destructive mt-3 flex items-center justify-center gap-1.5 text-center text-sm"
          >
            <svg
              class="size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {{ errors.submit }}
          </span>
        </form>

        <!-- 登录链接 -->
        <div class="text-muted-foreground mt-8 text-center text-sm">
          已有账号？
          <RouterLink
            to="/login"
            class="text-primary font-medium hover:underline"
          >
            立即登录
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* No custom styles needed - using Tailwind utilities directly */
</style>
