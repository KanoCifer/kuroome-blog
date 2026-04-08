<template>
  <motion.div
    :initial="{ scale: 0 }"
    :animate="{ scale: 1 }"
    :whileHover="{ scale: 1.1 }"
    :whilePress="{ scale: 0.9 }"
    class="relative cursor-pointer rounded-full bg-gray-50/50 ring ring-gray-50 dark:bg-gray-800/50 dark:ring-gray-800/80"
    @click="playAnimation"
  >
    <span
      class="absolute top-2 right-0 z-10 flex translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 px-1 py-0.5 text-[10px] text-white"
      >{{ likesCounts }}</span
    >
    <div ref="containerRef" class="bento-like-animation h-12 w-12"></div>
  </motion.div>
</template>

<script setup lang="ts">
import { socialService } from "@/service/socialService";
import { useNotificationStore } from "@/stores/notification";
import { AxiosError } from "axios";
import type { AnimationItem } from "lottie-web";
import { motion } from "motion-v";
import { onMounted, onUnmounted, ref } from "vue";

const notifier = useNotificationStore();
const likesCounts = ref<number>(0);
const containerRef = ref<HTMLElement | null>(null);
const anim = ref<AnimationItem | null>(null);
const isSubmitting = ref(false);

const fetchLikesCount = async () => {
  try {
    const response = await socialService.getLikes();
    likesCounts.value = response.likescounts || 0;
  } catch (error) {
    console.error("Failed to fetch likes count:", error);
  }
};

onMounted(async () => {
  // 动态导入lottie-web，实现代码拆分
  const lottie = await import("lottie-web");
  const animationData = await import("@/assets/Success Micro Interaction.json");
  anim.value = lottie.default.loadAnimation({
    container: containerRef.value as Element,
    renderer: "svg",
    loop: false,
    autoplay: false,
    animationData: animationData.default,
  });

  anim.value.goToAndStop(anim.value.totalFrames - 1, true);

  anim.value.addEventListener("complete", () => {
    if (anim.value) {
      anim.value.goToAndStop(anim.value.totalFrames - 1, true);
    }
  });
});

const playAnimation = async () => {
  if (isSubmitting.value || !anim.value) return;

  isSubmitting.value = true;

  anim.value.goToAndStop(0, true);
  anim.value.play();

  try {
    await socialService.likeOnce({ likescounts: 1 });
    likesCounts.value += 1;
  } catch (error) {
    let errorMsg = "点赞失败，请稍后重试";
    if (error instanceof AxiosError) {
      if (error.response?.status === 429) {
        errorMsg = "🥳今天已经点赞很多次啦，明天再试试吧！";
      }
    }
    notifier.error(errorMsg);
    console.error("Failed to update likes count:", error);
  } finally {
    isSubmitting.value = false;
  }
};

onUnmounted(() => {
  if (anim.value) {
    anim.value.destroy();
  }
});

fetchLikesCount();
</script>
