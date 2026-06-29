"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, ChevronLeft, PanelRightClose } from "lucide-react";
import { NAV_SECTIONS, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useShell();

  return (
    <aside
      aria-label="Sidebar navigation"
      className={cn(
        "flex flex-col min-h-screen shrink-0 border-r border-[var(--surface-border)] bg-[var(--surface-raised)] transition-all duration-200",
        "hidden lg:flex",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center border-b border-[var(--surface-border)] shrink-0",
          sidebarCollapsed ? "justify-center px-0 py-5" : "gap-2.5 px-5 py-5"
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 shrink-0">
          <Dumbbell size={16} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-sm tracking-tight text-[var(--foreground)] truncate">
            Fortress Fitness
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!sidebarCollapsed && (
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ label, href, icon: Icon, badge, disabled }) => {
                const active = isActivePath(pathname, href);
                const classes = cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                  sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                  disabled
                    ? "text-[var(--muted)] opacity-50 cursor-not-allowed"
                    : active
                      ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "text-[var(--muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--foreground)]"
                );

                const iconEl = (
                  <Icon
                    size={17}
                    className={cn(
                      "shrink-0",
                      active && !disabled
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-[var(--muted)]"
                    )}
                  />
                );

                const labelEl = !sidebarCollapsed && (
                  <span className="truncate">{label}</span>
                );

                const badgeEl = !sidebarCollapsed && badge && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-overlay)] text-[var(--muted)]">
                    {badge}
                  </span>
                );

                if (disabled) {
                  return (
                    <span key={href} className={classes} title={sidebarCollapsed ? label : undefined}>
                      {iconEl}
                      {labelEl}
                      {badgeEl}
                    </span>
                  );
                }

                return (
                  <Link
                    key={href}
                    href={href}
                    className={classes}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    {iconEl}
                    {labelEl}
                    {badgeEl}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 py-3 border-t border-[var(--surface-border)]">
        <button
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleSidebar}
          className={cn(
            "flex items-center w-full rounded-lg text-sm font-medium transition-all duration-150 text-[var(--muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--foreground)]",
            sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
          )}
        >
          {sidebarCollapsed ? (
            <PanelRightClose size={17} />
          ) : (
            <>
              <ChevronLeft size={17} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Trainer footer */}
      <div
        className={cn(
          "border-t border-[var(--surface-border)]",
          sidebarCollapsed ? "px-2 py-4" : "px-4 py-4"
        )}
      >
        <div
          className={cn(
            "flex items-center",
            sidebarCollapsed ? "justify-center" : "gap-2.5"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[var(--surface-overlay)] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[var(--muted)]">T</span>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--foreground)] truncate">
                Trainer
              </p>
              <p className="text-xs text-[var(--muted)] truncate">Pro Plan</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
