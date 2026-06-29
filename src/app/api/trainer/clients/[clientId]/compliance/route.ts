import { NextRequest, NextResponse } from "next/server"
import { getClientCompliance } from "@/lib/dashboard-reads"
import { overrideCompliance, removeOverride, viewComplianceHistory } from "@/lib/operations/compliance-override"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = (await params).clientId
  const history = req.nextUrl.searchParams.get("history")

  try {
    const trainerId = await requireTrainer()

    if (history === "true") {
      const entries = await viewComplianceHistory(clientId, trainerId)
      return NextResponse.json({ ok: true, entries })
    }

    const compliance = await getClientCompliance(clientId, trainerId)
    return NextResponse.json({ ok: true, compliance })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = (await params).clientId
  const body = await req.json()

  try {
    const trainerId = await requireTrainer()

    if (body.action === "remove_override") {
      await removeOverride(clientId, trainerId)
      return NextResponse.json({ ok: true, action: "override_removed" })
    }

    const result = await overrideCompliance(clientId, trainerId, body.adjusted_score, body.reason)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
