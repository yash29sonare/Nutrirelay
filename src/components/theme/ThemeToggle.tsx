"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-all duration-150"
    >
      {resolved === "dark" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
