import { NextRequest, NextResponse } from "next/server"
import { getClientDetail } from "@/lib/dashboard-reads"
import { activateClient, pauseClient, archiveClient, restoreClient } from "@/lib/operations/client-lifecycle"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = (await params).clientId

  try {
    const trainerId = await requireTrainer()
    const detail = await getClientDetail(clientId, trainerId)
    if (!detail) return NextResponse.json({ error: "Client not found or not owned by trainer" }, { status: 404 })
    return NextResponse.json({ ok: true, detail })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = (await params).clientId
  const body = await req.json()
  const { action, reason } = body

  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 })
  }

  const validActions = ["activate", "pause", "archive", "restore"]
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Valid: ${validActions.join(", ")}` }, { status: 400 })
  }

  try {
    const trainerId = await requireTrainer()
    let result
    switch (action) {
      case "activate":
        result = await activateClient(trainerId, clientId)
        break
      case "pause":
        result = await pauseClient(trainerId, clientId, reason)
        break
      case "archive":
        result = await archiveClient(trainerId, clientId, reason)
        break
      case "restore":
        result = await restoreClient(trainerId, clientId)
        break
    }
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
