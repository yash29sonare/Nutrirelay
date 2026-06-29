import { Card, CardContent } from "@/components/ui/Card"
import { PulseLine } from "@/components/ui/LoadingState"

export function ConversationLoading() {
  return (
    <div className="space-y-6">
      <PulseLine className="h-5 w-40" />

      <Card>
        <CardContent className="py-3 px-5">
          <div className="flex gap-6">
            <PulseLine className="h-4 w-16" />
            <PulseLine className="h-4 w-24" />
            <PulseLine className="h-4 w-16" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1.5">
        <PulseLine className="h-6 w-12 rounded-md" />
        <PulseLine className="h-6 w-20 rounded-md" />
        <PulseLine className="h-6 w-16 rounded-md" />
        <PulseLine className="h-6 w-14 rounded-md" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <PulseLine className="h-4 w-32" />
                    <PulseLine className="h-5 w-14 rounded-full" />
                  </div>
                  <PulseLine className="h-3 w-48" />
                  <PulseLine className="h-3 w-full" />
                </div>
                <div className="flex gap-1.5">
                  <PulseLine className="h-8 w-20 rounded-lg" />
                  <PulseLine className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
