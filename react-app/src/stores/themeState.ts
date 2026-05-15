import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playThemeTransition } from '../utils/themeTransition';

type Theme = 'light' | 'dark' | 'system';
interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleThemeWithAnimation: (event: React.MouseEvent | MouseEvent) => void;
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

export const useThemeState = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        // 复用 setTheme
        get().setTheme(currentTheme === 'light' ? 'dark' : 'light');
      },

      toggleThemeWithAnimation: (event: React.MouseEvent | MouseEvent) => {
        const currentTheme = get().theme;
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';

        playThemeTransition(event, nextTheme, () => {
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
      },

      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
