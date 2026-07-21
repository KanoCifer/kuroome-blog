<script setup lang="ts">
import { useCardImage } from '@/composables';

const { cardIndex, cardImages, setCardIndex } = useCardImage();
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        卡片配图
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">Card cover image</p>

      <!-- 当前选中卡片预览 — 横版 -->
      <div
        class="border-border/60 relative mx-auto aspect-[16/9] w-full max-w-xs overflow-hidden rounded-xl border shadow-sm transition-all duration-200"
      >
        <div
          class="h-full w-full transition-[background] duration-300"
          :style="{
            backgroundImage: `url(${cardImages[cardIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }"
        />
      </div>

      <!-- 三选一切换器 — 横排缩略图 -->
      <div class="mt-4 flex justify-center gap-3">
        <button
          v-for="(image, i) in cardImages"
          :key="i"
          @click="setCardIndex(i)"
          class="aspect-[16/9] w-16 overflow-hidden rounded-lg border transition-all duration-200"
          :class="
            cardIndex === i
              ? 'border-primary scale-105 !shadow-sm'
              : 'border-border/60 hover:border-primary opacity-70 hover:opacity-100'
          "
          :aria-label="`卡片 ${i + 1}`"
          :aria-pressed="cardIndex === i"
        >
          <div
            class="h-full w-full"
            :style="{
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }"
          />
        </button>
      </div>
    </div>
  </div>
</template>
