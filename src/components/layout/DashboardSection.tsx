import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  description,
  actions,
  children,
  className = "",
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-4", className)} aria-label={title}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            {title && (
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-[var(--muted)]">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
