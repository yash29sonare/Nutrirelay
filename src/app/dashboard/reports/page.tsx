import Link from "next/link"
import {
  CalendarDays,
  ChevronRight,
  Download,
  FileText,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { InlineNotice } from "@/components/ui/InlineNotice"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { createClient } from "@/utils/supabase/server"
import {
  getReportDownloadHref,
  getTrainerReportsCenterData,
  type NutritionPeriodReport,
} from "@/lib/reports/report-center"
import { formatNumber } from "@/lib/format"

export const dynamic = "force-dynamic"

function readiness(report: NutritionPeriodReport) {
  if (report.status === "no_data") {
    return { label: "Waiting for logs", variant: "outline" as const }
  }
  if (report.status === "partial") {
    return { label: "Needs review", variant: "warning" as const }
  }
  return { label: "Ready", variant: "success" as const }
}

function goalLabel(goalType: string | null | undefined) {
  return goalType ? goalType.replaceAll("_", " ").toLowerCase() : "Goal not added"
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const trainerId = user?.id ?? null

  if (!trainerId) {
    return (
      <PageContainer>
        <PageHeader title="Reports" description="Sign in to create client progress reports." />
      </PageContainer>
    )
  }

  let data
  try {
    data = await getTrainerReportsCenterData(trainerId)
  } catch (error) {
    return (
      <PageContainer>
        <PageHeader title="Reports" description="Create weekly and monthly client progress reports." />
        <ErrorState title="Unable to load reports." description={(error as Error).message} />
      </PageContainer>
    )
  }

  const weeklyByClient = new Map(data.weeklyReports.map((report) => [report.client.id, report]))
  const monthlyByClient = new Map(data.monthlyReports.map((report) => [report.client.id, report]))
  const weeklyReady = data.weeklyReports.filter((report) => report.status !== "no_data").length
  const monthlyReady = data.monthlyReports.filter((report) => report.status !== "no_data").length

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description="Create weekly and monthly client progress reports."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Clients", value: data.clients.length, icon: Users, tone: "bg-sky-500/10 text-sky-600" },
            { label: "Weekly reports ready", value: weeklyReady, icon: FileText, tone: "bg-emerald-500/10 text-emerald-600" },
            { label: "Monthly reports ready", value: monthlyReady, icon: CalendarDays, tone: "bg-violet-500/10 text-violet-600" },
          ].map(({ label, value, icon: Icon, tone }) => (
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

        {data.clients.length > 0 ? (
          <div className="space-y-3">
            {data.clients.map((client) => {
              const weekly = weeklyByClient.get(client.id)
              const monthly = monthlyByClient.get(client.id)
              if (!weekly || !monthly) return null
              const weeklyState = readiness(weekly)
              const monthlyState = readiness(monthly)

              return (
                <Card key={client.id}>
                  <CardContent className="space-y-4 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-[var(--foreground)]">{client.name}</h2>
                        <p className="mt-1 text-sm capitalize text-[var(--muted)]">{goalLabel(client.goal?.goalType)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-72">
                        <div className="rounded-lg bg-[var(--surface-overlay)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--muted)]">Weekly</span>
                            <Badge variant={weeklyState.variant}>{weeklyState.label}</Badge>
                          </div>
                          <p className="mt-2 text-[var(--foreground)]">
                            {weekly.reportableMealCount} meals · {formatNumber(weekly.totals.calories)} kcal
                          </p>
                        </div>
                        <div className="rounded-lg bg-[var(--surface-overlay)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[var(--muted)]">Monthly</span>
                            <Badge variant={monthlyState.variant}>{monthlyState.label}</Badge>
                          </div>
                          <p className="mt-2 text-[var(--foreground)]">
                            {monthly.reportableMealCount} meals · {formatNumber(monthly.totals.calories)} kcal
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-[var(--surface-border)] pt-4">
                      <Link
                        href={`/dashboard/reports/client/${client.id}/weekly`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
                      >
                        Weekly report
                        <ChevronRight size={13} />
                      </Link>
                      <Link
                        href={`/dashboard/reports/client/${client.id}/monthly`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-overlay)]"
                      >
                        Monthly report
                        <ChevronRight size={13} />
                      </Link>
                      <details className="group">
                        <summary className="cursor-pointer list-none rounded-lg border border-[var(--surface-border)] px-3 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-overlay)]">
                          View details
                        </summary>
                        <div className="mt-2 grid min-w-64 gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3 text-xs text-[var(--muted)] sm:grid-cols-2">
                          <span>Weekly: P {formatNumber(weekly.totals.protein)}g · C {formatNumber(weekly.totals.carbs)}g · F {formatNumber(weekly.totals.fat)}g</span>
                          <span>Monthly: P {formatNumber(monthly.totals.protein)}g · C {formatNumber(monthly.totals.carbs)}g · F {formatNumber(monthly.totals.fat)}g</span>
                        </div>
                      </details>
                      <a
                        href={getReportDownloadHref(weekly)}
                        download={`NutriRelay-${client.name.replace(/[^a-z0-9]+/gi, "-")}-weekly-${weekly.period.startDate}.csv`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--foreground)]"
                      >
                        <Download size={13} />
                        Weekly CSV
                      </a>
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
                icon={<Users size={18} />}
                title="No active clients"
                description="Reports appear once a trainer-owned client starts logging nutrition."
              />
            </CardContent>
          </Card>
        )}

        <InlineNotice variant="info">
          Report notes can be edited in the preview and printed or saved as PDF. Preview edits are not persisted yet. WhatsApp report sharing remains gated.
        </InlineNotice>
      </div>
    </PageContainer>
  )
}
