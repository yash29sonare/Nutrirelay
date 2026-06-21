import { Card, CardContent, CardHeader } from "@/components/ui/Card";

function PulseLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--surface-overlay)] ${className}`}
    />
  );
}

function SkeletonMetricCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-6">
        {/* Ring placeholder */}
        <div className="w-[88px] h-[88px] rounded-full animate-pulse bg-[var(--surface-overlay)]" />
        <div className="flex flex-col items-center gap-1.5 w-full">
          <PulseLine className="h-5 w-16" />
          <PulseLine className="h-3 w-20" />
          <PulseLine className="h-3 w-14" />
        </div>
        <div className="w-full space-y-1 mt-1">
          <div className="flex justify-between">
            <PulseLine className="h-3 w-4" />
            <PulseLine className="h-3 w-20" />
          </div>
          <PulseLine className="h-1.5 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonTableRow() {
  return (
    <tr className="border-b border-[var(--surface-border)]">
      <td className="px-5 py-3">
        <PulseLine className="h-4 w-48" />
      </td>
      <td className="px-5 py-3">
        <PulseLine className="h-5 w-16 rounded-md" />
      </td>
      <td className="px-5 py-3">
        <PulseLine className="h-4 w-16" />
      </td>
      <td className="px-5 py-3">
        <PulseLine className="h-4 w-10" />
      </td>
      <td className="px-5 py-3">
        <PulseLine className="h-4 w-10" />
      </td>
      <td className="px-5 py-3">
        <PulseLine className="h-4 w-10" />
      </td>
      <td className="px-5 py-3">
        <PulseLine className="h-4 w-12" />
      </td>
    </tr>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="px-6 py-6 space-y-8 max-w-6xl">
      {/* Page heading skeleton */}
      <div className="space-y-1.5">
        <PulseLine className="h-6 w-32" />
        <PulseLine className="h-4 w-52" />
      </div>

      {/* Stat strip skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="w-10 h-10 rounded-xl animate-pulse bg-[var(--surface-overlay)] shrink-0" />
              <div className="space-y-1.5 flex-1">
                <PulseLine className="h-6 w-10" />
                <PulseLine className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metric cards skeleton */}
      <div>
        <PulseLine className="h-4 w-40 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetricCard key={i} />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-36" />
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-border)]">
                {["Item", "Category", "Calories", "Protein", "Carbs", "Fat", "Time"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-5 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonTableRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
