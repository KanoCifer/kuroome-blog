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
        class="scroll-px-4 sm:scroll-px-6 md:scroll-px-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 sm:px-6 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <a
          v-for="book in books"
          :key="book.bookId"
          :href="`weread://reading?bId=${book.bookId}`"
          class="group block w-28 flex-shrink-0 snap-start sm:w-32 md:w-36"
          @click.prevent="$emit('select', book.bookId)"
        >
          <div
            class="bg-card relative aspect-3/4 overflow-hidden rounded-xl shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
          >
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
              <span class="text-muted-foreground/40 font-serif text-2xl">
                {{ book.title.slice(0, 1) }}
              </span>
            </div>

            <!-- 「最近翻开」时间徽标 -->
            <div
              v-if="recencyLabel(book)"
              class="bg-background/85 text-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-md"
            >
              {{ recencyLabel(book) }}
            </div>
          </div>
          <p
            class="text-foreground mt-2 line-clamp-2 px-1 text-xs leading-snug font-medium"
            :title="book.title"
          >
            {{ book.title }}
          </p>
          <p
            class="text-muted-foreground mt-0.5 truncate px-1 text-[11px]"
            :title="book.author"
          >
            {{ book.author }}
          </p>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WereadUserBook } from '@/api/wereadGateway';
import dayjs from 'dayjs';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
  books: WereadUserBook[];
}>();

defineEmits<{
  (e: 'select', bookId: string): void;
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

// 「3 分钟前 / 2 小时前 / 昨天 / 3 天前」
function recencyLabel(book: WereadUserBook): string {
  if (!book.readUpdateTime) return '';
  const ts = dayjs(book.readUpdateTime);
  if (!ts.isValid()) return '';
  const now = dayjs();
  const diffMin = now.diff(ts, 'minute');
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffH = now.diff(ts, 'hour');
  if (diffH < 24) return `${diffH} 小时前`;
  const diffD = now.diff(ts, 'day');
  if (diffD === 1) return '昨天';
  if (diffD < 7) return `${diffD} 天前`;
  if (diffD < 30) return `${Math.floor(diffD / 7)} 周前`;
  return ts.format('M/D');
}

// 防止 unused warning(props 在模板里用了,这里给一个显式 export 让 SFC tool 满意)
defineExpose({ scrollByPage });
</script>
