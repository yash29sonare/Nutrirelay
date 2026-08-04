"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

type LandingTheme = "dark" | "light";

type LandingThemeContextValue = {
  theme: LandingTheme;
  toggleTheme: () => void;
};

const LandingThemeContext = createContext<LandingThemeContextValue | null>(null);
const STORAGE_KEY = "nutrirelay-landing-theme";

export function LandingThemeShell({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const [theme, setTheme] = useState<LandingTheme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  const value = useMemo<LandingThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        setTheme((current) => {
          const next = current === "dark" ? "light" : "dark";
          window.localStorage.setItem(STORAGE_KEY, next);
          return next;
        });
      },
    }),
    [theme],
  );

  return (
    <LandingThemeContext.Provider value={value}>
      <div className={className} data-landing-theme={theme}>
        {children}
      </div>
    </LandingThemeContext.Provider>
  );
}

export function LandingThemeToggle({ className = "" }: { className?: string }) {
  const context = useContext(LandingThemeContext);
  if (!context) return null;

  const isDark = context.theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch landing page to light mode" : "Switch landing page to dark mode"}
      onClick={context.toggleTheme}
      className={className}
    >
      {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
