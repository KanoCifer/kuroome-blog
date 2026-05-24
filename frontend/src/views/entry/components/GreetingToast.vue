<script setup lang="ts">
import { useGreeting } from "@/composables/useGreeting";
import { useStorage } from "@vueuse/core";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const showToast = ref(false);
const hasClosed = useStorage<boolean>(
  "greeting_toast_closed",
  false,
  sessionStorage,
);

const { isDay, greeting, changelogHint } = useGreeting();

onMounted(() => {
  if (hasClosed.value) return;
  setTimeout(() => {
    showToast.value = true;
  }, 5000);
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
      enter-active-class="animate-toast-in"
      leave-active-class="animate-toast-out"
    >
      <div
        v-if="showToast"
        class="group fixed bottom-6 left-4 z-50 w-[300px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/50 shadow-2xl shadow-black/20 backdrop-blur-2xl transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:bg-black/60 hover:shadow-2xl hover:shadow-amber-500/5 sm:bottom-8 sm:left-8"
      >
        <!-- 漂浮光晕：左上 -->
        <div
          class="animate-orb-drift pointer-events-none absolute -top-12 -left-12 h-24 w-24 rounded-full bg-amber-500/12 blur-3xl"
        />
        <!-- 漂浮光晕：右下 -->
        <div
          class="animate-orb-drift-reverse pointer-events-none absolute -right-8 -bottom-8 h-20 w-20 rounded-full bg-amber-400/8 blur-3xl"
        />
        <!-- 中央呼吸光晕 -->
        <div
          class="animate-orb-pulse pointer-events-none absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/6 blur-3xl"
        />

        <div class="relative px-4 py-4">
          <!-- 关闭按钮 -->
          <button
            @click="closeToast"
            class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-white/30 transition-all duration-200 hover:scale-110 hover:bg-white/10 hover:text-white/60"
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
            <!-- 图标：呼吸发光 -->
            <div
              class="animate-icon-glow relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-400/20"
            >
              <svg
                v-if="isDay"
                class="size-5 text-amber-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="5" />
                <g
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
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
              <svg
                v-else
                class="size-5 text-amber-200"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </div>

            <!-- 文字 -->
            <div class="min-w-0 flex-1">
              <h3
                class="font-serif text-sm font-semibold tracking-wide text-white/90"
              >
                {{ greeting }}
              </h3>
              <p class="mt-0.5 truncate text-xs text-white/50">
                {{ changelogHint }}
              </p>
            </div>
          </div>

          <!-- CTA 按钮：hover 流光 -->
          <button
            @click="goToChangelog"
            class="group/btn relative mt-3 flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl bg-amber-400/90 py-2 text-xs font-medium text-black/90 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.97]"
          >
            <span class="relative z-10">查看更新日志</span>
            <svg
              class="relative z-10 transition-transform duration-300 group-hover/btn:translate-x-0.5"
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
            <!-- 流光条纹 -->
            <div
              class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 group-hover/btn:translate-x-full"
            />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.92);
  }
  60% {
    opacity: 1;
    transform: translateY(-6px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(12px) scale(0.94);
  }
}

@keyframes orb-drift {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(10px, -8px) scale(1.12);
  }
  66% {
    transform: translate(-6px, 6px) scale(0.94);
  }
}

@keyframes orb-drift-reverse {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(-8px, 6px) scale(0.9);
  }
  66% {
    transform: translate(6px, -6px) scale(1.1);
  }
}

@keyframes orb-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(1.15);
  }
}

@keyframes icon-glow {
  0%,
  100% {
    box-shadow: 0 0 6px rgba(251, 191, 36, 0.15);
  }
  50% {
    box-shadow: 0 0 18px rgba(251, 191, 36, 0.35);
  }
}

.animate-toast-in {
  animation: toast-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.animate-toast-out {
  animation: toast-out 0.2s ease-in forwards;
}

.animate-orb-drift {
  animation: orb-drift 8s ease-in-out infinite;
}

.animate-orb-drift-reverse {
  animation: orb-drift-reverse 7s ease-in-out infinite;
}

.animate-orb-pulse {
  animation: orb-pulse 4s ease-in-out infinite;
}

.animate-icon-glow {
  animation: icon-glow 3s ease-in-out infinite;
}
</style>
