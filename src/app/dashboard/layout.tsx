import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ShellProvider } from "@/components/dashboard/shell-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ShellProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        <Sidebar />
        <MobileNav />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto" aria-label="Dashboard content">{children}</main>
        </div>
      </div>
    </ShellProvider>
  );
}
