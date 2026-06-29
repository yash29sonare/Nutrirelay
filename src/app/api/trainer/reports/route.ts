import { NextRequest, NextResponse } from "next/server"
import { getClientReports } from "@/lib/dashboard-reads"
import { createServiceDb } from "@/lib/ownership"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

async function getActiveClientIds(trainerId: string): Promise<string[]> {
  const db = createServiceDb()
  const { data } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("is_active", true)
  return (data ?? []).map((r: { client_id: string }) => r.client_id)
}

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id")
  const type = req.nextUrl.searchParams.get("type") ?? "all"

  try {
    const trainerId = await requireTrainer()
    const db = createServiceDb()

    if (type === "weekly" || type === "all") {
      const clientIds = await getActiveClientIds(trainerId)
      const { data: weekly } = await db
        .from("weekly_reports")
        .select("id, client_id, report_date, summary, pdf_storage_url")
        .in("client_id", clientIds)
        .order("report_date", { ascending: false })
        .limit(50)

      if (type === "weekly") {
        return NextResponse.json({ ok: true, reports: weekly ?? [] })
      }
    }

    if (type === "monthly" || type === "all") {
      const clientIds = await getActiveClientIds(trainerId)
      const { data: monthly } = await db
        .from("monthly_reports")
        .select("id, client_id, report_month, compliance_score, goal_projection_score, predicted_goal_success, summary")
        .in("client_id", clientIds)
        .order("report_month", { ascending: false })
        .limit(50)

      if (type === "monthly") {
        return NextResponse.json({ ok: true, reports: monthly ?? [] })
      }
    }

    if (clientId) {
      const reports = await getClientReports(clientId, trainerId)
      return NextResponse.json({ ok: true, reports })
    }

    return NextResponse.json({ ok: true, message: "Specify type=weekly, type=monthly, or client_id" })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
