import type { ConversationPlan } from "@/types/conversation"
import { Card, CardContent } from "@/components/ui/Card"

interface ConversationSummaryProps {
  total: number
  highPriority: number
  uniqueClients: number
}

export function ConversationSummary({ total, highPriority, uniqueClients }: ConversationSummaryProps) {
  return (
    <Card>
      <CardContent className="py-3 px-5">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--muted)]">Total</span>
            <span className="font-semibold text-[var(--foreground)] tabular-nums">{total}</span>
          </div>
          {highPriority > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--muted)]">High priority</span>
              <span className="font-semibold text-[var(--destructive)] tabular-nums">{highPriority}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--muted)]">Clients</span>
            <span className="font-semibold text-[var(--foreground)] tabular-nums">{uniqueClients}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
