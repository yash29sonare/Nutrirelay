import Link from "next/link"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Users, AlertTriangle, MessageSquare } from "lucide-react"
import { ClientFilters } from "./ClientFilters"
import { AddWhatsAppClientDialog, SendOnboardingButton } from "./AddWhatsAppClientDialog"
import { getDashboardData } from "@/lib/operations/dashboard"
import { getClientList } from "@/lib/operations/clients"
import {
  getTrainerWhatsAppClientCount,
  listTrainerWhatsAppClients,
  type TrainerWhatsAppClientRow,
} from "@/lib/operations/trainer-whatsapp-clients"
import { getClientRiskLevel } from "@/lib/domain/dashboardSemantics"
import { createClient } from "@/utils/supabase/server"
import { getWhatsAppServiceDb } from "@/lib/whatsapp/service-db"
import { getPlanClientLimit } from "@/lib/entitlements"
import type { ClientSummary } from "@/types/dashboard"

type LegacyRosterRow = {
  kind: "legacy"
  client: ClientSummary
}

type WhatsAppRosterRow = {
  kind: "whatsapp"
  client: TrainerWhatsAppClientRow
}

type RosterRow = LegacyRosterRow | WhatsAppRosterRow

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getStatusBadge(client: ClientSummary) {
  const level = getClientRiskLevel(client)

  if (level === "high") {
    return (
      <Badge variant="danger">
        <AlertTriangle size={11} aria-hidden="true" />
        {client.active_strike_count} strikes
      </Badge>
    )
  }
  if (level === "medium") {
    return <Badge variant="warning">1 strike</Badge>
  }
  if (client.total_meals_logged_today > 0) {
    return <Badge variant="success">On track</Badge>
  }
  return <Badge variant="default">No meals today</Badge>
}

function getOnboardingBadge(status: string) {
  switch (status) {
    case "sent":
      return <Badge variant="success">Onboarding sent</Badge>
    case "pending":
      return <Badge variant="warning">Onboarding pending</Badge>
    case "failed":
      return <Badge variant="danger">Onboarding failed</Badge>
    default:
      return <Badge variant="default">Onboarding not sent</Badge>
  }
}

function getWhatsAppStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>
    case "inactive":
      return <Badge variant="outline">Inactive</Badge>
    case "archived":
      return <Badge variant="warning">Archived</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function canSendOnboarding(client: TrainerWhatsAppClientRow): boolean {
  return (
    client.status === "active" &&
    (client.onboarding_message_status === "not_sent" || client.onboarding_message_status === "failed")
  )
}

function getWhatsAppClientList(
  clients: TrainerWhatsAppClientRow[],
  filters: { search: string; status: "all" | "risk" | "compliant" | "inactive" },
): TrainerWhatsAppClientRow[] {
  return clients.filter((client) => {
    if (filters.search && !client.client_name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }

    if (filters.status === "risk" || filters.status === "compliant") return false
    if (filters.status === "inactive") return client.status === "active"
    return true
  })
}

interface AddClientReadiness {
  canAddClient: boolean
  hasConnectedSender: boolean
  planLimitReached: boolean
  blockMessage: string | null
}

