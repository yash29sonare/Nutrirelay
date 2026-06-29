import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { DashboardGrid } from "@/components/layout/DashboardGrid"
import { InlineNotice } from "@/components/ui/InlineNotice"
import { getEvents } from "@/lib/events/engagementEventStore"
import { getDashboardData } from "@/lib/operations/dashboard"
import { createClient } from "@/utils/supabase/server"
import { formatRelativeDate, formatDate } from "@/lib/format"
import {
  MessageSquare, Bell, Send, AlertTriangle, CheckCircle,
  Activity, Clock, TrendingUp, XCircle, ChevronRight,
  Search, HardDrive, History, Zap,
} from "lucide-react"
import Link from "next/link"
import { approveConversation, dismissConversation, snoozeConversation } from "@/app/dashboard/conversations/components/ConversationActions"
import { approveReminder, dismissReminder, snoozeReminder } from "./components/ReminderActions"
import { formatConversationReason, formatConversationPriority } from "@/lib/conversations/conversationFormatting"
import { formatReminderReason, formatReminderPriority } from "@/lib/reminders/reminderFormatting"
import type { EngagementEvent } from "@/types/engagement-events"

export const dynamic = "force-dynamic"

function todayCount(events: EngagementEvent[], type: string): number {
  const today = new Date().toISOString().slice(0, 10)
  return events.filter(
    (e) => e.event_type === type && e.created_at.slice(0, 10) === today,
  ).length
}

function totalCount(events: EngagementEvent[], type: string): number {
  return events.filter((e) => e.event_type === type).length
}

function computePendingConversations(events: EngagementEvent[]) {
  const planned = events.filter((e) => e.event_type === "CONVERSATION_PLANNED")
  const handled = new Set(
    events
      .filter((e) =>
        ["CONVERSATION_APPROVED", "CONVERSATION_DISMISSED", "CONVERSATION_SNOOZED"].includes(e.event_type),
      )
      .map((e) => e.payload?.["conversationId"] as string | undefined)
      .filter(Boolean),
  )
  return planned.filter((e) => !handled.has(e.payload?.["conversationId"] as string))
}

function computePendingReminders(events: EngagementEvent[]) {
  const planned = events.filter((e) => e.event_type === "REMINDER_PLANNED")
  const handled = new Set(
    events
      .filter((e) =>
        ["REMINDER_APPROVED", "REMINDER_DISMISSED", "REMINDER_SNOOZED"].includes(e.event_type),
      )
      .map((e) => e.payload?.["reminderId"] as string | undefined)
      .filter(Boolean),
  )
  return planned.filter((e) => !handled.has(e.payload?.["reminderId"] as string))
}

const COMM_EVENT_TYPES = new Set([
  "COMMUNICATION_QUEUED", "COMMUNICATION_SENT", "COMMUNICATION_FAILED",
  "AUTOMATION_STARTED", "AUTOMATION_COMPLETED", "AUTOMATION_FAILED",
  "CONVERSATION_APPROVED", "REMINDER_PLANNED",
])

const ACTIVITY_LABELS: Record<string, string> = {
  COMMUNICATION_QUEUED: "Message queued",
  COMMUNICATION_SENT: "Message sent",
  COMMUNICATION_FAILED: "Message failed",
  AUTOMATION_STARTED: "Automation started",
  AUTOMATION_COMPLETED: "Automation completed",
  AUTOMATION_FAILED: "Automation failed",
  CONVERSATION_APPROVED: "Conversation approved",
  REMINDER_PLANNED: "Reminder planned",
}

const ACTIVITY_VARIANTS: Record<string, "default" | "brand" | "success" | "warning" | "danger" | "info" | "outline"> = {
  COMMUNICATION_QUEUED: "info",
  COMMUNICATION_SENT: "success",
  COMMUNICATION_FAILED: "danger",
  AUTOMATION_STARTED: "info",
  AUTOMATION_COMPLETED: "success",
  AUTOMATION_FAILED: "danger",
  CONVERSATION_APPROVED: "success",
  REMINDER_PLANNED: "brand",
}

const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "default"> = {
  high: "danger",
  medium: "warning",
  low: "default",
}

