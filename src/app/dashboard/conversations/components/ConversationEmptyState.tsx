import { Card, CardContent } from "@/components/ui/Card"
import { MessageSquare } from "lucide-react"

export function ConversationEmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface-overlay)] mx-auto">
          <MessageSquare size={18} className="text-[var(--muted)]" />
        </div>
        <p className="text-sm font-medium text-[var(--foreground)]">
          All conversations handled
        </p>
        <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
          No pending conversations. New plans will appear here when the system identifies actions requiring trainer attention.
        </p>
      </CardContent>
    </Card>
  )
}
