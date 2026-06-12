<template>
  <BentoCard
    class="group relative min-w-0 overflow-hidden"
    @click.stop="$router.push('/gallery')"
  >
    <!-- 背景渐变 -->
    <img
      loading="lazy"
      decoding="async"
      :src="imageSrc"
      style="max-width: 100%; height: auto"
      class="squircle bg-muted w-full object-cover p-0"
      alt="Bento Card Image"
    />
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import { useCardImage } from '@/composables/useCardImage';

const { imageSrc } = useCardImage();
</script>
