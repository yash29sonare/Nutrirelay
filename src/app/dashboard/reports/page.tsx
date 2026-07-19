import Link from "next/link"
import { Calendar, Download, FileText, MessageSquare, Send, Users } from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
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
  type ReportAutomationPlanItem,
  type ReportStatus,
} from "@/lib/reports/report-center"
import { formatDate, formatDateTime, formatNumber } from "@/lib/format"

export const dynamic = "force-dynamic"

function statusVariant(status: ReportStatus): "success" | "warning" | "outline" | "default" {
  switch (status) {
    case "ready":
      return "success"
    case "partial":
      return "warning"
    case "no_data":
      return "outline"
    default:
      return "default"
  }
}

function ReportCard({ report }: { report: NutritionPeriodReport }) {
  const downloadName = `NutriRelay-${report.client.name.replace(/[^a-z0-9]+/gi, "-")}-${report.kind}-${report.period.startDate}.csv`
  const activeDays = report.dailyBreakdown.filter((day) => day.mealCount > 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{report.client.name}</CardTitle>
            <CardDescription>
              {report.period.label} · {formatDate(report.period.startIso)} to {formatDate(report.period.endDate)}
            </CardDescription>
          </div>
          <Badge variant={statusVariant(report.status)}>{report.status.replace("_", " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--muted)]">Calories</p>
            <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{formatNumber(report.totals.calories)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Protein</p>
            <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{formatNumber(report.totals.protein)}g</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Carbs</p>
            <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{formatNumber(report.totals.carbs)}g</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Fat</p>
            <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{formatNumber(report.totals.fat)}g</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-3">
            <p className="text-xs text-[var(--muted)]">Daily average</p>
            <p className="mt-1 font-medium text-[var(--foreground)]">
              {formatNumber(report.dailyAverages.calories)} kcal · P {formatNumber(report.dailyAverages.protein)}g
            </p>
          </div>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-3">
            <p className="text-xs text-[var(--muted)]">Data quality</p>
            <p className="mt-1 font-medium text-[var(--foreground)]">
              {report.reportableMealCount} counted · {report.excludedMealCount} excluded · {report.missingMacroEntries} partial
            </p>
          </div>
        </div>

        {report.goalComparison ? (
          <InlineNotice variant="info">{report.goalComparison}</InlineNotice>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Daily breakdown</p>
          {activeDays.length > 0 ? (
            <div className="max-h-56 overflow-auto rounded-lg border border-[var(--surface-border)]">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-[var(--surface-overlay)] text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Meals</th>
                    <th className="px-3 py-2 font-medium">kcal</th>
                    <th className="px-3 py-2 font-medium">P</th>
                    <th className="px-3 py-2 font-medium">C</th>
                    <th className="px-3 py-2 font-medium">F</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                  {report.dailyBreakdown.map((day) => (
                    <tr key={day.date}>
                      <td className="px-3 py-2 text-[var(--foreground)]">{formatDate(day.date)}</td>
                      <td className="px-3 py-2 tabular-nums text-[var(--muted)]">{day.mealCount}</td>
                      <td className="px-3 py-2 tabular-nums text-[var(--foreground)]">{formatNumber(day.totals.calories)}</td>
                      <td className="px-3 py-2 tabular-nums text-[var(--foreground)]">{formatNumber(day.totals.protein)}</td>
                      <td className="px-3 py-2 tabular-nums text-[var(--foreground)]">{formatNumber(day.totals.carbs)}</td>
                      <td className="px-3 py-2 tabular-nums text-[var(--foreground)]">{formatNumber(day.totals.fat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--surface-border)] p-4 text-sm text-[var(--muted)]">
              No logged intake in this report period.
            </div>
          )}
        </div>

        {report.weeklyBreakdown.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Weekly breakdown</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {report.weeklyBreakdown.map((week) => (
                <div key={week.weekStart} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-3 text-xs">
                  <p className="font-medium text-[var(--foreground)]">{formatDate(week.weekStart)} to {formatDate(week.weekEnd)}</p>
                  <p className="mt-1 text-[var(--muted)]">
                    {week.mealCount} meals · {formatNumber(week.totals.calories)} kcal · P {formatNumber(week.totals.protein)}g
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--foreground)]">
            <MessageSquare size={13} />
            Share preview
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-5 text-[var(--muted)]">{report.sharePreview}</pre>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={getReportDownloadHref(report)}
            download={downloadName}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-overlay)]"
          >
            <Download size={13} />
            Download CSV
          </a>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium text-[var(--muted)]"
          >
            <Send size={13} />
            Share via WhatsApp gated
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function AutomationPlan({ title, items }: { title: string; items: ReportAutomationPlanItem[] }) {
  const wouldSend = items.filter((item) => item.action === "would_send").length
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Dry-run only · {wouldSend} would send · {items.length - wouldSend} skipped
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length > 0 ? items.slice(0, 8).map((item) => (
          <div key={`${item.kind}-${item.clientId}`} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-3 text-sm">
            <div>
              <p className="font-medium text-[var(--foreground)]">{item.clientName}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{item.reason}</p>
            </div>
            <Badge variant={item.action === "would_send" ? "success" : "outline"}>
              {item.action.replace("_", " ")}
            </Badge>
          </div>
        )) : (
          <EmptyState icon={<Send size={16} />} title="No automation candidates" description="Active clients with report data will appear here." />
        )}
      </CardContent>
    </Card>
  )
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authUserId = user?.id ?? null

  if (!authUserId) {
    return (
      <PageContainer>
        <PageHeader title="Reports" description="Sign in to view trainer-scoped reports." />
      </PageContainer>
    )
  }

  let data
  try {
    data = await getTrainerReportsCenterData(authUserId)
  } catch (err) {
    return (
      <PageContainer>
        <PageHeader title="Reports" description="Weekly and monthly nutrition reports." />
        <ErrorState title="Unable to load reports." description={(err as Error).message} />
      </PageContainer>
    )
  }

  const currentMonthReady = data.monthlyReports.filter((report) => report.status !== "no_data").length
  const currentWeekReady = data.weeklyReports.filter((report) => report.status !== "no_data").length

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description={`Trainer Reports Center · generated ${formatDateTime(data.generatedAt)}`}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-5">
              <Users size={18} className="text-brand-500" />
              <div>
                <p className="text-2xl font-semibold text-[var(--foreground)]">{data.clients.length}</p>
                <p className="text-xs text-[var(--muted)]">Trainer clients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-5">
              <FileText size={18} className="text-[var(--success)]" />
              <div>
                <p className="text-2xl font-semibold text-[var(--foreground)]">{currentWeekReady}</p>
                <p className="text-xs text-[var(--muted)]">Weekly reports with data</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-5">
              <Calendar size={18} className="text-[var(--info)]" />
              <div>
                <p className="text-2xl font-semibold text-[var(--foreground)]">{currentMonthReady}</p>
                <p className="text-xs text-[var(--muted)]">Monthly reports with data</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-5">
              <MessageSquare size={18} className="text-[var(--warning)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{data.wabaStatus.status}</p>
                <p className="text-xs text-[var(--muted)]">Saved WABA status</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client report access</CardTitle>
            <CardDescription>Owned active clients only. Select a client card below to open their profile or use the report cards for downloads and preview sharing.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.clients.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/dashboard/clients/${client.id}`}
                    className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 transition-colors hover:bg-[var(--surface-overlay)]"
                  >
                    <p className="text-sm font-semibold text-[var(--foreground)]">{client.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{client.phoneNumber ?? "No phone number"}</p>
                    <p className="mt-3 text-xs text-[var(--muted)]">{client.goal?.goalType ?? "No active goal saved"}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Users size={16} />} title="No active clients" description="Reports appear once trainer-owned clients are active." />
            )}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Weekly reports</h2>
            <p className="text-sm text-[var(--muted)]">
              Current week: {data.currentWeek.startDate} to {data.currentWeek.endDate}. Previous week: {data.previousWeek.startDate} to {data.previousWeek.endDate}.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {data.weeklyReports.map((report) => <ReportCard key={`${report.client.id}-${report.period.key}`} report={report} />)}
          </div>
          <details className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4">
            <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">Previous week reports</summary>
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {data.previousWeeklyReports.map((report) => <ReportCard key={`${report.client.id}-${report.period.key}`} report={report} />)}
            </div>
          </details>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Monthly reports</h2>
            <p className="text-sm text-[var(--muted)]">
              Calendar-month nutrition reports with daily and weekly breakdowns, corrected stored macros, no-log days, and rejected/merged exclusions.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {data.monthlyReports.map((report) => <ReportCard key={`${report.client.id}-${report.period.key}`} report={report} />)}
          </div>
          <details className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4">
            <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">Previous month reports</summary>
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {data.previousMonthlyReports.map((report) => <ReportCard key={`${report.client.id}-${report.period.key}`} report={report} />)}
            </div>
          </details>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">WhatsApp report automation foundation</h2>
            <p className="text-sm text-[var(--muted)]">
              Default mode is dry-run. Live report delivery requires an explicit operator-approved send path and remains gated.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AutomationPlan title="Weekly automation dry-run" items={data.automationPlan.weekly} />
            <AutomationPlan title="Monthly automation dry-run" items={data.automationPlan.monthly} />
          </div>
          <InlineNotice variant="info">
            Share buttons and automation planning do not call Meta, do not read tokens, and do not send WhatsApp messages from this page.
          </InlineNotice>
        </section>
      </div>
    </PageContainer>
  )
}
