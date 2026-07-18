<template>
  <motion.div
    :initial="{ scale: 0 }"
    :animate="{ scale: 1 }"
    :whileHover="HOVER_SCALE_UP"
    :whilePress="{ scale: 0.9 }"
    class="bg-background/55 ring-border/30 relative cursor-pointer rounded-full ring"
    @click="playAnimation"
  >
    <span
      class="bg-primary text-primary-foreground absolute top-2 right-0 z-10 flex translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 py-0.5 text-[10px]"
      >{{ likesCounts }}</span
    >
    <div ref="containerRef" class="bento-like-animation h-12 w-12"></div>
  </motion.div>
</template>

<script setup lang="ts">
import { socialGateway } from '@/api/blog';
import { useNotificationStore } from '@/stores/notification';
import { AxiosError } from 'axios';
import type { AnimationItem } from 'lottie-web';
import { motion } from 'motion-v';
import { HOVER_SCALE_UP } from '@/constants/motionPresets';
import { onMounted, onUnmounted, ref } from 'vue';

const notifier = useNotificationStore();
const likesCounts = ref<number>(0);
const containerRef = ref<HTMLElement | null>(null);
const anim = ref<AnimationItem | null>(null);
const isSubmitting = ref(false);

const fetchLikesCount = async () => {
  try {
    const response = await socialGateway.getLikes();
    likesCounts.value = response.likes_count || 0;
  } catch (error) {
    console.error('Failed to fetch likes count:', error);
  }
};

onMounted(async () => {
  // 动态导入lottie-web，实现代码拆分
  const lottie = await import('lottie-web');
  const animationData = await import('@/assets/Success Micro Interaction.json');
  anim.value = lottie.default.loadAnimation({
    container: containerRef.value as Element,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: animationData.default,
  });

  anim.value.goToAndStop(anim.value.totalFrames - 1, true);

  anim.value.addEventListener('complete', () => {
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
    await socialGateway.likeOnce({ likes_count: 1 });
    likesCounts.value += 1;
  } catch (error) {
    let errorMsg = '点赞失败，请稍后重试';
    if (error instanceof AxiosError) {
      if (error.response?.status === 429) {
        errorMsg = '🥳今天已经点赞很多次啦，明天再试试吧！';
      }
    }
    notifier.error(errorMsg);
    console.error('Failed to update likes count:', error);
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
