import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

export type BackgroundMode = 'fixed' | 'random';

export interface BackgroundOption {
  /** 唯一标识 */
  id: string;
  /** 显示名 */
  name: string;
  /** 对应的 CSS 渐变类名 */
  className: string;
}

/*
 * 背景渐变定义 —— 每项对应一个 .gradient-* CSS 类。
 * 渐变本身（含 ::after 纹理层）在 base.css 中定义，这里只保存元数据。
 */
export const BACKGROUNDS: BackgroundOption[] = [
  { id: 'saiun', name: 'Saiun', className: 'gradient-saiun' },
  { id: 'hisui', name: 'Hisui', className: 'gradient-hisui' },
  { id: 'sangoshou', name: 'Sangoshou', className: 'gradient-sangoshou' },
];

export const useBackgroundStore = defineStore('background', () => {
  const mode = ref<BackgroundMode>(
    (localStorage.getItem('readinglist_bg_mode') as BackgroundMode) || 'fixed',
  );

  const fixedIndex = ref<number>(
    (() => {
      const stored = localStorage.getItem('readinglist_bg_index');
      const n = stored ? Number.parseInt(stored, 10) : NaN;
      return Number.isFinite(n) && n >= 0 && n < BACKGROUNDS.length ? n : 0;
    })(),
  );

  const randomIndex = ref<number>(
    Math.floor(Math.random() * BACKGROUNDS.length),
  );

  const effectiveIndex = computed(() =>
    mode.value === 'random' ? randomIndex.value : fixedIndex.value,
  );

  /** 当前生效的渐变类名 */
  const backgroundClass = computed(
    () => BACKGROUNDS[effectiveIndex.value].className,
  );

  const selectFixed = (index: number) => {
    fixedIndex.value = index;
    mode.value = 'fixed';
    localStorage.setItem('readinglist_bg_index', String(index));
    localStorage.setItem('readinglist_bg_mode', 'fixed');
  };

  const randomize = () => {
    randomIndex.value = Math.floor(Math.random() * BACKGROUNDS.length);
    mode.value = 'random';
    localStorage.setItem('readinglist_bg_mode', 'random');
  };

  const reroll = () => {
    if (mode.value === 'random') {
      randomIndex.value = Math.floor(Math.random() * BACKGROUNDS.length);
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
        randomIndex.value = Math.floor(Math.random() * BACKGROUNDS.length);
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
    backgrounds: BACKGROUNDS,
    mode,
    fixedIndex,
    randomIndex,
    effectiveIndex,
    backgroundClass,
    selectFixed,
    randomize,
    reroll,
    autoSwitchInterval,
    saveAutoSwitch,
  };
});
