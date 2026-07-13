"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Menu, MoonStar, Settings, User } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useShell } from "./shell-context";
import { Breadcrumbs } from "./Breadcrumbs";

interface DashboardHeaderProps {
  displayName: string;
  email: string;
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function DashboardHeader({ displayName, email }: DashboardHeaderProps) {
  const { toggleSidebar, openMobileNav } = useShell();
  const router = useRouter();
  const { resolved, setTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleSignOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function openSettings(anchor?: string) {
    setProfileOpen(false);
    router.push(anchor ? `/dashboard/settings${anchor}` : "/dashboard/settings");
  }

  return (
    <header
      ref={headerRef}
      className="relative flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--background)] px-4 py-3 shrink-0 md:px-6"
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={openMobileNav}
          className="flex lg:hidden items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-all duration-150"
        >
          <Menu size={17} />
        </button>

        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-all duration-150"
        >
          <Menu size={17} />
        </button>

        <div className="hidden md:block">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-all duration-150"
            title="Notifications"
          >
            <Bell size={17} />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-10 z-20 w-72 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3 shadow-xl">
              <p className="text-sm font-semibold text-[var(--foreground)]">Notifications</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                No notifications yet. Operational alerts and delivery issues will appear here.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    router.push("/dashboard/events");
                  }}
                  className="inline-flex items-center rounded-md bg-[var(--surface-overlay)] px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-border)]"
                >
                  Events
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    router.push("/dashboard/communications");
                  }}
                  className="inline-flex items-center rounded-md bg-[var(--surface-overlay)] px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface-border)]"
                >
                  Communications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-overlay)] hover:bg-[var(--surface-border)] transition-colors"
            title={displayName}
          >
            <span className="text-xs font-semibold text-[var(--muted)]">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-10 z-20 w-72 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3 shadow-xl">
              <div className="border-b border-[var(--surface-border)] pb-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">{displayName}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{email}</p>
              </div>

              <div className="mt-3 space-y-1">
                <button
                  type="button"
                  onClick={() => openSettings("#profile")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-overlay)]"
                >
                  <User size={15} />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => openSettings()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-overlay)]"
                >
                  <Settings size={15} />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-overlay)]"
                >
                  <MoonStar size={15} />
                  Theme
                  <span className="ml-auto text-xs text-[var(--muted)] capitalize">{resolved}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden absolute top-14 left-4">
        <Breadcrumbs />
      </div>
    </header>
  );
}
