import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { PulseLine } from "@/components/ui/LoadingState";

export default function ClientDetailLoading() {
  return (
    <PageContainer>
      {/* Back nav skeleton */}
      <PulseLine className="h-4 w-32" />

      {/* Client Overview skeleton */}
      <div className="flex items-start gap-4 py-5">
        <PulseLine className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <PulseLine className="h-5 w-40" />
          <PulseLine className="h-4 w-56" />
        </div>
      </div>

      {/* 2-column grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Attention Required skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-4">
                    <PulseLine className="w-8 h-8 rounded-lg shrink-0" />
                    <div className="space-y-1 flex-1">
                      <PulseLine className="h-4 w-16" />
                      <PulseLine className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-32" />
            </CardHeader>
            <CardContent className="py-5 px-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 pb-6">
                  <PulseLine className="w-7 h-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <PulseLine className="h-4 w-48" />
                    <PulseLine className="h-3 w-64" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Meal history skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-28" />
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--surface-border)]">
                    {["Type", "Time", "kcal", "P", "C", "F", "Status"].map((col) => (
                      <th key={col} className="px-5 py-2.5">
                        <PulseLine className="h-3 w-10" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--surface-border)]">
                      <td className="px-5 py-3"><PulseLine className="h-3 w-12" /></td>
                      <td className="px-5 py-3"><PulseLine className="h-3 w-16" /></td>
                      <td className="px-5 py-3"><PulseLine className="h-3 w-10" /></td>
                      <td className="px-5 py-3"><PulseLine className="h-3 w-8" /></td>
                      <td className="px-5 py-3"><PulseLine className="h-3 w-8" /></td>
                      <td className="px-5 py-3"><PulseLine className="h-3 w-8" /></td>
                      <td className="px-5 py-3"><PulseLine className="h-3 w-14" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Macros skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-28" />
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

          {/* Upcoming communication skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-36" />
            </CardHeader>
            <CardContent className="space-y-3 py-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <PulseLine className="w-7 h-7 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1">
                    <PulseLine className="h-3 w-32" />
                    <PulseLine className="h-2 w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick actions skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <PulseLine className="w-5 h-5 shrink-0" />
                  <PulseLine className="h-3 w-28 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
