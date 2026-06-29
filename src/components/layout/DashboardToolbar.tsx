import { cn } from "@/lib/utils";

interface DashboardToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardToolbar({
  children,
  className = "",
}: DashboardToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap",
        className
      )}
    >
      {children}
    </div>
  );
}
