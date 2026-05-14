import { createContext, useContext } from "react";

export type ThemeSetting = "system" | "light" | "dark";

export type ThemeContextValue = {
  setting: ThemeSetting;
  effective: "light" | "dark";
  setSetting: (s: ThemeSetting) => void;
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const STORAGE_KEY = "course-picker-theme";

export function readStoredSetting(): ThemeSetting {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyDocumentTheme(effective: "light" | "dark") {
  const root = document.documentElement;
  if (effective === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}
