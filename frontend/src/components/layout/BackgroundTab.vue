<script setup lang="ts">
import { useBackgroundStore } from '@/stores/background';
import { useThemeStore } from '@/stores/theme';
import ImageGrid from './ImageGrid.vue';
import { onBeforeUnmount } from 'vue';

const themeStore = useThemeStore();
const backgroundStore = useBackgroundStore();

// Debounced localStorage writes: update reactive ref immediately for live preview,
// but batch localStorage writes to avoid blocking main thread on every slider pixel.
const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const debouncedSet = (key: string, value: string, ms = 150) => {
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(() => {
    localStorage.setItem(key, value);
    delete debounceTimers[key];
  }, ms);
};

const onInputBlur = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value);
  themeStore.bgBlur = val;
  debouncedSet('bg-blur', String(val));
};

const onInputBrightness = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value) / 100;
  themeStore.bgBrightness = val;
  debouncedSet('bg-brightness', String(val));
};

const onInputScale = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value) / 100;
  themeStore.bgScale = val;
  debouncedSet('bg-scale', String(val));
};

onBeforeUnmount(() => {
  Object.values(debounceTimers).forEach(clearTimeout);
});

const autoSwitchOptions = [
  { label: '关闭', value: 0 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '120s', value: 120 },
];
</script>

<template>
  <div class="space-y-6">
    <!-- 滑块组 -->
    <div>
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        背景调整
      </h2>
      <p class="text-muted-foreground mb-5 text-xs italic">
        Adjust background appearance
      </p>

      <div class="mb-5">
        <div class="mb-2.5 flex items-baseline justify-between">
          <span class="text-foreground text-sm font-medium">背景模糊</span>
          <span class="text-muted-foreground font-mono text-xs tabular-nums">
            {{ themeStore.bgBlur }} px
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="70"
          step="1"
          :value="themeStore.bgBlur"
          @input="onInputBlur"
          class="accent-primary w-full cursor-pointer"
        />
      </div>

      <div class="mb-5">
        <div class="mb-2.5 flex items-baseline justify-between">
          <span class="text-foreground text-sm font-medium">背景亮度</span>
          <span class="text-muted-foreground font-mono text-xs tabular-nums">
            {{ Math.round(themeStore.bgBrightness * 100) }} %
          </span>
        </div>
        <input
          type="range"
          min="30"
          max="100"
          step="5"
          :value="Math.round(themeStore.bgBrightness * 100)"
          @input="onInputBrightness"
          class="accent-primary w-full cursor-pointer"
        />
      </div>

      <div class="mb-5">
        <div class="mb-2.5 flex items-baseline justify-between">
          <span class="text-foreground text-sm font-medium">背景缩放</span>
          <span class="text-muted-foreground font-mono text-xs tabular-nums">
            {{ Math.round(themeStore.bgScale * 100) }} %
          </span>
        </div>
        <input
          type="range"
          min="100"
          max="130"
          step="1"
          :value="Math.round(themeStore.bgScale * 100)"
          @input="onInputScale"
          class="accent-primary w-full cursor-pointer"
        />
      </div>
    </div>

    <!-- 背景模式 -->
    <div>
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        背景模式
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">Background mode</p>

      <div class="grid grid-cols-2 gap-3">
        <button
          @click="backgroundStore.randomize()"
          class="flex flex-col items-center gap-2 rounded-md border-2 p-4 transition-colors"
          :class="
            backgroundStore.mode === 'random'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary'
          "
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            :class="
              backgroundStore.mode === 'random'
                ? 'text-primary'
                : 'text-foreground'
            "
          >
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          <span
            class="text-sm font-medium"
            :class="
              backgroundStore.mode === 'random'
                ? 'text-primary'
                : 'text-foreground'
            "
          >
            随机切换
          </span>
        </button>
        <button
          @click="backgroundStore.mode = 'fixed'"
          class="flex flex-col items-center gap-2 rounded-md border-2 p-4 transition-colors"
          :class="
            backgroundStore.mode === 'fixed'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary'
          "
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            :class="
              backgroundStore.mode === 'fixed'
                ? 'text-primary'
                : 'text-foreground'
            "
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span
            class="text-sm font-medium"
            :class="
              backgroundStore.mode === 'fixed'
                ? 'text-primary'
                : 'text-foreground'
            "
          >
            固定背景
          </span>
        </button>
      </div>
    </div>

    <!-- 自动切换间隔（仅 random 模式） -->
    <div v-if="backgroundStore.mode === 'random'">
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        自动切换
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">
        Auto-switch interval
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in autoSwitchOptions"
          :key="opt.value"
          @click="backgroundStore.saveAutoSwitch(opt.value)"
          class="rounded-md border-2 px-3.5 py-1.5 text-sm transition-colors"
          :class="
            backgroundStore.autoSwitchInterval === opt.value
              ? 'border-primary bg-primary/5 text-primary font-medium'
              : 'border-border bg-card text-foreground hover:border-primary'
          "
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- 固定背景选择（仅 fixed 模式） -->
    <div v-if="backgroundStore.mode === 'fixed'">
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        选择背景
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">
        Choose a fixed background
      </p>
      <ImageGrid
        :images="backgroundStore.backgroundThumbs"
        :selected="backgroundStore.fixedIndex"
        @select="backgroundStore.selectFixed($event)"
      />
    </div>
  </div>
</template>
