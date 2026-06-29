import { cn } from "@/lib/utils"

type NoticeVariant = "error" | "success" | "warning" | "info"

interface InlineNoticeProps {
  variant?: NoticeVariant
  children: React.ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<NoticeVariant, string> = {
  error: "text-red-500",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
}

export function InlineNotice({ variant = "error", children, className = "" }: InlineNoticeProps) {
  return (
    <p
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      className={cn("text-xs", VARIANT_CLASSES[variant], className)}
    >
      {children}
    </p>
  )
}
