<script setup lang="ts">
import { useCardImage } from '@/composables/useCardImage';
import ImageGrid from './ImageGrid.vue';

const { cardIndex, cardImages, setCardIndex } = useCardImage();
</script>

<template>
  <div class="space-y-6">
    <div>
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        选择卡片配图
      </label>
      <ImageGrid :images="cardImages" :selected="cardIndex" @select="setCardIndex" />
    </div>
  </div>
</template>
