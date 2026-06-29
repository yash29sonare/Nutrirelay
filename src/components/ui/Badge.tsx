import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--surface-overlay)] text-[var(--muted)] border border-[var(--surface-border)]",
  brand:
    "bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20",
  success:
    "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20",
  warning:
    "bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20",
  danger:
    "bg-[var(--destructive)]/10 text-[var(--destructive)] border border-[var(--destructive)]/20",
  info:
    "bg-[var(--info)]/10 text-[var(--info)] border border-[var(--info)]/20",
  outline:
    "bg-transparent text-[var(--foreground)] border border-[var(--surface-border)]",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
