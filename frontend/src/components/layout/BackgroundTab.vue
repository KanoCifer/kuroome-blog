<script setup lang="ts">
import { useBackgroundStore } from '@/stores/background';
import { useThemeStore } from '@/stores/theme';
import ImageGrid from './ImageGrid.vue';
import { ref, onBeforeUnmount } from 'vue';

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
    <!-- Blur Slider -->
    <div>
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        背景模糊：{{ themeStore.bgBlur }}px
      </label>
      <input
        type="range"
        min="5"
        max="70"
        step="1"
        :value="themeStore.bgBlur"
        @input="onInputBlur"
        class="hocus:border-primary accent-primary w-full cursor-pointer appearance-none rounded-full bg-gray-200/70 py-0.5 dark:bg-gray-700/70"
      />
    </div>

    <!-- Brightness Slider -->
    <div>
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        背景亮度：{{ Math.round(themeStore.bgBrightness * 100) }}%
      </label>
      <input
        type="range"
        min="30"
        max="100"
        step="5"
        :value="Math.round(themeStore.bgBrightness * 100)"
        @input="onInputBrightness"
        class="hocus:border-primary accent-primary w-full cursor-pointer appearance-none rounded-full bg-gray-200/70 py-0.5 dark:bg-gray-700/70"
      />
    </div>

    <!-- Scale Slider -->
    <div>
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        背景缩放：{{ Math.round(themeStore.bgScale * 100) }}%
      </label>
      <input
        type="range"
        min="100"
        max="130"
        step="1"
        :value="Math.round(themeStore.bgScale * 100)"
        @input="onInputScale"
        class="hocus:border-primary accent-primary w-full cursor-pointer appearance-none rounded-full bg-gray-200/70 py-0.5 dark:bg-gray-700/70"
      />
    </div>

    <!-- Background Mode -->
    <div>
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        背景模式
      </label>
      <div class="grid grid-cols-2 gap-3">
        <button
          @click="backgroundStore.randomize()"
          class="border-border hover:border-primary flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all"
          :class="{
            'border-primary bg-primary/5': backgroundStore.mode === 'random',
          }"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          <span class="text-sm font-medium">随机切换</span>
        </button>
        <button
          @click="backgroundStore.mode = 'fixed'"
          class="border-border hover:border-primary flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all"
          :class="{
            'border-primary bg-primary/5': backgroundStore.mode === 'fixed',
          }"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span class="text-sm font-medium">固定背景</span>
        </button>
      </div>
    </div>

    <!-- Auto-switch Interval (random mode only) -->
    <div v-if="backgroundStore.mode === 'random'">
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        自动切换
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in autoSwitchOptions"
          :key="opt.value"
          @click="backgroundStore.saveAutoSwitch(opt.value)"
          class="border-border hover:border-primary rounded-lg border-2 px-3 py-1.5 text-sm transition-all"
          :class="{
            'border-primary bg-primary/5':
              backgroundStore.autoSwitchInterval === opt.value,
          }"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Fixed Background Picker -->
    <div v-if="backgroundStore.mode === 'fixed'">
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        选择背景
      </label>
      <ImageGrid
        :images="backgroundStore.backgroundThumbs"
        :selected="backgroundStore.fixedIndex"
        @select="backgroundStore.selectFixed($event)"
      />
    </div>
  </div>
</template>
