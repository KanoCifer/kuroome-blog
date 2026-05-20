<script setup lang="ts">
import IconCloud from "@/components/icons/IconCloud.vue";
import IconKey from "@/components/icons/IconKey.vue";
import IconLock from "@/components/icons/IconLock.vue";
import { useAuthStore } from "@/stores/auth";
import type { LoginForm } from "@/types";
import { startAuthentication } from "@simplewebauthn/browser";
import { ShieldUser } from "lucide-vue-next";
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

  if (!form.value.username) {
    errors.value.username = "用户名不能为空";
  }
  if (!form.value.password) {
    errors.value.password = "密码不能为空";
  }
  if (errors.value.username || errors.value.password) {
    isSubmitting.value = false;
    return;
  }

  try {
    await auth.login(form.value.username, form.value.password, form.value.rememberMe);
    const redirect = (route.query.redirect as string) || "/";
    router.push(redirect);
  } catch (err: unknown) {
    // 后端返回的 APIResponse 在 request.ts 已转成 Error.message
    if (err instanceof Error) {
      // 把简单错误显示在 password 字段上（根据项目需要可更细化）
      errors.value.password = "用户名或密码错误";
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
    const options = await auth.getPasskeyAuthenticationOptions();

    // 调用浏览器 Passkey 认证
    const assertion = await startAuthentication({
      optionsJSON: options,
    });
    await auth.loginWithPasskey(assertion);
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
  auth.loginWithGitHub();
};
</script>

<template>
  <div>
    <div class="flex h-screen items-center">
      <!-- 标题卡片 -->
      <div class="squircle bg-card mx-auto w-auto max-w-md px-12 py-14 shadow-2xl">
        <!-- Hero Section -->
        <div class="mb-8 flex flex-col items-center justify-center">
          <div
            class="bg-primary text-primary-foreground mb-5 flex h-16 w-16 items-center justify-center rounded-full shadow-[0_8px_16px_rgba(37,99,235,0.25)]"
          >
            <IconCloud class="size-8" />
          </div>
          <h2 class="font-headline text-foreground text-center text-[28px] font-extrabold tracking-tight">
            Kanocifer<span class="text-primary">.chat</span>
          </h2>
          <p class="text-muted-foreground mt-1 text-center text-[15px] font-medium">
            Welcome back to the reading space.
          </p>
        </div>
        <!-- 登录表单 -->
        <form @submit.prevent="handleSubmit">
          <!-- 用户名 -->
          <div class="relative transition-transform duration-200 focus-within:scale-[1.01]">
            <div class="text-muted-foreground/60 pointer-events-none absolute top-6 left-0 flex items-center pl-4">
              <ShieldUser class="size-6 focus-within:scale-101" />
            </div>
            <input
              v-model="form.username"
              type="text"
              autocomplete="off"
              placeholder="用户名"
              class="form-control border-border bg-muted text-foreground focus:border-primary focus:ring-primary/30 my-4 w-full rounded-xl py-2 pr-4 pl-11 transition-transform focus:scale-[1.01] focus:ring-2 focus:outline-none"
            />
            <span v-if="errors.username" class="text-destructive mt-1 block text-sm">{{ errors.username }}</span>
          </div>

          <!-- 密码 -->
          <div class="relative mt-4 transition-transform duration-200 focus-within:scale-[1.01]">
            <div class="text-muted-foreground/60 pointer-events-none absolute top-2.5 left-0 flex items-center pl-4">
              <IconLock class="size-6" />
            </div>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="off"
              placeholder="密码"
              class="form-control border-border bg-muted text-foreground focus:border-primary focus:ring-primary/30 mb-6 w-full rounded-xl py-2 pr-12 pl-11 transition-transform focus:scale-[1.01] focus:ring-2 focus:outline-none"
            />

            <!-- 显示/隐藏密码按钮 -->
            <button
              type="button"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              class="text-muted-foreground hover:text-foreground absolute top-5.5 right-4 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-md focus:scale-[1.01]"
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

            <span v-if="errors.password" class="text-destructive mt-1 block text-sm">{{ errors.password }}</span>
          </div>

          <!-- 提交按钮和记住我 -->
          <div class="mt-6 flex items-center justify-between">
            <button
              type="submit"
              class="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 focus:ring-primary/30 inline-flex w-28 cursor-pointer items-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
              :disabled="isSubmitting"
            >
              <!-- SVG 加载动画 -->
              <svg v-if="isSubmitting" class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{ isSubmitting ? null : "Login" }}
            </button>

            <!-- Remember Me Checkbox -->
            <label class="group relative flex cursor-pointer">
              <input v-model="form.rememberMe" type="checkbox" class="peer sr-only" />
              <div
                class="border-border bg-card peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:shadow-primary/10 hover:border-primary/30 rounded-xl border-2 px-3 py-2 shadow-sm transition-all duration-200 select-none group-active:scale-95"
              >
                <span class="text-muted-foreground peer-checked:text-primary text-sm font-medium transition-colors">
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
              class="bg-success text-primary-foreground shadow-success/30 hover:bg-success/90 focus:ring-success/30 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconKey />
              <!-- SVG 加载动画 -->
              <svg v-if="isPasskeySubmitting" class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span v-if="isPasskeySubmitting">Logging in with Passkey...</span>
              <span v-else>Login with Passkey</span>
            </button>
            <span v-if="errors.passkey" class="text-destructive mt-1 block text-center text-sm">
              {{ errors.passkey }}
            </span>
          </div>

          <!-- GitHub 登录按钮 -->
          <div class="mt-4">
            <button
              type="button"
              @click="handleGitHubLogin"
              class="text-primary-foreground shadow-primary/30 hover:bg-accent focus:ring-primary inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-8 py-2.5 font-bold shadow-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
              Login with GitHub
            </button>
          </div>

          <p class="text-muted-foreground mt-8 text-center font-serif">Kuroome's Blog</p>
          <!-- 注册链接 -->
          <div class="text-muted-foreground mb-4 text-center">
            Don't have an account?
            <RouterLink to="/register" class="hover:text-primary underline transition duration-100">
              Register here.
            </RouterLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
