"use client"

import { useTransition } from "react"
import type { ConversationPlan } from "@/types/conversation"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { formatRelativeDate } from "@/lib/format"
import { formatConversationReason, formatConversationPriority } from "@/lib/conversations/conversationFormatting"
import { approveConversation, dismissConversation, snoozeConversation } from "./ConversationActions"
import { CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react"

const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "default"> = {
  high: "danger",
  medium: "warning",
  low: "default",
}

interface ConversationCardProps {
  plan: ConversationPlan
  clientName?: string
  onAction: () => void
}

export function ConversationCard({ plan, clientName, onAction }: ConversationCardProps) {
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await approveConversation(plan.id, plan.context.clientId)
      if (!result.error) onAction()
    })
  }

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissConversation(plan.id, plan.context.clientId)
      if (!result.error) onAction()
    })
  }

  function handleSnooze() {
    startTransition(async () => {
      const result = await snoozeConversation(plan.id, plan.context.clientId)
      if (!result.error) onAction()
    })
  }

  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {clientName ?? `Client ${plan.context.clientId.slice(0, 8)}`}
              </span>
              <Badge variant={PRIORITY_VARIANT[plan.priority]}>
                {formatConversationPriority(plan.priority)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span>{formatConversationReason(plan.reason)}</span>
              <span>·</span>
              <span>{formatRelativeDate(plan.createdAt)}</span>
            </div>
            <p className="text-sm text-[var(--foreground)] mt-1">
              {plan.message}
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-1">
              <span>Template: {plan.templateId}</span>
              {plan.context.mealType && (
                <>
                  <span>·</span>
                  <span>Meal: {plan.context.mealType}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="brand"
              size="sm"
              icon={<CheckCircle size={13} />}
              loading={isPending}
              onClick={handleApprove}
            >
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Clock size={13} />}
              loading={isPending}
              onClick={handleSnooze}
            >
              Snooze
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<XCircle size={13} />}
              loading={isPending}
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
