import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "app-theme";
const MANUAL_KEY = "app-theme-manual";

// Light from 06:00 to 17:59, dark from 18:00 to 05:59
const getThemeByTime = (): Theme => {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "light" : "dark";
};

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  try {
    const manual = localStorage.getItem(MANUAL_KEY);
    if (manual === "1") {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === "light" || stored === "dark") return stored;
    }
    return getThemeByTime();
  } catch {
    return getThemeByTime();
  }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  // Auto-switch theme based on real-time clock unless user has manually overridden.
  useEffect(() => {
    const isManual = () => {
      try { return localStorage.getItem(MANUAL_KEY) === "1"; } catch { return false; }
    };
    const tick = () => {
      if (isManual()) return;
      const next = getThemeByTime();
      setThemeState((prev) => (prev === next ? prev : next));
    };
    tick();
    const interval = window.setInterval(tick, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const markManual = () => {
    try { localStorage.setItem(MANUAL_KEY, "1"); } catch {}
  };
  const setTheme = (t: Theme) => { markManual(); setThemeState(t); };
  const toggleTheme = () => { markManual(); setThemeState((p) => (p === "light" ? "dark" : "light")); };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "light", toggleTheme: () => {}, setTheme: () => {} };
  }
  return ctx;
};
