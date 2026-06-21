import { Card, CardContent } from "@/components/ui/Card";

function PulseLine({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-[var(--surface-overlay)] ${className}`} />
  );
}

export default function QueueLoading() {
  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      <div className="space-y-1.5">
        <PulseLine className="h-6 w-40" />
        <PulseLine className="h-4 w-32" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="w-10 h-10 rounded-xl animate-pulse bg-[var(--surface-overlay)] shrink-0" />
              <div className="space-y-1.5 flex-1">
                <PulseLine className="h-6 w-12" />
                <PulseLine className="h-3 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-[var(--surface-border)] overflow-hidden">
        <div className="bg-[var(--surface-raised)] px-5 py-3 border-b border-[var(--surface-border)]">
          <div className="flex gap-6">
            {["Client", "UTR Number", "Amount", "Submitted", "Receipt", "Actions"].map((col) => (
              <PulseLine key={col} className="h-3 w-16" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-5 py-4 border-b border-[var(--surface-border)]">
            <PulseLine className="h-4 w-28" />
            <PulseLine className="h-4 w-32" />
            <PulseLine className="h-4 w-16" />
            <PulseLine className="h-4 w-20" />
            <PulseLine className="h-4 w-12" />
            <PulseLine className="h-8 w-36 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
