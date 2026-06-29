import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardGrid } from "@/components/layout/DashboardGrid"
import { PulseLine } from "@/components/ui/LoadingState"

export default function CommunicationsLoading() {
  return (
    <PageContainer>
      <PageHeader title="Communications" description="Review and manage client communication plans and activity." />

      {/* Summary skeleton */}
      <DashboardGrid columns={4}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-4">
              <PulseLine className="w-9 h-9 rounded-lg shrink-0" />
              <div className="space-y-1">
                <PulseLine className="h-5 w-10" />
                <PulseLine className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </DashboardGrid>

      {/* 2-column grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mt-6">
        {/* Left column */}
        <div className="space-y-8">
          {/* Conversation queue skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-36" />
            </CardHeader>
            <CardContent className="space-y-3 py-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-4 px-5 border border-[var(--surface-border)] rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <PulseLine className="h-4 w-28" />
                      <PulseLine className="h-5 w-16 rounded-full" />
                    </div>
                    <PulseLine className="h-3 w-40" />
                    <PulseLine className="h-3 w-56" />
                  </div>
                  <div className="flex gap-1.5">
                    <PulseLine className="h-7 w-16 rounded-md" />
                    <PulseLine className="h-7 w-16 rounded-md" />
                    <PulseLine className="h-7 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reminder queue skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-28" />
            </CardHeader>
            <CardContent className="py-8">
              <div className="flex flex-col items-center text-center space-y-2">
                <PulseLine className="w-8 h-8 rounded-full" />
                <PulseLine className="h-4 w-32" />
                <PulseLine className="h-3 w-48" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Search skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-16" />
            </CardHeader>
            <CardContent className="py-4">
              <PulseLine className="h-9 w-full rounded-md" />
            </CardContent>
          </Card>

          {/* Metrics skeleton */}
          <Card>
            <CardHeader>
              <PulseLine className="h-4 w-16" />
            </CardHeader>
            <CardContent className="space-y-4 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <PulseLine className="h-3 w-24" />
                  <PulseLine className="h-3 w-10" />
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
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <PulseLine className="w-5 h-5 shrink-0" />
                  <PulseLine className="h-3 w-28 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
