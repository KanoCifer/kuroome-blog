import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playThemeTransition } from '../utils/themeTransition';

type Theme = 'light' | 'dark' | 'system';
type FontFamily = 'default' | 'harmonyos';
type ColorScheme =
  | 'sky-blue'
  | 'forest-green'
  | 'paper'
  | 'sage'
  | 'mist'
  | 'blush'
  | 'spring'
  | 'autumn'
  | 'clear-sky'
  | 'midnight';
interface ThemeState {
  theme: Theme;
  font: FontFamily;
  scheme: ColorScheme;
  showFooter: boolean;
  setTheme: (theme: Theme) => void;
  setFont: (font: FontFamily) => void;
  setScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
  toggleThemeWithAnimation: (event: {
    clientX: number;
    clientY: number;
  }) => void;
  toggleFooter: () => void;
}

export type { Theme, FontFamily, ColorScheme };

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

const applyScheme = (newScheme: ColorScheme) => {
  document.documentElement.setAttribute('data-color-scheme', newScheme);
};

export const useThemeState = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      font: 'default',
      scheme: 'sky-blue',
      showFooter: localStorage.getItem('show-footer') !== 'false',

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      setFont: (font) => {
        applyFont(font);
        set({ font });
      },

      setScheme: (scheme) => {
        applyScheme(scheme);
        set({ scheme });
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

      toggleFooter: () => {
        const next = !get().showFooter;
        set({ showFooter: next });
        localStorage.setItem('show-footer', String(next));
      },
    }),
    {
      name: 'theme-storage',

      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
        if (state?.font) {
          applyFont(state.font);
        }
        applyScheme(state?.scheme ?? 'sky-blue');
      },

      partialize: (state) => ({
        theme: state.theme,
        font: state.font,
        scheme: state.scheme,
        showFooter: state.showFooter,
      }),
    },
  ),
);
