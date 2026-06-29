import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  icon?: React.ReactNode;
  value: string | number;
  label: string;
  trend?: { value: string; positive: boolean };
  iconBg?: string;
  iconColor?: string;
  className?: string;
}

export function StatCard({
  icon,
  value,
  label,
  trend,
  iconBg = "bg-brand-500/10",
  iconColor = "text-brand-500",
  className = "",
}: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="flex items-center gap-4 py-5">
        {icon && (
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
              iconBg
            )}
          >
            <span className={iconColor}>{icon}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-2xl font-bold text-[var(--foreground)] leading-none">
            {value}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
          {trend && (
            <p
              className={cn(
                "text-xs mt-0.5",
                trend.positive ? "text-[var(--success)]" : "text-[var(--destructive)]"
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
