import { DashboardGrid } from "@/components/layout/DashboardGrid";

interface MetricGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function MetricGroup({
  children,
  columns = 3,
  className = "",
}: MetricGroupProps) {
  return (
    <DashboardGrid columns={columns} className={className}>
      {children}
    </DashboardGrid>
  );
}
