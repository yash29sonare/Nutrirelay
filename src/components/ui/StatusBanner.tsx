import { AlertTriangle, CheckCircle, Info, AlertOctagon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusBannerProps {
  children: React.ReactNode
  className?: string
}

export function ErrorBanner({ children, className = "" }: StatusBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500",
        className
      )}
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

export function SuccessBanner({ children, className = "" }: StatusBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-sm text-[var(--success)]",
        className
      )}
    >
      <CheckCircle size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

export function WarningBanner({ children, className = "" }: StatusBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-sm text-[var(--warning)]",
        className
      )}
    >
      <AlertOctagon size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

export function InfoBanner({ children, className = "" }: StatusBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[var(--info)]/10 border border-[var(--info)]/20 text-sm text-[var(--info)]",
        className
      )}
    >
      <Info size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}
