import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

interface DashboardPanelProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardPanel({
  title,
  description,
  children,
  className = "",
}: DashboardPanelProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || description) && (
        <CardHeader className="space-y-0.5">
          {title && (
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs text-[var(--muted)]">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
