import { Card, CardContent, CardHeader } from "@/components/ui/Card";

function PulseLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--surface-overlay)] ${className}`}
    />
  );
}

export default function ClientDetailLoading() {
  return (
    <div className="px-6 py-6 space-y-6 max-w-4xl">
      {/* Back nav skeleton */}
      <PulseLine className="h-4 w-32" />

      {/* Header skeleton */}
      <div className="space-y-1.5">
        <PulseLine className="h-6 w-48" />
        <PulseLine className="h-4 w-64" />
      </div>

      {/* Macro progress skeleton */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <PulseLine className="h-3 w-24" />
                <PulseLine className="h-3 w-16" />
              </div>
              <PulseLine className="h-2 w-full" />
              <PulseLine className="h-3 w-8 ml-auto" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Food log table skeleton */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-28" />
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-border)]">
                {["Time", "Description", "kcal", "P", "C", "F"].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--surface-border)]">
                  <td className="px-5 py-3"><PulseLine className="h-3 w-12" /></td>
                  <td className="px-5 py-3"><PulseLine className="h-3 w-40" /></td>
                  <td className="px-5 py-3"><PulseLine className="h-3 w-10" /></td>
                  <td className="px-5 py-3"><PulseLine className="h-3 w-8" /></td>
                  <td className="px-5 py-3"><PulseLine className="h-3 w-8" /></td>
                  <td className="px-5 py-3"><PulseLine className="h-3 w-8" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