async function getAddClientReadiness(authUserId: string, activeClientCount: number): Promise<AddClientReadiness> {
  const db = getWhatsAppServiceDb()
  const [{ data: profile }, { data: trainer }, { data: credential }] = await Promise.all([
    db
      .from("profiles")
      .select("role, status")
      .eq("id", authUserId)
      .maybeSingle(),
    db
      .from("trainers")
      .select("account_status, onboarding_status, subscription_plan, max_clients")
      .eq("auth_user_id", authUserId)
      .maybeSingle(),
    db
      .from("trainer_waba_credentials")
      .select("id")
      .eq("trainer_id", authUserId)
      .eq("status", "connected")
      .not("phone_number_id", "is", null)
      .not("waba_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (profile?.role !== "trainer" || profile?.status !== "active") {
    return {
      canAddClient: false,
      hasConnectedSender: false,
      planLimitReached: false,
      blockMessage: "Only active trainer accounts can add clients.",
    }
  }

  if (!trainer || trainer.account_status !== "active") {
    return {
      canAddClient: false,
      hasConnectedSender: false,
      planLimitReached: false,
      blockMessage: "Your trainer account is restricted. Contact NutriRelay support.",
    }
  }

  if (trainer.onboarding_status !== "active") {
    return {
      canAddClient: false,
      hasConnectedSender: false,
      planLimitReached: false,
      blockMessage: "Complete trainer onboarding before adding clients.",
    }
  }

  const hasConnectedSender = Boolean(credential)
  if (!hasConnectedSender) {
    return {
      canAddClient: false,
      hasConnectedSender,
      planLimitReached: false,
      blockMessage: "Connect your WhatsApp sender before adding your first client.",
    }
  }

  const planLimit = getPlanClientLimit(trainer.subscription_plan)
  const explicitLimit = Number(trainer.max_clients)
  const clientLimit = explicitLimit > 0 ? explicitLimit : planLimit
  const planLimitReached = clientLimit !== null && activeClientCount >= clientLimit

  if (planLimitReached) {
    return {
      canAddClient: false,
      hasConnectedSender,
      planLimitReached,
      blockMessage: "You have reached your plan's active client limit.",
    }
  }

  return {
    canAddClient: true,
    hasConnectedSender,
    planLimitReached,
    blockMessage: null,
  }
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const sp = await searchParams
  const q = sp.q ?? ""
  const status = sp.status ?? "all"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authUserId = user?.id ?? null

  const validStatus = ["all", "risk", "compliant", "inactive"].includes(status)
    ? (status as "all" | "risk" | "compliant" | "inactive")
    : "all"

  const result = authUserId ? await getDashboardData(authUserId) : null
  const clients: ClientSummary[] =
    result?.success === true
      ? getClientList(result.data, { search: q, status: validStatus })
      : []
  const whatsappClients = authUserId
    ? await listTrainerWhatsAppClients(authUserId)
    : []
  const filteredWhatsAppClients = getWhatsAppClientList(whatsappClients, {
    search: q,
    status: validStatus,
  })
  const rosterRows: RosterRow[] = [
    ...clients.map((client) => ({ kind: "legacy" as const, client })),
    ...filteredWhatsAppClients.map((client) => ({ kind: "whatsapp" as const, client })),
  ]
  const activeClientCount = authUserId
    ? clients.length + await getTrainerWhatsAppClientCount(authUserId)
    : 0
  const addClientReadiness = authUserId
    ? await getAddClientReadiness(authUserId, activeClientCount)
    : null

  return (
    <PageContainer className="flex min-h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="Clients"
        description={
          authUserId
            ? `${rosterRows.length} client${rosterRows.length !== 1 ? "s" : ""} in your roster`
            : "Sign in to view your clients"
        }
        actions={addClientReadiness?.canAddClient ? <AddWhatsAppClientDialog /> : null}
      />

      {authUserId && (
        <div className="mb-6">
          <ClientFilters />
        </div>
      )}

      <section
        className="flex min-h-[28rem] flex-1 flex-col rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4"
        aria-label="Client roster"
      >
        {!authUserId && (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<Users size={18} aria-hidden="true" />}
              title="Sign in to view your client roster."
            />
          </div>
        )}

        {authUserId && rosterRows.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<Users size={18} aria-hidden="true" />}
              title={q || validStatus !== "all" ? "No clients match your current filters." : "No clients yet."}
              description={
                q || validStatus !== "all"
                  ? "Try changing your search or status filter."
                  : "Add your first WhatsApp client to start onboarding."
              }
              action={
                addClientReadiness?.canAddClient ? (
                  <AddWhatsAppClientDialog />
                ) : !addClientReadiness?.hasConnectedSender ? (
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                  >
                    <MessageSquare size={15} aria-hidden="true" />
                    Connect sender
                  </Link>
                ) : addClientReadiness?.planLimitReached ? (
                  <p className="text-sm text-[var(--muted)]">{addClientReadiness.blockMessage}</p>
                ) : addClientReadiness?.blockMessage ? (
                  <p className="text-sm text-[var(--muted)]">{addClientReadiness.blockMessage}</p>
                ) : null
              }
            />
          </div>
        )}

        {authUserId && rosterRows.length > 0 && (
          <div className="flex flex-col gap-2">
            {rosterRows.map((row) => (
              row.kind === "legacy" ? (
                <Link
                  key={`legacy-${row.client.client_id}`}
                  href={`/dashboard/clients/${row.client.client_id}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-5 py-3 transition-colors duration-150 hover:bg-[var(--surface-overlay)]"
                >
                  <Avatar
                    fallback={getInitials(row.client.client_name)}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {row.client.client_name}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {row.client.total_meals_logged_today} meal
                      {row.client.total_meals_logged_today !== 1 ? "s" : ""} today
                      &nbsp;·&nbsp;{row.client.total_calories_today} kcal
                    </p>
                  </div>
                  {getStatusBadge(row.client)}
                </Link>
              ) : (
                <div
                  key={`whatsapp-${row.client.client_id}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-5 py-3"
                >
                  <Link
                    href={`/dashboard/clients/${row.client.client_id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-colors hover:bg-[var(--surface-overlay)]"
                  >
                    <Avatar
                      fallback={getInitials(row.client.client_name)}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {row.client.client_name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {getWhatsAppStatusBadge(row.client.status)}
                      </div>
                      {row.client.onboarding_failure_reason ? (
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {row.client.onboarding_failure_reason}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {getOnboardingBadge(row.client.onboarding_message_status)}
                    {canSendOnboarding(row.client) ? (
                      <SendOnboardingButton clientId={row.client.client_id} />
                    ) : null}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  )
}
