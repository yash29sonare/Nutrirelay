import { cn } from "@/lib/utils"

interface LoadingStateProps {
  className?: string
}

function PulseLine({ className = "" }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-[var(--surface-overlay)]", className)} />
  )
}

export function LoadingState({ className = "" }: LoadingStateProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-1.5">
        <PulseLine className="h-6 w-40" />
        <PulseLine className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[var(--surface-raised)] border border-[var(--surface-border)] p-5 flex items-center gap-4">
            <PulseLine className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <PulseLine className="h-6 w-12" />
              <PulseLine className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
      <PulseLine className="h-4 w-48" />
      <div className="space-y-2">
        <PulseLine className="h-16 w-full rounded-xl" />
        <PulseLine className="h-16 w-full rounded-xl" />
        <PulseLine className="h-16 w-3/4 rounded-xl" />
      </div>
    </div>
  )
}

export { PulseLine }
