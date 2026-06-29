import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardGrid } from "@/components/layout/DashboardGrid"
import { PulseLine } from "@/components/ui/LoadingState"

export default function AnalyticsLoading() {
  return (
    <PageContainer>
      <PageHeader title="Analytics" description="Loading business intelligence..." />

      {/* Section 1: KPI skeletons */}
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

      {/* Section 2: Client Health skeletons */}
      <Card>
        <CardHeader>
          <PulseLine className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Sections 3 + 4: Meal and Comms skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <PulseLine className="h-4 w-28" />
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
        <Card>
          <CardHeader>
            <PulseLine className="h-4 w-36" />
          </CardHeader>
          <CardContent>
            <DashboardGrid columns={3}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <PulseLine className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="space-y-1">
                    <PulseLine className="h-6 w-12" />
                    <PulseLine className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </DashboardGrid>
          </CardContent>
        </Card>
      </div>

      {/* Sections 5 + 6+7+8: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Timeline skeleton */}
        <Card>
          <CardHeader>
            <PulseLine className="h-4 w-32" />
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

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <PulseLine className="h-3 w-20" />
                    <PulseLine className="h-3 w-8" />
                  </div>
                  <PulseLine className="h-2 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-36" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <PulseLine className="h-5 w-12 rounded-full" />
                  <PulseLine className="h-3 flex-1" />
                  <PulseLine className="h-3 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
