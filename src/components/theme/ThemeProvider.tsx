"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("ff-theme") as Theme | null;
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(() => {
    const t = getStoredTheme();
    return t === "system" ? getSystemTheme() : t;
  });

  useEffect(() => {
    applyTheme(resolved);
  }, []);

  useEffect(() => {
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const r = e.matches ? "dark" : "light";
        setResolved(r);
        applyTheme(r);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  useEffect(() => {
    if (theme === "system") {
      const r = getSystemTheme();
      setResolved(r);
      applyTheme(r);
    } else {
      setResolved(theme);
      applyTheme(theme);
    }
    localStorage.setItem("ff-theme", theme);
  }, [theme]);

  const setThemeFn = useCallback((t: Theme) => setTheme(t), []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme: setThemeFn }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
