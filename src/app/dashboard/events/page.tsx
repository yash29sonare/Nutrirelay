import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { EmptyState } from "@/components/ui/EmptyState"
import { Select } from "@/components/ui/Select"
import { Pagination } from "@/components/ui/Pagination"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { FilterBar } from "@/components/layout/FilterBar"
import { getEvents } from "@/lib/events/engagementEventStore"
import { createClient } from "@/utils/supabase/server"
import { formatDateTime } from "@/lib/format"
import { Activity, HardDrive, Search, X } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface EventsPageProps {
  searchParams: Promise<{ page?: string; type?: string; q?: string }>
}

const PAGE_SIZE = 25

const ALL_EVENT_TYPES = [
  "ACTION_CREATED",
  "ACTION_COMPLETED",
  "ACTION_IGNORED",
  "ACTION_SNOOZED",
  "ACTION_SUPPRESSED",
  "TRAINER_NOTE_ADDED",
  "CLIENT_STATE_UPDATED",
  "MEAL_RECORDED",
  "MEAL_REVIEWED",
  "CONVERSATION_PLANNED",
  "CONVERSATION_APPROVED",
  "CONVERSATION_DISMISSED",
  "CONVERSATION_SNOOZED",
  "REMINDER_PLANNED",
  "REMINDER_APPROVED",
  "REMINDER_DISMISSED",
  "REMINDER_SNOOZED",
  "COMMUNICATION_QUEUED",
  "COMMUNICATION_SENT",
  "COMMUNICATION_FAILED",
  "AUTOMATION_STARTED",
  "AUTOMATION_COMPLETED",
  "AUTOMATION_FAILED",
]

const EVENT_LABELS: Record<string, string> = {
  ACTION_CREATED: "Action Created",
  ACTION_COMPLETED: "Action Completed",
  ACTION_IGNORED: "Action Ignored",
  ACTION_SNOOZED: "Action Snoozed",
  ACTION_SUPPRESSED: "Action Suppressed",
  TRAINER_NOTE_ADDED: "Trainer Note",
  CLIENT_STATE_UPDATED: "Client State",
  MEAL_RECORDED: "Meal Recorded",
  MEAL_REVIEWED: "Meal Reviewed",
  CONVERSATION_PLANNED: "Conversation Planned",
  CONVERSATION_APPROVED: "Conversation Approved",
  CONVERSATION_DISMISSED: "Conversation Dismissed",
  CONVERSATION_SNOOZED: "Conversation Snoozed",
  REMINDER_PLANNED: "Reminder Planned",
  REMINDER_APPROVED: "Reminder Approved",
  REMINDER_DISMISSED: "Reminder Dismissed",
  REMINDER_SNOOZED: "Reminder Snoozed",
  COMMUNICATION_QUEUED: "Comm Queued",
  COMMUNICATION_SENT: "Comm Sent",
  COMMUNICATION_FAILED: "Comm Failed",
  AUTOMATION_STARTED: "Automation Started",
  AUTOMATION_COMPLETED: "Automation Completed",
  AUTOMATION_FAILED: "Automation Failed",
}

const EVENT_VARIANTS: Record<string, "default" | "brand" | "success" | "warning" | "danger" | "info" | "outline"> = {
  ACTION_CREATED: "brand",
  ACTION_COMPLETED: "success",
  ACTION_IGNORED: "warning",
  ACTION_SNOOZED: "info",
  ACTION_SUPPRESSED: "warning",
  MEAL_RECORDED: "brand",
  MEAL_REVIEWED: "success",
  CONVERSATION_PLANNED: "info",
  CONVERSATION_APPROVED: "success",
  CONVERSATION_DISMISSED: "warning",
  CONVERSATION_SNOOZED: "info",
  REMINDER_PLANNED: "brand",
  REMINDER_APPROVED: "success",
  REMINDER_DISMISSED: "warning",
  REMINDER_SNOOZED: "info",
  COMMUNICATION_QUEUED: "info",
  COMMUNICATION_SENT: "success",
  COMMUNICATION_FAILED: "danger",
  AUTOMATION_STARTED: "info",
  AUTOMATION_COMPLETED: "success",
  AUTOMATION_FAILED: "danger",
}

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  ...ALL_EVENT_TYPES.map((t) => ({ value: t, label: EVENT_LABELS[t] ?? t })),
]

