<script setup lang="ts">
import { useThemeStore, type Theme, type ColorScheme } from '@/stores/theme';

const themeStore = useThemeStore();

const selectTheme = (theme: Theme, event: MouseEvent) => {
  themeStore.setThemeWithAnimation(event, theme);
};

const themes: { value: Theme; label: string; icon: string }[] = [
  {
    value: 'system',
    label: '系统',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  },
  {
    value: 'light',
    label: '浅色',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  },
  {
    value: 'dark',
    label: '深色',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  },
];

const schemes: { value: ColorScheme; label: string; colors: string[] }[] = [
  {
    value: 'sky-blue',
    label: 'Sky Blue',
    colors: ['#3b82f6', '#0ea5e9', '#6366f1'],
  },
  {
    value: 'forest-green',
    label: 'Forest Green',
    colors: ['#16a34a', '#0d9488', '#65a30d'],
  },
  { value: 'paper', label: 'Paper', colors: ['#c8713a', '#5a7a62', '#8a653f'] },
  { value: 'sage', label: 'Sage', colors: ['#4d6f57', '#8b7146', '#5e7072'] },
  { value: 'mist', label: 'Mist', colors: ['#4f687a', '#5d7569', '#927255'] },
  { value: 'blush', label: 'Blush', colors: ['#a5656f', '#6a7866', '#a06d4f'] },
  {
    value: 'spring',
    label: '春暖 (Spring)',
    colors: ['#35bfab', '#f59e0b', '#10b981'],
  },
  {
    value: 'autumn',
    label: '秋实 (Autumn)',
    colors: ['#de4331', '#eab308', '#3b82f6'],
  },
  {
    value: 'clear-sky',
    label: '晴空 (Clear Sky)',
    colors: ['#2fcbe7', '#eab308', '#ffffff'],
  },
  { value: 'midnight', label: '深夜 (Midnight)', colors: ['#2a48f3'] },
];
</script>

<template>
  <div class="space-y-6">
    <!-- Footer Toggle -->
    <div>
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        页面元素
      </label>
      <div
        @click="themeStore.toggleFooter()"
        class="border-border hover:border-primary flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-all"
      >
        <span class="text-sm font-medium">显示页脚</span>
        <div
          class="h-6 w-11 rounded-full p-0.5 transition-colors"
          :class="
            themeStore.showFooter === 'true' ? 'bg-primary' : 'bg-muted-foreground/30'
          "
        >
          <div
            class="h-5 w-5 rounded-full bg-white shadow-md transition-transform"
            :class="
              themeStore.showFooter === 'true' ? 'translate-x-5' : 'translate-x-0'
            "
          />
        </div>
      </div>
    </div>

    <!-- Theme Mode -->
    <div>
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        主题模式
      </label>
      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="theme in themes"
          :key="theme.value"
          @click="selectTheme(theme.value as Theme, $event)"
          class="border-border hover:border-primary flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all"
          :class="{ 'border-primary bg-primary/5': themeStore.theme === theme.value }"
        >
          <span v-html="theme.icon"></span>
          <span class="text-xs font-medium">{{ theme.label }}</span>
        </button>
      </div>
    </div>

    <!-- Font Switcher -->
    <div>
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        字体
      </label>
      <div class="grid grid-cols-2 gap-3">
        <button
          @click="themeStore.applyFont('default')"
          class="border-border hover:border-primary flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all"
          :class="{ 'border-primary bg-muted': themeStore.font === 'default' }"
        >
          <span class="font-sans text-sm font-medium">默认字体</span>
          <span class="text-muted-foreground font-sans text-xs">PingFang SC</span>
        </button>
        <button
          @click="themeStore.applyFont('harmonyos')"
          class="border-border hover:border-primary flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all"
          :class="{ 'border-primary bg-muted': themeStore.font === 'harmonyos' }"
        >
          <span
            class="font-family-harmonyos text-sm font-medium"
            style="font-weight: 500"
            >HarmonyOS Sans</span
          >
          <span class="text-muted-foreground font-family-harmonyos text-xs"
            >鸿蒙字体</span
          >
        </button>
      </div>
    </div>

    <!-- Color Scheme -->
    <div>
      <label class="text-muted-foreground mb-3 block text-sm font-medium">
        配色方案
      </label>
      <div class="space-y-2">
        <button
          v-for="scheme in schemes"
          :key="scheme.value"
          @click="themeStore.setScheme(scheme.value)"
          class="border-border hover:border-primary flex w-full items-center gap-3 rounded-xl border-2 p-3 transition-all"
          :class="{ 'border-primary bg-primary/5': themeStore.scheme === scheme.value }"
        >
          <div class="flex gap-1">
            <span
              v-for="(color, i) in scheme.colors"
              :key="i"
              class="h-5 w-5 rounded-full"
              :style="{ backgroundColor: color }"
            />
          </div>
          <span class="text-sm font-medium">{{ scheme.label }}</span>
          <svg
            v-if="themeStore.scheme === scheme.value"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-primary ml-auto"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
