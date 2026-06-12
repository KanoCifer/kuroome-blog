<template>
  <div
    class="bg-background/85 sticky top-0 z-20 -mx-4 mb-6 px-4 pt-3 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:-mx-10 md:px-10"
  >
    <!-- Row 1: 搜索 + 密度切换 -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Search
          class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
        />
        <input
          :value="searchQuery"
          type="text"
          placeholder="搜索书名或作者…"
          class="border-border bg-card placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-2 pr-3 pl-9 text-sm outline-none transition-colors focus:ring-2"
          @input="onSearchInput"
        />
      </div>

      <!-- 密度切换 -->
      <div
        class="border-border bg-card hidden items-center rounded-xl border p-0.5 sm:flex"
        role="group"
        aria-label="书架密度"
      >
        <button
          v-for="opt in DENSITY_OPTIONS"
          :key="opt.key"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          :class="
            density === opt.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          "
          :aria-pressed="density === opt.key"
          :aria-label="opt.label"
          :title="opt.label"
          @click="$emit('update:density', opt.key)"
        >
          <component :is="opt.icon" class="h-4 w-4" />
        </button>
      </div>

      <!-- 排序下拉 -->
      <div class="relative">
        <button
          type="button"
          class="border-border bg-card hover:bg-accent text-foreground inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm transition-colors"
          :aria-expanded="sortMenuOpen"
          aria-haspopup="menu"
          @click="sortMenuOpen = !sortMenuOpen"
        >
          <ArrowUpDown class="h-4 w-4" />
          <span class="hidden sm:inline">{{ activeSortLabel }}</span>
          <ChevronDown class="h-3.5 w-3.5 opacity-60" />
        </button>
        <div
          v-if="sortMenuOpen"
          class="border-border bg-card absolute top-full right-0 z-30 mt-1 w-36 overflow-hidden rounded-xl border shadow-lg"
          role="menu"
          @click.stop
        >
          <button
            v-for="opt in SORT_OPTIONS"
            :key="opt.key"
            type="button"
            class="text-foreground hover:bg-accent flex w-full items-center justify-between px-3 py-2 text-left text-sm"
            role="menuitemradio"
            :aria-checked="sort === opt.key"
            @click="onSelectSort(opt.key)"
          >
            <span>{{ opt.label }}</span>
            <Check
              v-if="sort === opt.key"
              class="text-primary h-3.5 w-3.5"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Row 2: 状态 chip -->
    <div
      class="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
      role="tablist"
      aria-label="书籍状态"
    >
      <button
        v-for="chip in CHIPS"
        :key="chip.key"
        type="button"
        class="flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors"
        :class="
          filter === chip.key
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground'
        "
        role="tab"
        :aria-selected="filter === chip.key"
        @click="$emit('update:filter', chip.key)"
      >
        <span>{{ chip.label }}</span>
        <span
          class="tabular-nums"
          :class="filter === chip.key ? 'opacity-90' : 'opacity-60'"
        >
          {{ countOf(chip.key) }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Grid3x3,
  LayoutGrid,
  List,
  Search,
} from '@lucide/vue';

export type ShelfFilter = 'all' | 'reading' | 'finished' | 'wishlist';
export type ShelfSort = 'recent' | 'title' | 'author';
export type ShelfDensity = 'compact' | 'standard' | 'list';

interface Counts {
  all: number;
  reading: number;
  finished: number;
  wishlist: number;
}

const props = defineProps<{
  searchQuery: string;
  filter: ShelfFilter;
  sort: ShelfSort;
  density: ShelfDensity;
  counts: Counts;
}>();

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:filter', value: ShelfFilter): void;
  (e: 'update:sort', value: ShelfSort): void;
  (e: 'update:density', value: ShelfDensity): void;
}>();

const CHIPS = [
  { key: 'all' as const, label: '全部' },
  { key: 'reading' as const, label: '在读' },
  { key: 'finished' as const, label: '已读' },
  { key: 'wishlist' as const, label: '待读' },
];

const SORT_OPTIONS = [
  { key: 'recent' as const, label: '最近更新' },
  { key: 'title' as const, label: '按书名' },
  { key: 'author' as const, label: '按作者' },
];

const DENSITY_OPTIONS = [
  { key: 'compact' as const, label: '紧凑', icon: Grid3x3 },
  { key: 'standard' as const, label: '标准', icon: LayoutGrid },
  { key: 'list' as const, label: '列表', icon: List },
];

const sortMenuOpen = ref(false);

const activeSortLabel = computed(
  () => SORT_OPTIONS.find((o) => o.key === props.sort)?.label ?? '排序',
);

function onSearchInput(e: Event) {
  emit('update:searchQuery', (e.target as HTMLInputElement).value);
}

function onSelectSort(key: ShelfSort) {
  emit('update:sort', key);
  sortMenuOpen.value = false;
}

function countOf(key: ShelfFilter) {
  return props.counts[key];
}

// 点击外部收起排序菜单
function onDocClick(e: MouseEvent) {
  if (!sortMenuOpen.value) return;
  const target = e.target as HTMLElement;
  if (!target.closest?.('[aria-haspopup="menu"]') && !target.closest?.('[role="menu"]')) {
    sortMenuOpen.value = false;
  }
}
onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));
</script>