function filterEvents(
  events: Awaited<ReturnType<typeof getEvents>>,
  typeFilter: string,
  search: string,
) {
  return events.filter((e) => {
    if (typeFilter && e.event_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const clientMatch = e.client_id?.toLowerCase().includes(q)
      const typeMatch = e.event_type.toLowerCase().includes(q)
      const payloadMatch = e.payload
        ? Object.values(e.payload).some((v) => String(v ?? "").toLowerCase().includes(q))
        : false
      if (!clientMatch && !typeMatch && !payloadMatch) return false
    }
    return true
  })
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const sp = await searchParams
  const currentPage = Math.max(1, Number(sp.page) || 1)
  const typeFilter = sp.type ?? ""
  const search = sp.q ?? ""

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const trainerId = user?.id ?? null

  if (!trainerId) {
    return (
      <PageContainer>
        <PageHeader title="Events" description="Immutable event log — read-only." />
        <Card className="py-12">
          <EmptyState
            icon={<HardDrive size={18} className="text-[var(--muted)]" />}
            title="Sign in to view events"
          />
        </Card>
      </PageContainer>
    )
  }

  const allEvents = await getEvents(trainerId)
  const sorted = [...allEvents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const filtered = filterEvents(sorted, typeFilter, search)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function buildUrl(p: number) {
    const params = new URLSearchParams()
    params.set("page", String(p))
    if (typeFilter) params.set("type", typeFilter)
    if (search) params.set("q", search)
    return `/dashboard/events?${params.toString()}`
  }

  function buildTypeFilterUrl(type: string) {
    const params = new URLSearchParams()
    params.set("page", "1")
    if (type) params.set("type", type)
    if (search) params.set("q", search)
    return `/dashboard/events?${params.toString()}`
  }

  function buildSearchUrl(q: string) {
    const params = new URLSearchParams()
    params.set("page", "1")
    if (typeFilter) params.set("type", typeFilter)
    if (q) params.set("q", q)
    return `/dashboard/events?${params.toString()}`
  }

  return (
    <PageContainer>
      <PageHeader
        title="Events"
        description={`Immutable event log — ${filtered.length} of ${allEvents.length} event${allEvents.length !== 1 ? "s" : ""}`}
      />

      {/* Filters */}
      <Card className="mb-5">
        <CardContent className="py-3 px-5">
          <FilterBar>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Type filter — uses shared Select with link-based navigation */}
              <div className="w-full sm:w-auto">
                <Select
                  id="event-type-filter"
                  options={EVENT_TYPE_OPTIONS}
                  value={typeFilter}
                  onChange={(e) => {
                    const url = buildTypeFilterUrl(e.target.value)
                    window.location.href = url
                  }}
                />
              </div>

              {/* Search */}
              <form
                method="GET"
                action="/dashboard/events"
                className="flex items-center gap-1.5 w-full sm:w-auto"
              >
                <div className="relative flex-1 sm:flex-initial">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={search}
                    placeholder="Client ID, type..."
                    className="w-full sm:w-48 text-xs rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] text-[var(--foreground)] pl-7 pr-2.5 py-1.5"
                    aria-label="Search events"
                  />
                </div>
                <button
                  type="submit"
                  className="text-xs rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] text-[var(--foreground)] px-2.5 py-1.5 hover:bg-[var(--surface-overlay)] shrink-0"
                  aria-label="Apply search"
                >
                  <Search size={13} />
                </button>
                {search && (
                  <Link
                    href={buildSearchUrl("")}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
                    aria-label="Clear search"
                  >
                    <X size={12} /> Clear
                  </Link>
                )}
              </form>
            </div>
          </FilterBar>
        </CardContent>
      </Card>

      {/* Results */}
      {paginated.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={<Activity size={18} className="text-[var(--muted)]" />}
            title={search || typeFilter ? "No matching events" : "No events yet"}
            description={
              search || typeFilter
                ? "Try adjusting your filters or search query."
                : "Events will appear here as the engagement system generates actions."
            }
          />
        </Card>
      ) : (
        <Card>
          {/* Column headers — hidden on mobile, shown on sm+ */}
          <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-b border-[var(--surface-border)] text-xs font-medium text-[var(--muted)]">
            <div className="w-32 md:w-40">Timestamp</div>
            <div className="w-32 md:w-36">Event type</div>
            <div className="w-20 md:w-28">Client</div>
            <div className="flex-1">Metadata</div>
          </div>
          <div className="divide-y divide-[var(--surface-border)]">
            {paginated.map((event) => {
              const time = formatDateTime(event.created_at)
              const clientRef = event.client_id?.slice(0, 8) ?? "trainer-level"
              const metaLines: string[] = []
              if (event.payload?.type) metaLines.push(`type: ${event.payload.type}`)
              if (event.payload?.reason) metaLines.push(`reason: ${event.payload.reason}`)
              if (event.payload?.priority) metaLines.push(`priority: ${event.payload.priority}`)
              return (
                <div
                  key={event.id}
                  className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-5 py-3 text-sm"
                >
                  {/* Mobile layout: stacked. Desktop: row */}
                  <div className="flex sm:hidden items-center gap-2 text-xs text-[var(--muted)] mb-1">
                    <Badge variant={EVENT_VARIANTS[event.event_type] ?? "default"} className="text-[10px]">
                      {EVENT_LABELS[event.event_type] ?? event.event_type}
                    </Badge>
                    <span className="font-mono">{time}</span>
                  </div>
                  {/* Desktop columns */}
                  <div className="hidden sm:block w-32 md:w-40 shrink-0 text-xs text-[var(--muted)] font-mono">{time}</div>
                  <div className="hidden sm:block w-32 md:w-36 shrink-0">
                    <Badge variant={EVENT_VARIANTS[event.event_type] ?? "default"}>
                      {EVENT_LABELS[event.event_type] ?? event.event_type}
                    </Badge>
                  </div>
                  <div className="hidden sm:block w-20 md:w-28 shrink-0 text-xs text-[var(--muted)] font-mono">{clientRef}</div>
                  <div className="min-w-0 flex-1">
                    {metaLines.length > 0 ? (
                      <p className="text-xs text-[var(--foreground)] truncate">{metaLines.join(" · ")}</p>
                    ) : (
                      <p className="text-xs text-[var(--muted)] italic">No metadata</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-5 py-3 border-t border-[var(--surface-border)]">
            <Pagination currentPage={page} totalPages={totalPages} buildUrl={buildUrl} />
          </div>
        </Card>
      )}
    </PageContainer>
  )
}
