import { Card, CardContent } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { PulseLine } from "@/components/ui/LoadingState";

export default function VoiceNotesLoading() {
  return (
    <PageContainer className="max-w-5xl">
      <div className="space-y-1.5">
        <PulseLine className="h-6 w-48" />
        <PulseLine className="h-4 w-56" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="w-10 h-10 rounded-xl animate-pulse bg-[var(--surface-overlay)] shrink-0" />
              <div className="space-y-1.5 flex-1">
                <PulseLine className="h-6 w-10" />
                <PulseLine className="h-3 w-36" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Note card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-4 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg animate-pulse bg-[var(--surface-overlay)]" />
                <div className="space-y-1.5">
                  <PulseLine className="h-4 w-32" />
                  <PulseLine className="h-3 w-24" />
                </div>
              </div>
              <PulseLine className="h-8 w-20 rounded-md" />
            </div>
            <PulseLine className="h-10 w-full rounded-lg" />
            <PulseLine className="h-20 w-full rounded-lg" />
            <PulseLine className="h-9 w-36 rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </PageContainer>
  );
}
