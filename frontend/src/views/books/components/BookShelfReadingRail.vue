<template>
  <section v-if="books.length" class="mb-8">
    <header class="mb-3 flex items-baseline justify-between">
      <div class="flex items-baseline gap-2">
        <h2 class="text-foreground font-serif text-xl font-bold md:text-2xl">
          你正在读
        </h2>
        <span class="text-muted-foreground text-xs tabular-nums">
          {{ books.length }} 本
        </span>
      </div>
      <button
        v-if="hasOverflow"
        type="button"
        class="text-muted-foreground hover:text-foreground text-xs font-medium"
        @click="scrollByPage(1)"
      >
        更多 →
      </button>
    </header>

    <div class="relative -mx-4 sm:-mx-6 md:-mx-10">
      <div
        ref="railEl"
        class="flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:scroll-px-6 sm:gap-4 sm:px-6 md:scroll-px-10 md:px-10 [&::-webkit-scrollbar]:hidden"
      >
        <div
          v-for="book in books"
          :key="book.bookId"
          class="w-28 flex-shrink-0 snap-start sm:w-32 md:w-36"
        >
          <WereadBookCard
            :book="book"
            :showStatus="true"
            @select="$emit('select', book)"
          >
            <template #corner-tl> </template>
          </WereadBookCard>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WereadUserBook } from '@/api/wereadGateway';
import WereadBookCard from '@/components/weread/WereadBookCard.vue';
import dayjs from 'dayjs';
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineProps<{
  books: WereadUserBook[];
}>();

defineEmits<{
  (e: 'select', book: WereadUserBook): void;
}>();

const railEl = ref<HTMLDivElement | null>(null);
const hasOverflow = ref(false);

function checkOverflow() {
  const el = railEl.value;
  if (!el) return;
  hasOverflow.value = el.scrollWidth > el.clientWidth + 4;
}

let ro: ResizeObserver | null = null;
onMounted(() => {
  checkOverflow();
  if (typeof ResizeObserver !== 'undefined' && railEl.value) {
    ro = new ResizeObserver(checkOverflow);
    ro.observe(railEl.value);
  }
});
onBeforeUnmount(() => {
  ro?.disconnect();
});

function scrollByPage(dir: 1 | -1) {
  const el = railEl.value;
  if (!el) return;
  el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
}

defineExpose({ scrollByPage });
</script>
