import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playThemeTransition } from '../utils/themeTransition';

type Theme = 'light' | 'dark' | 'system';
type FontFamily = 'default' | 'harmonyos';
interface ThemeState {
  theme: Theme;
  font: FontFamily;
  setTheme: (theme: Theme) => void;
  setFont: (font: FontFamily) => void;
  toggleTheme: () => void;
  toggleThemeWithAnimation: (event: {
    clientX: number;
    clientY: number;
  }) => void;
}

const applyTheme = (newTheme: Theme) => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (newTheme === 'system') {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    root.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    root.classList.add(newTheme);
  }
};

const applyFont = (newFont: FontFamily) => {
  const root = document.documentElement;
  if (newFont === 'harmonyos') {
    root.setAttribute('data-font', 'harmonyos');
  } else {
    root.removeAttribute('data-font');
  }
};

export const useThemeState = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      font: 'default',

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      setFont: (font) => {
        applyFont(font);
        set({ font });
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        // 复用 setTheme
        get().setTheme(currentTheme === 'light' ? 'dark' : 'light');
      },

      toggleThemeWithAnimation: (event) => {
        const currentTheme = get().theme;
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';

        // playThemeTransition 签名: (event, targetTheme, scheme?, onComplete?)
        playThemeTransition(event, nextTheme, undefined, () => {
          get().setTheme(nextTheme);
        });
      },
    }),
    {
      name: 'theme-storage',

      onRehydrateStorage: () => (state) => {
        // 当从本地存储恢复 theme 后，需要重新应用到 DOM 上（比如修改 html 的 class）
        if (state?.theme) {
          applyTheme(state.theme);
        }
        if (state?.font) {
          applyFont(state.font);
        }
      },

      partialize: (state) => ({
        theme: state.theme,
        font: state.font,
      }),
    },
  ),
);
