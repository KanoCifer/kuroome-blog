<script setup lang="ts">
import { IconUser } from "@/components/icons";
import IconCloud from "@/components/icons/IconCloud.vue";
import IconKey from "@/components/icons/IconKey.vue";
import IconLock from "@/components/icons/IconLock.vue";
import { useAuthStore } from "@/stores/auth";
import type { LoginForm } from "@/types";
import { startAuthentication } from "@simplewebauthn/browser";
import { onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import EyeOff from "../../components/icons/EyeOff.vue";
import EyeOn from "../../components/icons/EyeOn.vue";
import IconGithub from "../../components/icons/IconGithub.vue";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const loginForm = ref<LoginForm>({
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

const isReady = ref(false);
onMounted(() => {
  // Trigger entry animations
  setTimeout(() => {
    isReady.value = true;
  }, 50);
});

// 处理登录表单提交
const handleSubmit = async () => {
  errors.value = {};
  isSubmitting.value = true;

  try {
    await auth.login(loginForm.value.username, loginForm.value.password, loginForm.value.rememberMe);
    const redirect = (route.query.redirect as string) || "/";
    router.push(redirect);
  } catch (err: unknown) {
    if (err instanceof Error) {
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
    const options = await auth.getPasskeyAuthenticationOptions();

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
const handleGitHubLogin: () => void = () => {
  window.location.href = "/api/v1/auth/github";
};
</script>

<template>
  <div class="font-body relative min-h-screen overflow-hidden">
    <!-- Main Content -->
    <main class="relative z-10 mt-4 flex flex-col items-center px-5 pt-8 pb-10">
      <!-- Hero Section -->
      <div
        class="mb-8 flex flex-col items-center justify-center transition-all duration-700 ease-out"
        :class="isReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'"
      >
        <div
          class="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-[0_8px_16px_rgba(37,99,235,0.25)]"
        >
          <IconCloud class="size-8" />
        </div>
        <h2 class="font-headline text-center text-[28px] font-extrabold tracking-tight text-[#111827] dark:text-white">
          Kanocifer<span class="text-[#2563eb] dark:text-blue-400">.chat</span>
        </h2>
        <p class="mt-1 text-center text-[15px] font-medium text-[#4b5563] dark:text-gray-400">
          Welcome back to the reading space.
        </p>
      </div>

      <!-- Login Card -->
      <div
        class="w-full max-w-100 rounded-[32px] border border-white/50 bg-white/70 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all delay-100 duration-700 ease-out dark:border-slate-700/50 dark:bg-slate-800/60"
        :class="isReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'"
      >
        <form class="flex flex-col" @submit.prevent="handleSubmit">
          <!-- Username Field -->
          <div class="mb-5">
            <label class="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">Username</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
                <IconUser class="size-6 text-white" />
              </div>
              <input
                v-model="loginForm.username"
                type="text"
                autocomplete="off"
                placeholder="Enter your username"
                class="w-full rounded-2xl border-0 bg-white py-3.5 pr-4 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <span v-if="errors.username" class="mt-1 block pl-1 text-[12px] font-medium text-red-500">
              {{ errors.username }}
            </span>
          </div>

          <!-- Password Field -->
          <div class="mb-5">
            <label class="mb-2 block pl-1 text-[13px] font-bold text-[#4b5563] dark:text-gray-300">Password</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#9ca3af]">
                <IconLock class="dark:text-white" />
              </div>
              <input
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="off"
                placeholder="••••••••"
                class="w-full rounded-2xl border-0 bg-white py-3.5 pr-12 pl-11 text-[15px] font-medium text-[#111827] transition-all outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-slate-700 dark:text-white"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center pr-4 text-[#9ca3af] transition-all duration-200 hover:text-[#2563eb] dark:hover:text-blue-400"
                @click="showPassword = !showPassword"
              >
                <!-- eye-off -->
                <EyeOff v-if="showPassword" />
                <!-- eye -->
                <EyeOn v-else />
              </button>
            </div>
            <span v-if="errors.password" class="mt-1 block pl-1 text-[12px] font-medium text-red-500">
              {{ errors.password }}
            </span>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="mb-6 flex items-center justify-between px-1">
            <label class="group flex cursor-pointer items-center space-x-2.5">
              <input v-model="loginForm.rememberMe" type="checkbox" class="peer sr-only" />
              <div
                class="z-5 flex h-5.5 w-5.5 items-center justify-center rounded-lg border-2 border-gray-300 bg-white transition-all duration-200 peer-checked:border-[#2563eb] peer-checked:bg-[#2563eb] peer-focus:ring-2 peer-focus:ring-[#2563eb]/20 dark:border-slate-600 dark:bg-slate-700 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500"
              >
                <svg
                  class="z-5 h-3 w-3 text-white opacity-0 transition-all duration-200 peer-checked:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span class="text-[14px] font-medium text-[#4b5563] dark:text-gray-300"> Remember Me </span>
            </label>
            <a href="#" class="text-[14px] font-bold text-[#1d4ed8] hover:underline dark:text-blue-400"> Forgot? </a>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="mb-4 w-full rounded-full bg-[#1e3a8a] py-4 text-[15px] font-bold text-white shadow-[0_8px_16px_rgba(30,58,138,0.2)] transition-all hover:bg-[#1e3a8a]/90 active:scale-[0.98] disabled:opacity-70 dark:bg-blue-600 dark:hover:bg-blue-600/90"
          >
            {{ isSubmitting ? "Logging in..." : "Login" }}
          </button>

          <!-- Passkey Button -->
          <button
            type="button"
            :disabled="isPasskeySubmitting"
            class="flex w-full items-center justify-center space-x-2 rounded-full bg-white py-4 text-[15px] font-bold text-[#111827] shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-70 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            @click="handlePasskeyLogin"
          >
            <IconKey />
            <span
              v-if="isPasskeySubmitting"
              class="h-4.5 w-4.5 animate-spin rounded-full border-2 border-[#111827] border-t-transparent dark:border-white"
            ></span>
            <span v-else>Login with Passkey</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="my-6 flex items-center justify-center text-center">
          <div class="h-px flex-1 bg-gray-200 dark:bg-slate-700"></div>
          <span class="px-3 text-[11px] font-bold tracking-wider text-[#6b7280] uppercase dark:text-gray-400">
            OR CONTINUE WITH
          </span>
          <div class="h-px flex-1 bg-gray-200 dark:bg-slate-700"></div>
        </div>

        <!-- GitHub Button -->
        <button
          class="flex w-full items-center justify-center space-x-2.5 rounded-full bg-[#0f172a] py-4 text-[15px] font-bold text-white shadow-md transition-all hover:bg-black active:scale-[0.98] dark:border dark:border-white/10 dark:bg-black/50"
          @click="handleGitHubLogin"
        >
          <IconGithub />
          <span>Login with GitHub</span>
        </button>

        <!-- Register Link -->
        <div class="mt-8 text-center">
          <p class="text-[14.5px] font-medium text-[#4b5563] dark:text-gray-300">
            Don't have an account?
            <RouterLink to="/register" class="ml-1 font-bold text-[#1d4ed8] hover:underline dark:text-blue-400">
              Register here
            </RouterLink>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
