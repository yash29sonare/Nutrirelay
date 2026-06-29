import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardGrid } from "@/components/layout/DashboardGrid"
import { PulseLine } from "@/components/ui/LoadingState"

export default function ReportsLoading() {
  return (
    <PageContainer>
      <PageHeader title="Reports" description="Loading report data..." />

      {/* Section 1: Summary grid */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <DashboardGrid columns={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <PulseLine className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1">
                  <PulseLine className="h-6 w-12" />
                  <PulseLine className="h-3 w-24" />
                </div>
              </div>
            ))}
          </DashboardGrid>
          <div className="mt-3">
            <DashboardGrid columns={4}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i + 4} className="flex items-center gap-4 py-2">
                  <PulseLine className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="space-y-1">
                    <PulseLine className="h-6 w-12" />
                    <PulseLine className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </DashboardGrid>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Business Snapshot */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3 p-4 border border-[var(--surface-border)] rounded-xl">
                <PulseLine className="h-3 w-24" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <PulseLine className="h-3 w-20" />
                    <PulseLine className="h-3 w-10" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Client Health */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <PulseLine className="h-4 w-32" />
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <PulseLine className="h-3 w-24" />
                    <PulseLine className="h-3 w-8" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Meal Report */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <DashboardGrid columns={3}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <PulseLine className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1">
                  <PulseLine className="h-6 w-12" />
                  <PulseLine className="h-3 w-20" />
                </div>
              </div>
            ))}
          </DashboardGrid>
        </CardContent>
      </Card>

      {/* Section 5: Communication Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <PulseLine className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between py-2">
                <PulseLine className="h-3 w-24" />
                <PulseLine className="h-3 w-10" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <PulseLine className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between py-2">
                <PulseLine className="h-3 w-24" />
                <PulseLine className="h-3 w-10" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Section 6: Recent Activity */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-28" />
        </CardHeader>
        <CardContent className="space-y-4">
          <PulseLine className="h-3 w-20" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <PulseLine className="w-6 h-6 rounded-full shrink-0" />
              <PulseLine className="h-4 w-20 rounded-full" />
              <PulseLine className="h-3 flex-1" />
              <PulseLine className="h-3 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 7: Export Center */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 py-4">
                <PulseLine className="w-10 h-10 rounded-xl" />
                <PulseLine className="h-4 w-24" />
                <PulseLine className="h-3 w-32" />
                <PulseLine className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
