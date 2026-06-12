<template>
  <a
    :href="`weread://reading?bId=${book.bookId}`"
    class="group block"
    @click.prevent="$emit('select', book.bookId)"
  >
    <!-- ───────── List variant: 横向单行 ───────── -->
    <div
      v-if="variant === 'list'"
      class="border-border/60 bg-card hover:bg-accent/40 hover:shadow-primary/5 flex items-center gap-3 rounded-xl border p-3 transition-colors sm:gap-4 sm:p-4"
    >
      <div
        class="bg-muted relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md shadow-sm sm:h-20 sm:w-14"
      >
        <img
          v-if="book.cover"
          :src="book.cover"
          :alt="book.title"
          class="h-full w-full object-cover"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <div v-else class="flex h-full w-full items-center justify-center">
          <span class="text-muted-foreground/40 font-serif text-base">
            {{ book.title.slice(0, 1) }}
          </span>
        </div>
      </div>
      <div class="min-w-0 flex-1">
        <p
          class="text-foreground line-clamp-1 text-sm font-medium"
          :title="book.title"
        >
          {{ book.title }}
        </p>
        <p
          class="text-muted-foreground mt-0.5 line-clamp-1 text-xs"
          :title="book.author"
        >
          {{ book.author }}
        </p>
        <p class="text-muted-foreground/80 mt-1 text-[11px] tabular-nums">
          {{ statusLine }}
        </p>
      </div>
      <span
        v-if="badge"
        class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
        :class="badge.cls"
      >
        {{ badge.text }}
      </span>
    </div>

    <!-- ───────── Grid variants: standard / compact ───────── -->
    <div
      v-else
      class="bg-card hover:shadow-primary/5 relative overflow-hidden rounded-xl shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
      :style="{ animationDelay: `${index * 30}ms` }"
    >
      <div class="relative aspect-3/4 overflow-hidden">
        <img
          v-if="book.cover"
          :src="book.cover"
          :alt="book.title"
          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <div
          v-else
          class="bg-muted flex h-full w-full items-center justify-center"
        >
          <span
            class="text-muted-foreground/40 font-serif"
            :class="variant === 'compact' ? 'text-xl' : 'text-2xl'"
          >
            {{ book.title.slice(0, 1) }}
          </span>
        </div>

        <!-- Hover overlay -->
        <div
          class="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30"
        >
          <div
            class="bg-background/90 text-foreground flex h-9 w-9 items-center justify-center rounded-full opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:opacity-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="h-4 w-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </div>
        </div>

        <!-- 状态徽标(角标) -->
        <span
          v-if="badge"
          class="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
          :class="badge.cls"
        >
          {{ badge.text }}
        </span>
      </div>
      <div :class="variant === 'compact' ? 'px-1 py-1.5' : 'px-1.5 py-2'">
        <p
          class="text-foreground line-clamp-2 leading-snug font-medium"
          :class="variant === 'compact' ? 'text-[11px]' : 'text-xs'"
          :title="book.title"
        >
          {{ book.title }}
        </p>
        <p
          class="text-muted-foreground mt-1 truncate leading-snug"
          :class="variant === 'compact' ? 'text-[10px]' : 'text-[11px]'"
          :title="book.author"
        >
          {{ book.author }}
        </p>
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
import type { WereadUserBook } from '@/api/wereadGateway';
import dayjs from 'dayjs';
import { computed } from 'vue';

export type BookCardVariant = 'standard' | 'compact' | 'list';

const props = withDefaults(
  defineProps<{
    book: WereadUserBook;
    index: number;
    variant?: BookCardVariant;
  }>(),
  { variant: 'standard' },
);

defineEmits<{
  (e: 'select', bookId: string): void;
}>();

const badge = computed(() => {
  if (props.book.finishReading) {
    return { text: '已读', cls: 'bg-success/90 text-white' };
  }
  if (props.book.readUpdateTime) {
    return {
      text: '在读',
      cls: 'bg-primary/85 text-primary-foreground backdrop-blur-md',
    };
  }
  return null;
});

const statusLine = computed(() => {
  if (props.book.finishReading) return '已读完';
  if (!props.book.readUpdateTime) return '尚未翻开';
  const ts = dayjs(props.book.readUpdateTime);
  if (!ts.isValid()) return '在读';
  const diffD = dayjs().diff(ts, 'day');
  if (diffD === 0) return '今天还在读';
  if (diffD === 1) return '昨天翻开';
  if (diffD < 7) return `${diffD} 天前翻开`;
  if (diffD < 30) return `${Math.floor(diffD / 7)} 周前翻开`;
  return `${ts.format('M/D')} 翻开`;
});
</script>
