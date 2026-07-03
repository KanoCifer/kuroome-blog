import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playThemeTransition } from '../utils/themeTransition';

type Theme = 'light' | 'dark' | 'system';
type FontFamily = 'default' | 'harmonyos';
type ColorScheme = 'paper' | 'sage' | 'mist' | 'blush';

const COLOR_SCHEMES: readonly ColorScheme[] = [
  'paper',
  'sage',
  'mist',
  'blush',
];

const isColorScheme = (v: unknown): v is ColorScheme =>
  typeof v === 'string' && (COLOR_SCHEMES as readonly string[]).includes(v);

const safeScheme = (v: unknown): ColorScheme =>
  isColorScheme(v) ? v : 'paper';
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
  if (!isColorScheme(newScheme)) return;
  document.documentElement.setAttribute('data-color-scheme', newScheme);
};

export const useThemeState = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      font: 'default',
      scheme: 'paper',
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
        if (!isColorScheme(scheme)) return;
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
        applyScheme(safeScheme(state?.scheme));
      },

      partialize: (state) => ({
        theme: state.theme,
        font: state.font,
        scheme: state.scheme,
        showFooter: state.showFooter,
      }),

      // Storage written by older versions may contain a removed scheme
      // (e.g. sky-blue, autumn). Coerce it back to the new default so the
      // rehydrated value always lands in the current union.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ThemeState>;
        return {
          ...current,
          ...p,
          scheme: safeScheme(p.scheme ?? current.scheme),
        };
      },
    },
  ),
);
