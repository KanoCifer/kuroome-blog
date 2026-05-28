<template>
  <BentoCard
    class="group relative min-w-0 overflow-hidden"
    @click.stop="$router.push('/gallery')"
  >
    <!-- 背景渐变 -->
    <img :src="imageSrc" class="squircle w-full p-0" />
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import { useCardImage } from '@/composables/useCardImage';

const { imageSrc } = useCardImage();
</script>
