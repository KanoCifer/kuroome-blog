<script setup lang="ts">
import { authGateway } from '@/api/authGateway';
import { useNotificationStore } from '@/stores/notification';
import type { RegisterForm } from '@/types';
import axios from 'axios';
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
  <div class="flex min-h-dvh items-center">
    <!-- 标题卡片和注册表单 -->
    <div class="squircle bg-card mx-auto max-w-md px-12 py-14 shadow-2xl">
      <p class="text-center font-serif text-2xl font-bold text-shadow-md">
        Register
      </p>
      <p class="text-muted-foreground mb-12 text-center font-serif italic">
        Create an account to start managing your reading list!
      </p>

      <form @submit.prevent="handleSubmit">
        <!-- 用户名 -->
        <div class="form-group">
          <input
            v-model="form.username"
            type="text"
            autocomplete="off"
            placeholder="Username"
            class="form-control border-border bg-muted text-foreground focus:border-primary focus:ring-primary/30 my-4 w-full rounded-xl px-4 py-2 transition-transform focus:scale-[1.01] focus:ring-2 focus:outline-none"
            required
          />
          <span
            v-if="errors.username"
            class="text-destructive mt-1 block text-sm"
            >{{ errors.username }}</span
          >
        </div>

        <!-- 邮箱 -->
        <div class="form-group">
          <input
            v-model="form.email"
            type="email"
            autocomplete="off"
            placeholder="Email"
            class="form-control border-border bg-muted text-foreground focus:border-primary focus:ring-primary/30 my-4 w-full rounded-xl px-4 py-2 transition-transform focus:scale-[1.01] focus:ring-2 focus:outline-none"
            required
          />
          <span
            v-if="errors.email"
            class="text-destructive mt-1 block text-sm"
            >{{ errors.email }}</span
          >
        </div>

        <!-- 密码 -->
        <div class="form-group">
          <input
            v-model="form.password"
            type="password"
            autocomplete="off"
            placeholder="Password"
            class="form-control border-border bg-muted text-foreground focus:border-primary focus:ring-primary/30 my-4 w-full rounded-xl px-4 py-2 transition-transform focus:scale-[1.01] focus:ring-2 focus:outline-none"
            required
          />
          <span
            v-if="errors.password"
            class="text-destructive mt-1 block text-sm"
            >{{ errors.password }}</span
          >
        </div>

        <!-- 确认密码 -->
        <div class="form-group">
          <input
            v-model="form.confirmPassword"
            type="password"
            autocomplete="off"
            placeholder="Confirm Password"
            class="form-control border-border bg-muted text-foreground focus:border-primary focus:ring-primary/30 my-4 w-full rounded-xl px-4 py-2 transition-transform focus:scale-[1.01] focus:ring-2 focus:outline-none"
            required
          />
          <span
            v-if="errors.confirmPassword"
            class="text-destructive mt-1 block text-sm"
            >{{ errors.confirmPassword }}</span
          >
        </div>

        <!-- 邮箱验证码 -->
        <div class="mt-4 flex items-end gap-2">
          <div class="form-group mb-0 flex w-full items-center gap-2">
            <input
              v-model="form.emailCode"
              type="text"
              autocomplete="off"
              placeholder="Email Code"
              class="form-control border-border bg-muted text-foreground focus:border-primary focus:ring-primary/30 my-4 w-full rounded-xl px-4 py-2 transition-transform focus:scale-[1.01] focus:ring-2 focus:outline-none"
              required
            />
            <span
              v-if="errors.emailCode"
              class="text-destructive mt-1 block text-sm"
              >{{ errors.emailCode }}</span
            >

            <button
              type="button"
              id="send-code"
              class="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 focus:ring-primary/30 disabled:bg-primary/50 h-full items-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-progress"
              :disabled="isSendingCode || isSent"
              @click="sendEmailCode"
            >
              {{ sendCodeText }}
            </button>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="mt-6">
          <button
            type="submit"
            class="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 focus:ring-primary/30 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Registering...' : 'Register' }}
          </button>
        </div>

        <span
          v-if="errors.submit"
          class="text-destructive mt-2 block text-center text-sm"
          >{{ errors.submit }}</span
        >
      </form>

      <p class="text-muted-foreground mt-8 text-center font-serif">
        Kuroome's Blog
      </p>
      <!-- 登录链接 -->
      <div class="text-muted-foreground mb-4 text-center">
        Already have an account?
        <RouterLink
          to="/login"
          class="underline transition duration-100 hover:font-bold"
        >
          Login here.
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* No custom styles needed - using Tailwind utilities directly */
</style>
