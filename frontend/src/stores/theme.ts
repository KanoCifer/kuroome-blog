import { defineStore } from "pinia";
import { ref, watch } from "vue";

export type Theme = "light" | "dark" | "system";

export const useThemeStore = defineStore("theme", () => {
  const theme = ref<Theme>((localStorage.getItem("theme") as Theme) || "system");

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    const isDark =
      newTheme === "dark" || (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (newTheme === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", newTheme);
    }
  };

  // Watch for theme changes
  watch(theme, (newTheme) => {
    applyTheme(newTheme);
  });

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = () => {
    if (theme.value === "system") {
      applyTheme("system");
    }
  };

  // Apply theme immediately
  applyTheme(theme.value);
  mediaQuery.addEventListener("change", handleSystemChange);

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
  };

  // Cleanup listener on unmount
  const _cleanup = () => {
    mediaQuery.removeEventListener("change", handleSystemChange);
  };

  const toggleTheme = () => {
    if (theme.value === "light") {
      setTheme("dark");
    } else if (theme.value === "dark") {
      setTheme("light");
    } else {
      // If system, toggle based on current system preference
      const isCurrentlyDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isCurrentlyDark ? "light" : "dark");
    }
  };

  return {
    theme,
    setTheme,
    toggleTheme,
  };
});
