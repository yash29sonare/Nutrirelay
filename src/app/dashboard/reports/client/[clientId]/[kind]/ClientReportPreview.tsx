"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Info, Printer } from "lucide-react"
import {
  buildClientReportDraft,
  getClientReportProgressStatus,
  getElapsedReportStats,
} from "@/lib/reports/client-report"
import type { NutritionPeriodReport } from "@/lib/reports/report-center"
import { formatDate, formatNumber } from "@/lib/format"

interface ClientReportPreviewProps {
  report: NutritionPeriodReport
  trainerName: string
}

function goalLabel(goalType: string | null | undefined) {
  return goalType ? goalType.replaceAll("_", " ").toLowerCase() : "Nutrition consistency"
}

function Field({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--foreground)]">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-sm leading-6 text-[var(--foreground)] outline-none focus:border-brand-500"
      />
    </label>
  )
}

export function ClientReportPreview({ report, trainerName }: ClientReportPreviewProps) {
  const initialDraft = buildClientReportDraft(report)
  const [wins, setWins] = useState(initialDraft.wins)
  const [needsAttention, setNeedsAttention] = useState(initialDraft.needsAttention)
  const [trainerNote, setTrainerNote] = useState(initialDraft.trainerNote)
  const [recommendation, setRecommendation] = useState(initialDraft.recommendation)
  const [nextFocus, setNextFocus] = useState(initialDraft.nextFocus)
  const elapsedStats = getElapsedReportStats(report)
  const activeDays = elapsedStats.activeDays
  const progressStatus = getClientReportProgressStatus(report)
  const title = report.kind === "weekly" ? "Weekly Nutrition Report" : "Monthly Nutrition Report"
  const downloadName = `NutriRelay-${report.client.name.replace(/[^a-z0-9]+/gi, "-")}-${report.kind}-${report.period.startDate}.csv`
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(report.csv)}`

  function updateFocus(index: number, value: string) {
    setNextFocus((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))
  }

  return (
    <div className="space-y-5">
      <div className="dashboard-print-hidden flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/reports"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={15} />
          Back to Reports
        </Link>
        <div className="flex flex-wrap gap-2">
          <a
            href={csvHref}
            download={downloadName}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-overlay)]"
          >
            <Download size={14} />
            CSV
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Printer size={14} />
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="dashboard-print-hidden grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4">
          <div>
            <h1 className="text-base font-semibold text-[var(--foreground)]">Edit report notes</h1>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              These edits change this preview only. Nutrition logs, calculated macros, and client measurements remain unchanged.
            </p>
          </div>
          <Field label="Wins" value={wins} onChange={setWins} />
          <Field label="Needs attention" value={needsAttention} onChange={setNeedsAttention} />
          <Field label="Trainer note" value={trainerNote} onChange={setTrainerNote} />
          {report.kind === "monthly" ? (
            <Field label="Trainer recommendation" value={recommendation} onChange={setRecommendation} />
          ) : null}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--foreground)]">
              {report.kind === "weekly" ? "Next week focus" : "Next month focus"}
            </p>
            {nextFocus.map((item, index) => (
              <input
                key={index}
                value={item}
                onChange={(event) => updateFocus(index, event.target.value)}
                className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-brand-500"
                aria-label={`Focus item ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-sky-500/10 p-3 text-xs leading-5 text-sky-700 dark:text-sky-300">
            <Info size={14} className="mt-0.5 shrink-0" />
            Persistent report-note storage needs a separate additive migration and is not changed in this preview.
          </div>
        </aside>

        <div className="hidden items-start justify-center rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-5 lg:flex">
          <p className="text-xs text-[var(--muted)]">Print preview appears below at full width.</p>
        </div>
      </div>

      <article className={`client-report-sheet mx-auto overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl ${report.kind === "weekly" ? "max-w-[210mm]" : "max-w-[210mm]"}`}>
        <header className="bg-slate-950 px-8 py-7 text-white sm:px-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">NutriRelay</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm text-slate-300">
                {formatDate(report.period.startIso)} to {formatDate(report.period.endDate)}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-right">
              <p className="text-xs text-slate-400">Prepared for</p>
              <p className="mt-1 text-base font-semibold">{report.client.name}</p>
              <p className="mt-1 text-xs text-slate-300">Trainer: {trainerName}</p>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-8 py-7 sm:px-10">
          <section className="report-section grid gap-3 sm:grid-cols-4">
            {[
              ["Goal", goalLabel(report.client.goal?.goalType)],
              ["Current weight", report.client.goal?.currentWeight !== null && report.client.goal?.currentWeight !== undefined ? `${report.client.goal.currentWeight} kg` : "Not recorded"],
              ["Target", report.client.goal?.targetWeight !== null && report.client.goal?.targetWeight !== undefined ? `${report.client.goal.targetWeight} kg` : "Not recorded"],
              ["Logged days", `${activeDays} of ${elapsedStats.elapsedDays}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{value}</p>
              </div>
            ))}
          </section>

          <section className="report-section">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">
                {report.kind === "weekly" ? "Week at a glance" : "Monthly summary"}
              </h3>
              <span className={
                progressStatus === "On track"
                  ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
                  : progressStatus === "Needs consistency"
                    ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                    : "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800"
              }>
                {progressStatus}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Calories", formatNumber(report.totals.calories)],
                ["Daily average", `${formatNumber(report.dailyAverages.calories)} kcal`],
                ["Meals logged", report.reportableMealCount],
                ["No-log days", elapsedStats.noLogDays],
                ["Protein", `${formatNumber(report.totals.protein)}g`],
                ["Carbs", `${formatNumber(report.totals.carbs)}g`],
                ["Fat", `${formatNumber(report.totals.fat)}g`],
                ["Days logged", activeDays],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-sky-50 p-3">
                  <p className="text-[11px] font-medium text-sky-700">{label}</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {report.kind === "monthly" && report.weeklyBreakdown.length > 0 ? (
            <section className="report-section">
              <h3 className="mb-3 text-lg font-semibold">Weekly breakdown</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {report.weeklyBreakdown.map((week, index) => (
                  <div key={week.weekStart} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-500">Week {index + 1}</p>
                    <p className="mt-1 text-sm font-medium">{formatDate(week.weekStart)} – {formatDate(week.weekEnd)}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {week.mealCount} meals · {formatNumber(week.totals.calories)} kcal · P {formatNumber(week.totals.protein)}g
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="report-section grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="text-sm font-semibold text-emerald-900">
                {report.kind === "weekly" ? "Wins" : "Achievements"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-emerald-950">{wins || "No note added yet."}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">Needs attention</h3>
              <p className="mt-2 text-sm leading-6 text-amber-950">{needsAttention || "No note added yet."}</p>
            </div>
          </section>

          <section className="report-section grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold">Trainer note</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                {trainerNote || "Add a personal note before sharing this report."}
              </p>
              {report.kind === "monthly" ? (
                <>
                  <h3 className="mt-4 text-sm font-semibold">Trainer recommendation</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation}</p>
                </>
              ) : null}
            </div>
            <div className="rounded-xl bg-slate-950 p-4 text-white">
              <h3 className="text-sm font-semibold">
                {report.kind === "weekly" ? "Next week focus" : "Next month focus"}
              </h3>
              <ol className="mt-3 space-y-2">
                {nextFocus.filter((item) => item.trim()).map((item, index) => (
                  <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-5 text-slate-200">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-400 text-[11px] font-bold text-slate-950">
                      {index + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <footer className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            This progress summary is based on recorded nutrition logs and trainer review. It is not medical advice.
          </footer>
        </div>
      </article>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }
          body {
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          .client-report-sheet,
          .client-report-sheet * {
            visibility: visible !important;
          }
          .client-report-sheet {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .dashboard-print-hidden {
            display: none !important;
          }
          .report-section {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
