import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ShellProvider } from "@/components/dashboard/shell-context";
import { createClient } from "@/utils/supabase/server";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: "admin" | "client" | "trainer" = "trainer";
  let displayName = "Trainer";
  const email = user?.email ?? "";

  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role) {
      role = profile.role;
    }
    if (profile?.full_name) {
      displayName = profile.full_name;
    } else if (typeof user.user_metadata?.display_name === "string") {
      displayName = user.user_metadata.display_name;
    }
  }

  const isAdmin = role === "admin";

  return (
    <ShellProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        <input
          id="dashboard-mobile-nav-open"
          type="checkbox"
          className="dashboard-mobile-nav-toggle sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        <Sidebar isAdmin={isAdmin} displayName={displayName} />
        <MobileNav isAdmin={isAdmin} displayName={displayName} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <DashboardHeader displayName={displayName} email={email} />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label="Dashboard content">
            <div className="flex-1">
              {children}
            </div>
            <footer className="mt-auto border-t border-[var(--surface-border)] bg-[var(--surface-raised)]">
              <div className="flex flex-col gap-3 px-4 py-3 text-xs text-[var(--muted)] sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
                <p>NutriRelay public information</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--foreground)]">
                    Privacy
                  </Link>
                  <Link href="/terms" className="underline underline-offset-2 hover:text-[var(--foreground)]">
                    Terms
                  </Link>
                  <Link href="/data-deletion" className="underline underline-offset-2 hover:text-[var(--foreground)]">
                    Data deletion
                  </Link>
                  <Link href="/contact" className="underline underline-offset-2 hover:text-[var(--foreground)]">
                    Contact
                  </Link>
                </div>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </ShellProvider>
  );
}
