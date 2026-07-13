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
        "relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-[#9bdcff]/35 bg-[#090b0d] shadow-[0_10px_28px_rgba(89,174,216,0.14)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[#0c1114]"
      />
      <span
        aria-hidden="true"
        className="absolute left-[0.42rem] top-[0.48rem] h-3.5 w-3.5 rounded-full border border-white/86"
      />
      <span
        aria-hidden="true"
        className="absolute right-[0.62rem] top-[0.48rem] h-4 w-[0.22rem] rotate-[14deg] rounded-full bg-[#9bdcff]"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-[0.48rem] left-[0.52rem] h-[0.42rem] w-[0.95rem] rounded-b-full border-x border-b border-white/76"
      />
    </div>
  )
}
