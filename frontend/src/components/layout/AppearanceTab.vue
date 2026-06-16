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
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  },
  {
    value: 'light',
    label: '浅色',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/></svg>`,
  },
  {
    value: 'dark',
    label: '深色',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  },
];

const schemes: {
  value: ColorScheme;
  label: string;
  colors: string[];
  desc: string;
}[] = [
  {
    value: 'sky-blue',
    label: 'Sky Blue',
    colors: ['#3b82f6', '#0ea5e9', '#6366f1'],
    desc: '高远澄澈 · 3 色',
  },
  {
    value: 'forest-green',
    label: 'Forest Green',
    colors: ['#16a34a', '#0d9488', '#65a30d'],
    desc: '林深时见 · 3 色',
  },
  {
    value: 'paper',
    label: 'Paper · 纸',
    colors: ['#c8713a', '#5a7a62', '#8a653f'],
    desc: '落纸烟云 · 3 色',
  },
  {
    value: 'sage',
    label: 'Sage',
    colors: ['#4d6f57', '#8b7146', '#5e7072'],
    desc: '清隽素雅 · 3 色',
  },
  {
    value: 'mist',
    label: 'Mist',
    colors: ['#4f687a', '#5d7569', '#927255'],
    desc: '烟岚氤氲 · 3 色',
  },
  {
    value: 'blush',
    label: 'Blush',
    colors: ['#a5656f', '#6a7866', '#a06d4f'],
    desc: '桃夭未央 · 3 色',
  },
  {
    value: 'spring',
    label: '春暖 Spring',
    colors: ['#35bfab', '#f59e0b', '#10b981'],
    desc: '万物生发 · 3 色',
  },
  {
    value: 'autumn',
    label: '秋实 Autumn',
    colors: ['#de4331', '#eab308', '#3b82f6'],
    desc: '橙黄橘绿 · 3 色',
  },
  {
    value: 'clear-sky',
    label: '晴空 Clear Sky',
    colors: ['#2fcbe7', '#eab308', '#ffffff'],
    desc: '万里无云 · 3 色',
  },
  {
    value: 'midnight',
    label: '深夜 Midnight',
    colors: ['#2a48f3'],
    desc: '独坐幽篁 · 1 色',
  },
];
</script>

<template>
  <div class="space-y-6">
    <!-- 页面元素 -->
    <div>
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        页面元素
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">
        Display the page footer
      </p>

      <div
        @click="themeStore.toggleFooter()"
        class="border-border bg-card hover:border-primary flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition-colors"
      >
        <div>
          <div class="text-foreground text-sm font-medium">显示页脚</div>
          <div class="text-muted-foreground mt-0.5 text-xs">
            Show footer on every page
          </div>
        </div>
        <div
          class="h-6 w-11 rounded-full p-0.5 transition-colors"
          :class="themeStore.showFooter === 'true' ? 'bg-primary' : 'bg-muted'"
        >
          <div
            class="bg-card h-5 w-5 rounded-full shadow-md transition-transform"
            :class="
              themeStore.showFooter === 'true'
                ? 'translate-x-5'
                : 'translate-x-0'
            "
          />
        </div>
      </div>
    </div>

    <!-- 主题模式 -->
    <div>
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        主题模式
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">Theme mode</p>

      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="theme in themes"
          :key="theme.value"
          @click="selectTheme(theme.value as Theme, $event)"
          class="flex flex-col items-center gap-2 rounded-md border-2 p-3 transition-colors"
          :class="
            themeStore.theme === theme.value
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary'
          "
        >
          <span
            v-html="theme.icon"
            :class="
              themeStore.theme === theme.value
                ? 'text-primary'
                : 'text-foreground'
            "
          />
          <span
            class="text-xs"
            :class="
              themeStore.theme === theme.value
                ? 'text-primary font-semibold'
                : 'text-foreground'
            "
          >
            {{ theme.label }}
          </span>
        </button>
      </div>
    </div>

    <!-- 字体 -->
    <div>
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        字体
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">Reading font</p>

      <div class="grid grid-cols-2 gap-3">
        <button
          @click="themeStore.applyFont('default')"
          class="flex flex-col items-center gap-1 rounded-md border-2 p-3 transition-colors"
          :class="
            themeStore.font === 'default'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary'
          "
        >
          <span
            class="text-sm font-semibold"
            :class="
              themeStore.font === 'default' ? 'text-primary' : 'text-foreground'
            "
          >
            默认字体
          </span>
          <span class="text-muted-foreground font-mono text-[10px]">
            PingFang SC
          </span>
        </button>
        <button
          @click="themeStore.applyFont('harmonyos')"
          class="flex flex-col items-center gap-1 rounded-md border-2 p-3 transition-colors"
          :class="
            themeStore.font === 'harmonyos'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary'
          "
        >
          <span
            class="text-foreground text-sm font-semibold"
            style="font-family: 'Noto Sans SC', sans-serif; font-weight: 500"
          >
            HarmonyOS Sans
          </span>
          <span class="text-muted-foreground font-mono text-[10px]"
            >鸿蒙字体</span
          >
        </button>
      </div>
    </div>

    <!-- 配色方案 -->
    <div>
      <h2 class="text-foreground mb-1 font-serif text-lg font-semibold">
        配色方案
      </h2>
      <p class="text-muted-foreground mb-4 text-xs italic">
        Color scheme · 十种调性
      </p>

      <div class="space-y-2.5">
        <button
          v-for="scheme in schemes"
          :key="scheme.value"
          @click="themeStore.setScheme(scheme.value)"
          class="flex w-full items-stretch overflow-hidden rounded-md border-2 transition-colors"
          :class="
            themeStore.scheme === scheme.value
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary'
          "
        >
          <div v-if="scheme.colors.length > 1" class="flex w-[72px] flex-col">
            <div
              v-for="(color, i) in scheme.colors"
              :key="i"
              class="flex-1"
              :style="{ backgroundColor: color }"
            />
          </div>
          <div
            v-else
            class="w-[72px]"
            :style="{
              background: `linear-gradient(180deg, ${scheme.colors[0]} 0%, ${scheme.colors[0]}cc 100%)`,
            }"
          />
          <div class="flex-1 px-4 py-3 text-left">
            <div class="text-foreground text-sm font-semibold">
              {{ scheme.label }}
            </div>
            <div class="text-muted-foreground mt-0.5 text-[11px] italic">
              {{ scheme.desc }}
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
