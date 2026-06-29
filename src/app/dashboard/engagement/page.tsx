import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { EngagementFeed } from "@/app/dashboard/components/EngagementFeed"
import { getDashboardData } from "@/lib/operations/dashboard"
import { generateDashboardInsights } from "@/lib/insights/dashboardInsights"
import { generateActionQueue } from "@/lib/engagement/engagementEngine"
import { buildEngagementState, filterByProjection } from "@/lib/engagement/engagementProjection"
import { getTrainerDailyFeed } from "@/lib/engagement/getTrainerDailyFeed"
import { getEvents, appendEvents } from "@/lib/events/engagementEventStore"
import { getActionKey } from "@/lib/engagement/actionKey"
import { createClient } from "@/utils/supabase/server"
import { Zap } from "lucide-react"

export default async function EngagementPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const trainerId = user?.id ?? null

  if (!trainerId) {
    return (
      <PageContainer>
        <PageHeader title="Engagement" description="Action center for trainer recommendations." />
        <Card className="py-12">
          <EmptyState
            icon={<Zap size={18} className="text-[var(--muted)]" />}
            title="Sign in to view your engagement feed"
          />
        </Card>
      </PageContainer>
    )
  }

  const result = await getDashboardData(trainerId)

  if (!result.success) {
    const message =
      result.error.code === "TRAINER_NOT_FOUND"
        ? "Your trainer profile is being set up."
        : "Unable to load engagement data. Please try again."

    return (
      <PageContainer>
        <PageHeader title="Engagement" description="Action center for trainer recommendations." />
        <Card className="py-12">
          <EmptyState
            icon={<Zap size={18} className="text-[var(--muted)]" />}
            title={message}
          />
        </Card>
      </PageContainer>
    )
  }

  // ── Full event-sourced action pipeline ────────────────
  const dto = result.data
  const insights = generateDashboardInsights(dto)
  const events = await getEvents(trainerId)
  const projection = buildEngagementState(events)
  const runtimeActions = generateActionQueue(dto, insights)
  const filtered = filterByProjection(runtimeActions, projection, trainerId)

  // Append events for new actions
  const newActions = filtered.filter((a) => a.id.startsWith("action-"))
  if (newActions.length > 0) {
    const eventInputs = newActions.map((a) => ({
      client_id: a.clientId || null,
      action_id: null,
      event_type: "ACTION_CREATED" as const,
      event_id: `created:${getActionKey(trainerId, a.clientId, a.type, a.reason)}`,
      payload: {
        actionKey: getActionKey(trainerId, a.clientId, a.type, a.reason),
        type: a.type,
        reason: a.reason,
        priority: a.priority,
        confidence: a.confidence,
      },
    }))
    await appendEvents(trainerId, eventInputs)
  }

  const feed = getTrainerDailyFeed(filtered)
  const total = feed.highPriority.length + feed.mediumPriority.length + feed.lowPriority.length

  return (
    <PageContainer>
      <PageHeader
        title="Engagement"
        description={
          total > 0
            ? `${total} action${total !== 1 ? "s" : ""} for your attention`
            : "No pending actions — everything is on track"
        }
      />
      {total === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={<Zap size={18} className="text-[var(--muted)]" />}
            title="No pending actions"
            description="All clients are on track. New actions will appear here when attention is needed."
          />
        </Card>
      ) : (
        <EngagementFeed feed={feed} />
      )}
    </PageContainer>
  )
}
