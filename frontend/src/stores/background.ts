import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

export type BackgroundMode = 'fixed' | 'random';

const BACKGROUND_IMAGES = Array.from(
  { length: 15 },
  (_, i) => `/background/bg-${i + 1}.webp`,
);

const BACKGROUND_THUMBS = Array.from(
  { length: 15 },
  (_, i) => `/background/thumb/bg-${i + 1}.webp`,
);

export const useBackgroundStore = defineStore('background', () => {
  const mode = ref<BackgroundMode>(
    (localStorage.getItem('readinglist_bg_mode') as BackgroundMode) || 'fixed',
  );

  const fixedIndex = ref<number>(
    (() => {
      const stored = localStorage.getItem('readinglist_bg_index');
      const n = stored ? Number.parseInt(stored, 10) : NaN;
      return Number.isFinite(n) && n >= 0 && n < BACKGROUND_IMAGES.length
        ? n
        : 0;
    })(),
  );

  const randomIndex = ref<number>(
    Math.floor(Math.random() * BACKGROUND_IMAGES.length),
  );

  const effectiveIndex = computed(() =>
    mode.value === 'random' ? randomIndex.value : fixedIndex.value,
  );

  const backgroundUrl = computed(() => BACKGROUND_IMAGES[effectiveIndex.value]);

  const selectFixed = (index: number) => {
    fixedIndex.value = index;
    mode.value = 'fixed';
    localStorage.setItem('readinglist_bg_index', String(index));
    localStorage.setItem('readinglist_bg_mode', 'fixed');
  };

  const randomize = () => {
    randomIndex.value = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
    mode.value = 'random';
    localStorage.setItem('readinglist_bg_mode', 'random');
  };

  const reroll = () => {
    if (mode.value === 'random') {
      randomIndex.value = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
    }
  };

  const autoSwitchInterval = ref<number>(
    Number(localStorage.getItem('bg-auto-switch') || 0),
  );

  let autoSwitchTimer: ReturnType<typeof setInterval> | null = null;

  const startAutoSwitch = () => {
    if (autoSwitchTimer) {
      clearInterval(autoSwitchTimer);
      autoSwitchTimer = null;
    }
    if (mode.value === 'random' && autoSwitchInterval.value > 0) {
      autoSwitchTimer = setInterval(() => {
        randomIndex.value = Math.floor(
          Math.random() * BACKGROUND_IMAGES.length,
        );
      }, autoSwitchInterval.value * 1000);
    }
  };

  const saveAutoSwitch = (seconds: number) => {
    autoSwitchInterval.value = seconds;
    localStorage.setItem('bg-auto-switch', String(seconds));
  };

  watch([mode, autoSwitchInterval], startAutoSwitch, { immediate: true });

  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (autoSwitchTimer) {
        clearInterval(autoSwitchTimer);
        autoSwitchTimer = null;
      }
    } else {
      startAutoSwitch();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    backgroundImages: BACKGROUND_IMAGES,
    backgroundThumbs: BACKGROUND_THUMBS,
    mode,
    fixedIndex,
    randomIndex,
    effectiveIndex,
    backgroundUrl,
    selectFixed,
    randomize,
    reroll,
    autoSwitchInterval,
    saveAutoSwitch,
  };
});
