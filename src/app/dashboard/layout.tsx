import { Sidebar } from "@/components/dashboard/Sidebar";
import { Bell } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Persistent side navigation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top navigation bar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--surface-border)] bg-[var(--background)] shrink-0">
          {/* AI pipeline status badge */}
          <div className="flex items-center gap-2">
            <span
              aria-label="AI pipelines live"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400"
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"
              />
              AI Live
            </span>
          </div>

          <div className="flex items-center gap-3">
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

            <div className="w-8 h-8 rounded-full bg-[var(--surface-overlay)] flex items-center justify-center">
              <span className="text-xs font-semibold text-[var(--muted)]">T</span>
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
