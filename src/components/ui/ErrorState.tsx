import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 mb-3">
        <AlertTriangle size={18} className="text-red-500" />
      </div>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {description && <p className="text-sm text-[var(--muted)] mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
