import Link from "next/link"
import {
  BellRing,
  Camera,
  ChevronRight,
  Inbox,
  MessageSquareText,
  Mic,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { getEvents } from "@/lib/events/engagementEventStore"
import {
  getTrainerInboxData,
  matchesInboxFilter,
  type InboxFilter,
  type InboxItemKind,
} from "@/lib/inbox/trainer-inbox"
import { formatRelativeDate } from "@/lib/format"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

const FILTERS: Array<{ value: InboxFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "needs-review", label: "Needs review" },
  { value: "text", label: "Text" },
  { value: "photos", label: "Photos" },
  { value: "voice", label: "Voice" },
  { value: "follow-ups", label: "Follow-ups" },
]

const KIND_LABELS: Record<InboxItemKind, string> = {
  text: "WhatsApp reply",
  photo: "Photo",
  voice: "Voice note",
  "follow-up": "Follow-up",
}

const KIND_ICONS = {
  text: MessageSquareText,
  photo: Camera,
  voice: Mic,
  "follow-up": BellRing,
} satisfies Record<InboxItemKind, typeof MessageSquareText>

function filterHref(filter: InboxFilter, query: string) {
  const params = new URLSearchParams()
  if (filter !== "all") params.set("filter", filter)
  if (query) params.set("q", query)
  const suffix = params.toString()
  return suffix ? `/dashboard/communications?${suffix}` : "/dashboard/communications"
}

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>
}) {
  const { q, filter: requestedFilter } = await searchParams
  const query = q?.trim().toLowerCase() ?? ""
  const filter = FILTERS.some((option) => option.value === requestedFilter)
    ? requestedFilter as InboxFilter
    : "all"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const trainerId = user?.id ?? null

  if (!trainerId) {
    return (
      <PageContainer>
        <PageHeader title="Inbox" description="Sign in to review client replies and follow-ups." />
      </PageContainer>
    )
  }

  let data
  try {
    const events = await getEvents(trainerId)
    data = await getTrainerInboxData(trainerId, events)
  } catch (error) {
    return (
      <PageContainer>
        <PageHeader title="Inbox" description="Review client WhatsApp replies, photos, voice notes, and follow-ups." />
        <ErrorState title="Unable to load Inbox." description={(error as Error).message} />
      </PageContainer>
    )
  }

  const items = data.items.filter((item) => {
    if (!matchesInboxFilter(item, filter)) return false
    if (!query) return true
    return [item.clientName, item.clientPhone ?? "", item.summary]
      .some((value) => value.toLowerCase().includes(query))
  })

  const summaryCards = [
    { label: "Needs review", value: data.summary.needsReview, icon: Inbox, tone: "text-amber-600 bg-amber-500/10" },
    { label: "New replies", value: data.summary.newReplies, icon: MessageSquareText, tone: "text-sky-600 bg-sky-500/10" },
    { label: "Photos / voice", value: data.summary.mediaReview, icon: Camera, tone: "text-violet-600 bg-violet-500/10" },
    { label: "Follow-ups", value: data.summary.followUps, icon: BellRing, tone: "text-emerald-600 bg-emerald-500/10" },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Inbox"
        description="Review client WhatsApp replies, photos, voice notes, and follow-ups."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
                  <p className="text-xs text-[var(--muted)]">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <nav aria-label="Inbox filters" className="flex flex-wrap gap-2">
                {FILTERS.map((option) => {
                  const selected = option.value === filter
                  return (
                    <a
                      key={option.value}
                      href={filterHref(option.value, q?.trim() ?? "")}
                      aria-current={selected ? "page" : undefined}
                      className={
                        selected
                          ? "rounded-full bg-[var(--foreground)] px-3 py-1.5 text-xs font-medium text-[var(--background)]"
                          : "rounded-full border border-[var(--surface-border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-overlay)] hover:text-[var(--foreground)]"
                      }
                    >
                      {option.label}
                    </a>
                  )
                })}
              </nav>

              <form action="/dashboard/communications" method="GET" className="flex w-full gap-2 lg:max-w-sm">
                {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search clients</span>
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Search client or phone"
                    className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none transition focus:border-brand-500"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)]"
                >
                  Search
                </button>
              </form>
            </div>

            {items.length > 0 ? (
              <div className="divide-y divide-[var(--surface-border)] border-t border-[var(--surface-border)]">
                {items.map((item) => {
                  const Icon = KIND_ICONS[item.kind]
                  return (
                    <article key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-overlay)] text-[var(--muted)]">
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-[var(--foreground)]">{item.clientName}</h2>
                          <Badge variant={item.needsReview ? "warning" : "outline"}>{item.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {KIND_LABELS[item.kind]} · {formatRelativeDate(item.timestamp)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--foreground)]">{item.summary}</p>
                      </div>
                      <Link
                        href={`/dashboard/clients/${item.clientId}`}
                        className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-[var(--surface-border)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-overlay)] sm:self-auto"
                      >
                        {item.needsReview ? "Review" : "Open client"}
                        <ChevronRight size={13} />
                      </Link>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="border-t border-[var(--surface-border)] pt-8">
                <EmptyState
                  icon={<Inbox size={18} />}
                  title="All client replies are handled."
                  description="New WhatsApp replies, photos, voice notes, and follow-ups will appear here."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
