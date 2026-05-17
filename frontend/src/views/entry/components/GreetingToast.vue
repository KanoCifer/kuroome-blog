<script setup lang="ts">
import { useGreeting } from "@/composables/useGreeting";
import { useStorage } from "@vueuse/core";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const showToast = ref(false);
const hasClosed = useStorage<boolean>("greeting_toast_closed", false);

const { isDay, greeting, changelogHint } = useGreeting();

onMounted(() => {
  if (hasClosed.value) return;
  setTimeout(() => {
    showToast.value = true;
  }, 800);
});

const closeToast = () => {
  showToast.value = false;
  hasClosed.value = true;
};

const goToChangelog = () => {
  router.push("/changelog");
  closeToast();
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all transform-gpu duration-500 ease-out"
      enter-from-class="translate-y-6 scale-95 opacity-0"
      enter-to-class="translate-y-0 scale-100 opacity-100"
      leave-active-class="transition-all transform-gpu duration-300 ease-in"
      leave-from-class="translate-y-0 scale-100 opacity-100"
      leave-to-class="translate-y-6 scale-95 opacity-0"
    >
      <div
        v-if="showToast"
        class="group fixed bottom-6 left-4 z-50 w-[300px] overflow-hidden rounded-2xl border border-white/[0.06] bg-black/75 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-white/[0.10] sm:bottom-8 sm:left-8"
      >
        <!-- 顶部装饰光晕 -->
        <div
          class="pointer-events-none absolute -top-12 -left-12 h-24 w-24 rounded-full bg-amber-500/10 blur-3xl"
        ></div>

        <div class="relative px-4 py-4">
          <!-- 关闭按钮 -->
          <button
            @click="closeToast"
            class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/60"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <!-- 内容 -->
          <div class="flex items-center gap-3">
            <!-- 图标 -->
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <svg v-if="isDay" class="size-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="5" />
                <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </g>
              </svg>
              <svg v-else class="size-5 text-amber-200" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </div>

            <!-- 文字 -->
            <div class="min-w-0 flex-1">
              <h3 class="font-serif text-sm font-semibold tracking-wide text-white/90">{{ greeting }}</h3>
              <p class="mt-0.5 truncate text-xs text-white/50">{{ changelogHint }}</p>
            </div>
          </div>

          <!-- 按钮 -->
          <button
            @click="goToChangelog"
            class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400/90 py-2 text-xs font-medium text-black/90 shadow-lg shadow-amber-500/20 transition-all duration-200 hover:bg-amber-400 active:scale-[0.97]"
          >
            <span>查看更新日志</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <!-- 底部装饰光晕 -->
        <div
          class="pointer-events-none absolute -right-8 -bottom-8 h-20 w-20 rounded-full bg-amber-500/8 blur-3xl"
        ></div>
      </div>
    </Transition>
  </Teleport>
</template>
