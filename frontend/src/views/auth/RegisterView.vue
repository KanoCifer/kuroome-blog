<script setup lang="ts">
import request from "@/request";
import { useNotificationStore } from "@/stores/notification";
import type { RegisterForm } from "@/types";
import axios from "axios";
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
const router = useRouter();

const notifier = useNotificationStore();
const form = ref<RegisterForm>({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  emailCode: "",
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
const sendCodeText = ref<string>("SendCode");
const isSent = ref<boolean>(false);

const sendEmailCode = async () => {
  if (!form.value.email) {
    errors.value.email = "Please enter your email first";
    return;
  }

  isSendingCode.value = true;
  sendCodeText.value = "Sending...";

  try {
    await request.post("/auth/email/code", {
      email: form.value.email,
    });
    sendCodeText.value = "Sent!";
    notifier.success("验证码已发送到您的邮箱，请注意查收");
    // 倒计时 60 秒
    isSent.value = true;
    let countdown = 60;
    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        sendCodeText.value = "SendCode";
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
    errors.value.confirmPassword = "Passwords do not match";
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await request.post("/auth/register", {
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      confirm_password: form.value.confirmPassword,
      email_code: form.value.emailCode,
    });

    if (response.data.status === "success") {
      router.push("/login");
      notifier.success("注册成功！请使用您的账号登录");
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
    <div
      class="squircle mx-auto max-w-md bg-blue-50/50 px-12 py-14 shadow-2xl dark:bg-gray-800/50"
    >
      <p
        class="text-center font-serif text-2xl font-bold text-shadow-md dark:text-white"
      >
        Register
      </p>
      <p
        class="mb-12 text-center font-serif text-gray-500 italic dark:text-gray-400"
      >
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
            class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
            required
          />
          <span
            v-if="errors.username"
            class="mt-1 block text-sm text-red-600 dark:text-red-400"
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
            class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
            required
          />
          <span
            v-if="errors.email"
            class="mt-1 block text-sm text-red-600 dark:text-red-400"
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
            class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
            required
          />
          <span
            v-if="errors.password"
            class="mt-1 block text-sm text-red-600 dark:text-red-400"
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
            class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
            required
          />
          <span
            v-if="errors.confirmPassword"
            class="mt-1 block text-sm text-red-600 dark:text-red-400"
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
              class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
              required
            />
            <span
              v-if="errors.emailCode"
              class="mt-1 block text-sm text-red-600 dark:text-red-400"
              >{{ errors.emailCode }}</span
            >

            <button
              type="button"
              id="send-code"
              class="h-full items-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-progress disabled:bg-blue-950 dark:ring-offset-gray-800"
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
            class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-800"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? "Registering..." : "Register" }}
          </button>
        </div>

        <span
          v-if="errors.submit"
          class="mt-2 block text-center text-sm text-red-600 dark:text-red-400"
          >{{ errors.submit }}</span
        >
      </form>

      <p class="mt-8 text-center font-serif text-gray-400">Kuroome's Blog</p>
      <!-- 登录链接 -->
      <div class="mb-4 text-center text-gray-400 dark:text-gray-300">
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
