"use client";

import { Bell, Search, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useShell } from "./shell-context";
import { Breadcrumbs } from "./Breadcrumbs";

export function DashboardHeader() {
  const { toggleSidebar, openMobileNav } = useShell();

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[var(--surface-border)] bg-[var(--background)] shrink-0">
      {/* Left: mobile menu + breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open navigation"
          onClick={openMobileNav}
          className="flex lg:hidden items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-all duration-150"
        >
          <Menu size={17} />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-all duration-150"
        >
          <Menu size={17} />
        </button>

        {/* AI Live badge */}
        <span
          aria-label="AI pipelines live"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400"
        >
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"
          />
          AI Live
        </span>

        <div className="hidden md:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right: search, theme, notifications, avatar */}
      <div className="flex items-center gap-2">
        {/* Global search */}
        <button
          type="button"
          aria-label="Search"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[var(--muted)] border border-[var(--surface-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)] transition-colors"
        >
          <Search size={13} />
          <span>Search...</span>
          <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--surface-overlay)] text-[var(--muted)]">
            Ctrl+K
          </span>
        </button>

        <ThemeToggle />

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-all duration-150"
        >
          <Bell size={17} />
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"
          />
        </button>

        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-overlay)]">
          <span className="text-xs font-semibold text-[var(--muted)]">T</span>
        </div>
      </div>

      {/* Mobile breadcrumbs below */}
      <div className="md:hidden absolute top-14 left-4">
        <Breadcrumbs />
      </div>
    </header>
  );
}
