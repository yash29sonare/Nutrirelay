"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { getNavSections, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

interface MobileNavProps {
  isAdmin: boolean;
  displayName: string;
}

export function MobileNav({ isAdmin, displayName }: MobileNavProps) {
  const pathname = usePathname();
  const { mobileNavOpen, closeMobileNav } = useShell();
  const navSections = getNavSections(isAdmin);

  if (!mobileNavOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-drawer)] lg:hidden">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden="true"
        onClick={closeMobileNav}
      />

      {/* Drawer */}
      <aside aria-label="Mobile navigation" className="fixed inset-y-0 left-0 w-72 max-w-[80vw] flex flex-col bg-[var(--surface-raised)] border-r border-[var(--surface-border)] z-10 shadow-xl animate-in slide-in-from-left">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-semibold text-sm tracking-tight text-[var(--foreground)]">
              NutriRelay
            </span>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMobileNav}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ label, href, icon: Icon, badge, disabled, description }) => {
                  const navKey = href === "#" ? label : href
                  const active = isActivePath(pathname, href);
                  const classes = cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    disabled
                      ? "text-[var(--muted)] opacity-50 cursor-not-allowed"
                      : active
                        ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                        : "text-[var(--muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--foreground)]"
                  );

                  const iconEl = (
                    <Icon
                      size={17}
                      className={
                        active && !disabled
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-[var(--muted)]"
                      }
                    />
                  );

                  if (disabled) {
                    return (
                      <span key={navKey} className={classes} title={description}>
                        {iconEl}
                        {label}
                        {badge && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-overlay)] text-[var(--muted)]">
                            {badge}
                          </span>
                        )}
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={navKey}
                      href={href}
                      onClick={closeMobileNav}
                      className={classes}
                      title={description}
                    >
                      {iconEl}
                      {label}
                      {badge && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-overlay)] text-[var(--muted)]">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Trainer footer — links to Settings */}
        <Link
          href="/dashboard/settings"
          onClick={closeMobileNav}
          className="block px-4 py-4 border-t border-[var(--surface-border)]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-overlay)] flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-[var(--muted)]">T</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--foreground)] truncate">
                {displayName}
              </p>
              <p className="text-xs text-[var(--muted)] truncate">Settings</p>
            </div>
          </div>
        </Link>
      </aside>
    </div>
  );
}