function getRiskText(priority: string): string {
  switch (priority) {
    case "high": return "High priority"
    case "medium": return "Medium priority"
    default: return "Low priority"
  }
}

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const searchQuery = q?.trim()?.toLowerCase() ?? ""

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authUserId = user?.id ?? null

  if (!authUserId) {
    return (
      <PageContainer>
        <PageHeader title="Communications" description="Sign in to view the communication center." />
      </PageContainer>
    )
  }

  const result = await getDashboardData(authUserId)
  const clientNames = new Map<string, string>()
  if (result.success) {
    for (const c of result.data.clients) {
      clientNames.set(c.client_id, c.client_name)
    }
  }

  const allEvents = await getEvents(authUserId)
  const pendingConversations = computePendingConversations(allEvents)
  const pendingReminders = computePendingReminders(allEvents)
  const totalQueued = totalCount(allEvents, "COMMUNICATION_QUEUED")
  const totalFailed = totalCount(allEvents, "COMMUNICATION_FAILED")
  const sentToday = todayCount(allEvents, "COMMUNICATION_SENT")
  const failedToday = todayCount(allEvents, "COMMUNICATION_FAILED")
  const sentTotal = totalCount(allEvents, "COMMUNICATION_SENT")
  const successRate = sentTotal + totalFailed > 0
    ? Math.round((sentTotal / (sentTotal + totalFailed)) * 100)
    : 100
  const automationRuns = totalCount(allEvents, "AUTOMATION_COMPLETED")

  let activityEvents = allEvents.filter((e) => COMM_EVENT_TYPES.has(e.event_type))
  activityEvents.sort((a, b) => b.created_at.localeCompare(a.created_at))
  activityEvents = activityEvents.slice(0, 50)

  if (searchQuery) {
    activityEvents = activityEvents.filter((e) => {
      const clientName = e.client_id ? (clientNames.get(e.client_id) ?? "") : ""
      return clientName.toLowerCase().includes(searchQuery)
    })
  }

  const activityByDate = new Map<string, EngagementEvent[]>()
  for (const ev of activityEvents) {
    const dateKey = ev.created_at.slice(0, 10)
    const group = activityByDate.get(dateKey) ?? []
    group.push(ev)
    activityByDate.set(dateKey, group)
  }
  const sortedDates = [...activityByDate.keys()].sort((a, b) => b.localeCompare(a))

  async function handleConversationAction(formData: FormData) {
    "use server"
    const action = formData.get("action") as string
    const planId = formData.get("planId") as string
    const clientId = formData.get("clientId") as string

    let result
    if (action === "approve") result = await approveConversation(planId, clientId)
    else if (action === "dismiss") result = await dismissConversation(planId, clientId)
    else if (action === "snooze") result = await snoozeConversation(planId, clientId)
    if (result?.error) throw new Error(result.error)
  }

  async function handleReminderAction(formData: FormData) {
    "use server"
    const action = formData.get("action") as string
    const planId = formData.get("planId") as string
    const clientId = formData.get("clientId") as string

    let result
    if (action === "approve") result = await approveReminder(planId, clientId)
    else if (action === "dismiss") result = await dismissReminder(planId, clientId)
    else if (action === "snooze") result = await snoozeReminder(planId, clientId)
    if (result?.error) throw new Error(result.error)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Communications"
        description="Review and manage client communication plans and activity."
      />

      {/* Section 1: Communication Summary */}
      <DashboardSection title="Communication Summary">
        <DashboardGrid columns={4}>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--info)]/10 shrink-0">
                <MessageSquare size={15} className="text-[var(--info)]" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--foreground)] tabular-nums">
                  {pendingConversations.length}
                </p>
                <p className="text-xs text-[var(--muted)]">Pending conversations</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--warning)]/10 shrink-0">
                <Bell size={15} className="text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--foreground)] tabular-nums">
                  {pendingReminders.length}
                </p>
                <p className="text-xs text-[var(--muted)]">Pending reminders</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--success)]/10 shrink-0">
                <Send size={15} className="text-[var(--success)]" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--foreground)] tabular-nums">
                  {totalQueued}
                </p>
                <p className="text-xs text-[var(--muted)]">Queued messages</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--destructive)]/10 shrink-0">
                <XCircle size={15} className="text-[var(--destructive)]" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--foreground)] tabular-nums">
                  {totalFailed}
                </p>
                <p className="text-xs text-[var(--muted)]">Failed messages</p>
              </div>
            </CardContent>
          </Card>
        </DashboardGrid>
      </DashboardSection>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mt-6">
        {/* ── Left column ── */}
        <div className="space-y-8">
          {/* Section 2: Conversation Queue */}
          <DashboardSection
            title="Conversation Queue"
            description={pendingConversations.length === 0 ? "No pending conversations" : `${pendingConversations.length} pending`}
          >
            {pendingConversations.length > 0 ? (
              <div className="space-y-3">
                {pendingConversations.map((ev) => {
                  const payload = ev.payload ?? {}
                  const planId = payload["conversationId"] as string
                  const reason = payload["reason"] as string
                  const priority = payload["priority"] as string
                  const message = payload["message"] as string
                  const templateId = payload["templateId"] as string
                  const clientName = ev.client_id ? (clientNames.get(ev.client_id) ?? "") : ""

                  return (
                    <Card key={ev.event_id}>
                      <CardContent className="py-4 px-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-[var(--foreground)]">
                                {clientName || `Client ${ev.client_id?.slice(0, 8) ?? "unknown"}`}
                              </span>
                              <Badge variant={PRIORITY_VARIANT[priority] ?? "default"}>
                                {formatConversationPriority(priority as any) || getRiskText(priority)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                              <span>{formatConversationReason(reason as any) || reason}</span>
                              <span>·</span>
                              <span>{formatRelativeDate(ev.created_at)}</span>
                            </div>
                            {message && (
                              <p className="text-sm text-[var(--foreground)] mt-1">{message}</p>
                            )}
                            {templateId && (
                              <p className="text-xs text-[var(--muted)] mt-1">Template: {templateId}</p>
                            )}
                          </div>

                          <form action={handleConversationAction} className="flex items-center gap-1.5 shrink-0">
                            <input type="hidden" name="planId" value={planId} />
                            <input type="hidden" name="clientId" value={ev.client_id ?? ""} />
                            <button
                              type="submit"
                              name="action"
                              value="approve"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                            >
                              <CheckCircle size={12} />
                              Approve
                            </button>
                            <button
                              type="submit"
                              name="action"
                              value="snooze"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface-overlay)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-border)] transition-colors"
                            >
                              <Clock size={12} />
                              Snooze
                            </button>
                            <button
                              type="submit"
                              name="action"
                              value="dismiss"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface-overlay)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-border)] transition-colors"
                            >
                              <XCircle size={12} />
                              Dismiss
                            </button>
                          </form>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    icon={<MessageSquare size={16} />}
                    title="No pending conversations"
                    description="All conversation plans have been reviewed."
                  />
                </CardContent>
              </Card>
            )}
          </DashboardSection>

          {/* Section 3: Reminder Queue */}
          <DashboardSection
            title="Reminder Queue"
            description={pendingReminders.length === 0 ? "No pending reminders" : `${pendingReminders.length} pending`}
          >
            {pendingReminders.length > 0 ? (
              <div className="space-y-3">
                {pendingReminders.map((ev) => {
                  const payload = ev.payload ?? {}
                  const planId = payload["reminderId"] as string
                  const reason = payload["reason"] as string
                  const priority = payload["priority"] as string
                  const message = payload["message"] as string
                  const templateId = payload["templateId"] as string
                  const clientName = ev.client_id ? (clientNames.get(ev.client_id) ?? "") : ""

                  return (
                    <Card key={ev.event_id}>
                      <CardContent className="py-4 px-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-[var(--foreground)]">
                                {clientName || `Client ${ev.client_id?.slice(0, 8) ?? "unknown"}`}
                              </span>
                              <Badge variant={PRIORITY_VARIANT[priority] ?? "default"}>
                                {formatReminderPriority(priority as any) || getRiskText(priority)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                              <span>{formatReminderReason(reason as any) || reason}</span>
                              <span>·</span>
                              <span>{formatRelativeDate(ev.created_at)}</span>
                            </div>
                            {message && (
                              <p className="text-sm text-[var(--foreground)] mt-1">{message}</p>
                            )}
                            {templateId && (
                              <p className="text-xs text-[var(--muted)] mt-1">Template: {templateId}</p>
                            )}
                          </div>

                          <form action={handleReminderAction} className="flex items-center gap-1.5 shrink-0">
                            <input type="hidden" name="planId" value={planId} />
                            <input type="hidden" name="clientId" value={ev.client_id ?? ""} />
                            <button
                              type="submit"
                              name="action"
                              value="approve"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                            >
                              <CheckCircle size={12} />
                              Approve
                            </button>
                            <button
                              type="submit"
                              name="action"
                              value="snooze"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface-overlay)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-border)] transition-colors"
                            >
                              <Clock size={12} />
                              Snooze
                            </button>
                            <button
                              type="submit"
                              name="action"
                              value="dismiss"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface-overlay)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-border)] transition-colors"
                            >
                              <XCircle size={12} />
                              Dismiss
                            </button>
                          </form>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    icon={<Bell size={16} />}
                    title="No pending reminders"
                    description="All reminder plans have been reviewed."
                  />
                </CardContent>
              </Card>
            )}
          </DashboardSection>

          {/* Section 4: Communication Activity */}
          <DashboardSection
            title="Communication Activity"
            description={`${activityEvents.length} recent events`}
          >
            {sortedDates.length > 0 ? (
              <div className="space-y-6">
                {sortedDates.map((dateKey) => {
                  const items = activityByDate.get(dateKey)!
                  return (
                    <div key={dateKey}>
                      <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                        {formatDate(dateKey)}
                      </h3>
                      <div className="space-y-2">
                        {items.map((ev) => {
                          const label = ACTIVITY_LABELS[ev.event_type] ?? ev.event_type
                          const variant = ACTIVITY_VARIANTS[ev.event_type] ?? "default"
                          const clientName = ev.client_id
                            ? (clientNames.get(ev.client_id) ?? ev.client_id.slice(0, 8))
                            : ""

                          return (
                            <div
                              key={ev.event_id}
                              className="flex items-center gap-3 py-2 px-4 rounded-lg bg-[var(--surface-raised)] border border-[var(--surface-border)]"
                            >
                              <Badge variant={variant} className="shrink-0">{label}</Badge>
                              <span className="text-xs text-[var(--muted)] flex-1 truncate">
                                {clientName}
                              </span>
                              <span className="text-[10px] text-[var(--muted)] shrink-0 tabular-nums">
                                {formatRelativeDate(ev.created_at)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    icon={<Activity size={16} />}
                    title="No communication activity yet"
                  />
                </CardContent>
              </Card>
            )}
          </DashboardSection>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* Section 5: Client Search */}
          <DashboardSection title="Search">
            <Card>
              <CardContent className="py-4">
                <form method="GET" action="/dashboard/communications" className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      type="text"
                      name="q"
                      defaultValue={q ?? ""}
                      placeholder="Filter by client name..."
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-[var(--surface-border)] bg-[var(--surface-raised)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs font-medium rounded-md bg-[var(--surface-overlay)] text-[var(--foreground)] hover:bg-[var(--surface-border)] transition-colors border border-[var(--surface-border)]"
                  >
                    Search
                  </button>
                </form>
                {q && (
                  <Link
                    href="/dashboard/communications"
                    className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] mt-2"
                  >
                    <XCircle size={11} />
                    Clear filter
                  </Link>
                )}
              </CardContent>
            </Card>
          </DashboardSection>

          {/* Section 6: Metrics */}
          <DashboardSection title="Metrics">
            <Card>
              <CardContent className="space-y-4 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Total pending</span>
                  <span className="font-semibold text-[var(--foreground)] tabular-nums">
                    {pendingConversations.length + pendingReminders.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Sent today</span>
                  <span className="font-semibold text-[var(--success)] tabular-nums">
                    {sentToday}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Success rate</span>
                  <span className="font-semibold text-[var(--foreground)] tabular-nums">
                    {successRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Failures today</span>
                  <span className="font-semibold text-[var(--destructive)] tabular-nums">
                    {failedToday}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Automation runs</span>
                  <span className="font-semibold text-[var(--foreground)] tabular-nums">
                    {automationRuns}
                  </span>
                </div>
              </CardContent>
            </Card>
          </DashboardSection>

          {/* Section 7: Quick Actions */}
          <DashboardSection title="Quick Actions">
            <Card>
              <CardContent className="divide-y divide-[var(--surface-border)] py-1">
                <Link
                  href="/dashboard/conversations"
                  className="flex items-center gap-3 py-3 px-1 text-sm text-[var(--foreground)] hover:text-brand-500 transition-colors"
                >
                  <MessageSquare size={14} className="text-[var(--muted)] shrink-0" />
                  <span>Manage conversations</span>
                  <ChevronRight size={14} className="ml-auto text-[var(--muted)]" />
                </Link>
                <Link
                  href="/dashboard/clients"
                  className="flex items-center gap-3 py-3 px-1 text-sm text-[var(--foreground)] hover:text-brand-500 transition-colors"
                >
                  <History size={14} className="text-[var(--muted)] shrink-0" />
                  <span>Client roster</span>
                  <ChevronRight size={14} className="ml-auto text-[var(--muted)]" />
                </Link>
                <Link
                  href="/dashboard/events"
                  className="flex items-center gap-3 py-3 px-1 text-sm text-[var(--foreground)] hover:text-brand-500 transition-colors"
                >
                  <Activity size={14} className="text-[var(--muted)] shrink-0" />
                  <span>View all events</span>
                  <ChevronRight size={14} className="ml-auto text-[var(--muted)]" />
                </Link>
                <Link
                  href="/dashboard/engagement"
                  className="flex items-center gap-3 py-3 px-1 text-sm text-[var(--foreground)] hover:text-brand-500 transition-colors"
                >
                  <Zap size={14} className="text-[var(--muted)] shrink-0" />
                  <span>Engagement center</span>
                  <ChevronRight size={14} className="ml-auto text-[var(--muted)]" />
                </Link>
              </CardContent>
            </Card>
          </DashboardSection>
        </div>
      </div>
    </PageContainer>
  )
}
