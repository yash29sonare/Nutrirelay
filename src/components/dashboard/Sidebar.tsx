"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Mic,
  CreditCard,
  BarChart3,
  Settings,
  Dumbbell,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Voice Notes", href: "/dashboard/voice-notes", icon: Mic },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen shrink-0 border-r border-[var(--surface-border)] bg-[var(--surface-raised)]">
      {/* Brand mark */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--surface-border)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500">
          <Dumbbell size={16} className="text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight text-[var(--foreground)]">
          Fortress Fitness
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${
                  isActive
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    : "text-[var(--muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--foreground)]"
                }
              `.trim()}
            >
              <Icon
                size={17}
                className={
                  isActive
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-[var(--muted)]"
                }
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — trainer identity stub */}
      <div className="px-4 py-4 border-t border-[var(--surface-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--surface-overlay)] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[var(--muted)]">T</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--foreground)] truncate">
              Trainer
            </p>
            <p className="text-xs text-[var(--muted)] truncate">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
