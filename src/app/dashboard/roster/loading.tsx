import { Card, CardContent } from "@/components/ui/Card";

function PulseLine({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-[var(--surface-overlay)] ${className}`} />
  );
}

export default function RosterLoading() {
  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      <div className="space-y-1.5">
        <PulseLine className="h-6 w-36" />
        <PulseLine className="h-4 w-40" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <PulseLine className="flex-1 h-9 rounded-lg" />
        <PulseLine className="w-40 h-9 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-[var(--surface-border)] overflow-hidden">
        <div className="bg-[var(--surface-raised)] px-5 py-3 border-b border-[var(--surface-border)]">
          <div className="flex gap-8">
            {["Client", "Meals today", "Calories", "Status", "Actions"].map((col) => (
              <PulseLine key={col} className="h-3 w-16" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-8 px-5 py-3.5 border-b border-[var(--surface-border)]"
          >
            <PulseLine className="h-4 w-36" />
            <PulseLine className="h-4 w-8" />
            <PulseLine className="h-4 w-20" />
            <PulseLine className="h-5 w-20 rounded-md" />
            <PulseLine className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-between items-center pt-2">
        <PulseLine className="h-3 w-24" />
        <div className="flex gap-2">
          <PulseLine className="h-8 w-16 rounded-lg" />
          <PulseLine className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
