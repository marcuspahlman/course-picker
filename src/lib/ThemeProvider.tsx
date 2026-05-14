import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  STORAGE_KEY,
  ThemeContext,
  applyDocumentTheme,
  readStoredSetting,
  systemPrefersDark,
  type ThemeContextValue,
  type ThemeSetting,
} from "./theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [setting, setSettingState] = useState<ThemeSetting>(() =>
    readStoredSetting(),
  );
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    systemPrefersDark(),
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const effective: "light" | "dark" = useMemo(() => {
    if (setting === "system") return systemDark ? "dark" : "light";
    return setting;
  }, [setting, systemDark]);

  useEffect(() => {
    applyDocumentTheme(effective);
  }, [effective]);

  const setSetting = useCallback((s: ThemeSetting) => {
    setSettingState(s);
    if (s === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, s);
    }
  }, []);

  const toggle = useCallback(() => {
    setSettingState((prev) => {
      const next: ThemeSetting =
        prev === "system"
          ? systemDark
            ? "light"
            : "dark"
          : prev === "dark"
            ? "light"
            : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, [systemDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({ setting, effective, setSetting, toggle }),
    [setting, effective, setSetting, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
