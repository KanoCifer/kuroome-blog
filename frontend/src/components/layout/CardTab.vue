<script setup lang="ts">
import { useCardImage } from '@/composables/useCardImage';

const { cardIndex, cardImages, setCardIndex } = useCardImage();
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        卡片配图
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">Card cover image</p>
      <div class="grid grid-cols-3 gap-2.5">
        <button
          v-for="(image, i) in cardImages"
          :key="i"
          @click="setCardIndex(i)"
          class="aspect-[3/4] overflow-hidden rounded-md border-2 transition-colors"
          :class="
            cardIndex === i
              ? 'border-primary'
              : 'border-border hover:border-primary'
          "
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
