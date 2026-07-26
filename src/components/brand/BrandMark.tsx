import { cn } from "@/lib/utils"

interface BrandMarkProps {
  className?: string
  label?: string
}

export function BrandMark({ className, label = "NutriRelay" }: BrandMarkProps) {
  return (
    <div
      aria-label={label}
      role="img"
      className={cn(
        "relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-[#12b857] shadow-[0_10px_28px_rgba(18,184,87,0.18)]",
        className,
      )}
    >
      <img
        aria-hidden="true"
        alt=""
        className="h-full w-full object-cover"
        src="/brand/nutrirelay-logo.png"
      />
    </div>
  )
}
