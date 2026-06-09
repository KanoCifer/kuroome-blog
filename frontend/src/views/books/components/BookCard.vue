<template>
  <a
    :href="`weread://reading?bId=${book.bookId}`"
    class="group block"
    @click.prevent="$emit('select', book.bookId)"
  >
    <div
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
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <div
          v-else
          class="bg-muted flex h-full w-full items-center justify-center"
        >
          <span class="text-muted-foreground/40 font-serif text-2xl">{{
            book.title.slice(0, 1)
          }}</span>
        </div>

        <!-- Hover overlay with open icon -->
        <div
          class="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30"
        >
          <div
            class="bg-background/90 text-foreground flex h-10 w-10 items-center justify-center rounded-full opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:opacity-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="h-5 w-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </div>
        </div>

        <div
          v-if="book.finishReading"
          class="bg-success/90 absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
        >
          已读
        </div>
      </div>
      <div class="px-1.5 py-2">
        <p
          class="text-foreground line-clamp-2 text-xs leading-snug font-medium"
          :title="book.title"
        >
          {{ book.title }}
        </p>
        <p
          class="text-muted-foreground mt-1 truncate text-[11px] leading-snug"
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

defineProps<{
  book: WereadUserBook;
  index: number;
}>();

defineEmits<{
  (e: 'select', bookId: string): void;
}>();
</script>
