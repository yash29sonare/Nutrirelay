import { cn } from "@/lib/utils";

interface DashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const COLUMN_CLASSES: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

export function DashboardGrid({
  children,
  columns = 3,
  className = "",
}: DashboardGridProps) {
  return (
    <div className={cn("grid gap-4", COLUMN_CLASSES[columns], className)}>
      {children}
    </div>
  );
}
