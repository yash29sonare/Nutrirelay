import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      {icon && (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface-overlay)] mb-3">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {description && <p className="text-sm text-[var(--muted)] mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
