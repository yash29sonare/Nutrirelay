import { notFound, redirect } from "next/navigation"
import { PageContainer } from "@/components/layout/PageContainer"
import { getTrainerReportsCenterData, type ReportKind } from "@/lib/reports/report-center"
import { createClient } from "@/utils/supabase/server"
import { ClientReportPreview } from "./ClientReportPreview"

export const dynamic = "force-dynamic"

function assertReportKind(value: string): asserts value is ReportKind {
  if (value !== "weekly" && value !== "monthly") notFound()
}

export default async function ClientReportPage({
  params,
}: {
  params: Promise<{ clientId: string; kind: string }>
}) {
  const { clientId, kind } = await params
  assertReportKind(kind)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const data = await getTrainerReportsCenterData(user.id)
  const reports = kind === "weekly" ? data.weeklyReports : data.monthlyReports
  const report = reports.find((item) => item.client.id === clientId)
  if (!report) notFound()

  const trainerName = typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
    ? user.user_metadata.display_name.trim()
    : user.email ?? "Your trainer"

  return (
    <PageContainer>
      <ClientReportPreview report={report} trainerName={trainerName} />
    </PageContainer>
  )
}
