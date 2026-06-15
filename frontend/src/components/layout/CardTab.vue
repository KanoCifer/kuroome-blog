<script setup lang="ts">
import { useCardImage } from '@/composables/useCardImage';

const { cardIndex, cardImages, setCardIndex } = useCardImage();

// 6 个图位 — 用 3 张真实图循环 + gradient 作为兜底底色
const gradients = [
  'linear-gradient(135deg, #c8713a, #8a653f)',
  'linear-gradient(135deg, #5a7a62, #4d6f57)',
  'linear-gradient(135deg, #5a6b7a, #4f687a)',
  'linear-gradient(135deg, #b35a5a, #a5656f)',
  'linear-gradient(135deg, #b8892e, #c8713a)',
  'linear-gradient(135deg, #6a7866, #5e7072)',
];

const slots = Array.from({ length: 6 }, (_, i) => ({
  imageIndex: i % cardImages.length,
  gradient: gradients[i % gradients.length],
}));
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        卡片配图
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">
        Card cover image
      </p>
      <div class="grid grid-cols-3 gap-2.5">
        <button
          v-for="(slot, i) in slots"
          :key="i"
          @click="setCardIndex(slot.imageIndex)"
          class="aspect-[3/4] overflow-hidden rounded-md border-2 transition-colors"
          :class="
            cardIndex === slot.imageIndex
              ? 'border-primary'
              : 'border-border hover:border-primary'
          "
        >
          <div
            class="h-full w-full"
            :style="{ background: slot.gradient }"
          />
        </button>
      </div>
    </div>
  </div>
</template>
