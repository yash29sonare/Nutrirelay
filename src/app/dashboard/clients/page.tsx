import { Suspense } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Users, AlertTriangle } from "lucide-react"
import { ClientFilters } from "./ClientFilters"
import { getDashboardData } from "@/lib/operations/dashboard"
import { getClientList } from "@/lib/operations/clients"
import { getClientRiskLevel } from "@/lib/domain/dashboardSemantics"
import { createClient } from "@/utils/supabase/server"
import type { ClientSummary } from "@/types/dashboard"

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

  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        description={
          authUserId
            ? `${clients.length} client${clients.length !== 1 ? "s" : ""} in your roster`
            : "Sign in to view your clients"
        }
      />

      {authUserId && (
        <div className="mb-6">
          <ClientFilters />
        </div>
      )}

      {!authUserId && (
        <EmptyState
          icon={<Users size={18} aria-hidden="true" />}
          title="Sign in to view your client roster."
        />
      )}

      {authUserId && clients.length === 0 && (
        <EmptyState
          icon={<Users size={18} aria-hidden="true" />}
          title="No clients match your current filters."
        />
      )}

      {authUserId && clients.length > 0 && (
        <div className="flex flex-col gap-2">
          {clients.map((client) => (
            <Link
              key={client.client_id}
              href={`/dashboard/clients/${client.client_id}`}
              className="block"
            >
              <Card className="hover:bg-[var(--surface-overlay)] transition-colors duration-150 cursor-pointer">
                <CardContent className="py-3 px-5 flex items-center gap-3">
                  <Avatar
                    fallback={getInitials(client.client_name)}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {client.client_name}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {client.total_meals_logged_today} meal
                      {client.total_meals_logged_today !== 1 ? "s" : ""} today
                      &nbsp;·&nbsp;{client.total_calories_today} kcal
                    </p>
                  </div>
                  {getStatusBadge(client)}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
