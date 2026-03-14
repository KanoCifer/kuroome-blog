<script setup lang="ts">
import request from "@/request";
import { useAuthStore } from "@/stores/auth";
import { useNotificationStore } from "@/stores/notification";
import type { LoginForm } from "@/types";
import { startAuthentication } from "@simplewebauthn/browser";
import { ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const form = ref<LoginForm>({
  username: "",
  password: "",
  rememberMe: false,
});

const errors = ref<{
  username?: string;
  password?: string;
  passkey?: string;
}>({});

const isSubmitting = ref(false);
const isPasskeySubmitting = ref(false);
const showPassword = ref(false);

// 处理登录表单提交
const handleSubmit = async () => {
  errors.value = {};
  isSubmitting.value = true;

  try {
    await auth.login(form.value.username, form.value.password, form.value.rememberMe);
    const redirect = (route.query.redirect as string) || "/";
    router.push(redirect);
  } catch (err: unknown) {
    // 后端返回的 APIResponse 在 request.ts 已转成 Error.message
    if (err instanceof Error) {
      // 把简单错误显示在 password 字段上（根据项目需要可更细化）
      errors.value.password = err.message;
    }
  } finally {
    isSubmitting.value = false;
  }
};

// Passkey 登录
const handlePasskeyLogin = async () => {
  errors.value = {};
  isPasskeySubmitting.value = true;

  try {
    // 获取认证选项
    const optionsRes = await request.get("/auth/passkey/authentication-options");
    const options = optionsRes.data.data;

    // 调用浏览器 Passkey 认证
    const assertion = await startAuthentication(options);

    // 提交认证结果
    const res = await request.post("/auth/passkey/authenticate", {
      response: assertion,
    });

    // 登录成功，更新用户信息
    const notification = useNotificationStore();
    auth.saveRefreshToken(res.data.data.refresh_token);

    notification.success("Passkey 登录成功！欢迎回来！");
    await auth.fetchUser();
    const redirect = (route.query.redirect as string) || "/";
    router.push(redirect);
  } catch (err: unknown) {
    if (err instanceof Error) {
      errors.value.passkey = err.message;
    }
  } finally {
    isPasskeySubmitting.value = false;
  }
};

// GitHub 登录
const handleGitHubLogin = () => {
  // 直接跳转到后端 GitHub 授权接口，后端会处理后续流程
  window.location.href = "/api/v1/auth/github";
};
</script>

<template>
  <div>
    <!-- 标题卡片 -->
    <div
      class="squircle mx-auto mt-36 h-screen max-w-md bg-blue-50/50 px-12 py-14 shadow-2xl backdrop-blur-sm dark:bg-gray-800/50"
    >
      <p
        class="flex items-end justify-center text-center font-serif text-2xl font-bold text-shadow-md dark:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-8"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33"
          />
        </svg>
        Login
      </p>
      <p class="mb-12 text-center font-serif text-gray-500 italic dark:text-gray-400">
        Welcome back! Please enter your credentials to log in.
      </p>
      <!-- 登录表单 -->
      <form @submit.prevent="handleSubmit">
        <!-- 用户名 -->
        <div class="form-group">
          <input
            v-model="form.username"
            type="text"
            autocomplete="off"
            placeholder="用户名"
            class="form-control my-4 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
          />
          <span v-if="errors.username" class="mt-1 block text-sm text-red-600 dark:text-red-400">{{
            errors.username
          }}</span>
        </div>

        <!-- 密码 -->
        <div class="relative mt-4 transition-transform duration-200 focus-within:scale-[1.01]">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="off"
            placeholder="密码"
            class="form-control mb-6 w-full rounded-xl border border-gray-300 bg-gray-100/50 px-4 py-2 pr-12 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
          />

          <!-- 显示/隐藏密码按钮 -->
          <button
            type="button"
            @click="showPassword = !showPassword"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            class="absolute top-5.5 right-4 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:scale-[1.01] dark:text-gray-300 dark:hover:text-white"
          >
            <!-- eye (显示) -->
            <svg
              v-if="showPassword"
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>

            <!-- eye-off (隐藏) -->
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
              />
            </svg>
          </button>

          <span v-if="errors.password" class="mt-1 block text-sm text-red-600 dark:text-red-400">{{
            errors.password
          }}</span>
        </div>

        <!-- 提交按钮和记住我 -->
        <div class="mt-6 flex items-center justify-between">
          <button
            type="submit"
            class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:ring-offset-gray-800"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? "Logging in..." : "Login" }}
          </button>

          <!-- Remember Me Checkbox -->
          <label class="group relative flex cursor-pointer">
            <input v-model="form.rememberMe" type="checkbox" class="peer sr-only" />
            <div
              class="rounded-xl border-2 border-gray-100 bg-white px-3 py-2 shadow-sm transition-all duration-200 select-none group-active:scale-95 peer-checked:border-blue-500 peer-checked:bg-blue-50/50 peer-checked:shadow-blue-100/50 hover:border-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500/10 dark:peer-checked:shadow-none dark:hover:border-blue-500/50"
            >
              <span
                class="text-sm font-medium text-gray-600 transition-colors peer-checked:text-blue-600 dark:text-gray-300 dark:peer-checked:text-blue-400"
              >
                Remember Me
              </span>
            </div>
          </label>
        </div>

        <!-- Passkey 登录按钮 -->
        <div class="mt-6">
          <button
            type="button"
            @click="handlePasskeyLogin"
            :disabled="isPasskeySubmitting"
            class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-green-500/30 transition-colors hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-800"
          >
            <span v-if="isPasskeySubmitting" class="flex items-center justify-center gap-2">
              <span
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              Logging in with Passkey...
            </span>
            <span v-else>Login with Passkey</span>
          </button>
          <span
            v-if="errors.passkey"
            class="mt-1 block text-center text-sm text-red-600 dark:text-red-400"
          >
            {{ errors.passkey }}
          </span>
        </div>

        <!-- GitHub 登录按钮 -->
        <div class="mt-4">
          <button
            type="button"
            @click="handleGitHubLogin"
            class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 font-bold text-white shadow-lg shadow-gray-500/30 transition-colors hover:bg-gray-900 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:ring-offset-gray-800 dark:hover:bg-gray-600"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
              />
            </svg>
            Login with GitHub
          </button>
        </div>

        <p class="mt-8 text-center font-serif text-gray-400">Kuroome's Blog</p>
        <!-- 注册链接 -->
        <div class="mb-4 text-center text-gray-400 dark:text-gray-300">
          Don't have an account?
          <RouterLink to="/register" class="underline transition duration-100 hover:text-blue-500">
            Register here.
          </RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>
