import { NextRequest, NextResponse } from "next/server"
import { getClientDetail } from "@/lib/dashboard-reads"
import { activateClient, pauseClient, archiveClient, restoreClient } from "@/lib/operations/client-lifecycle"
import { requireTrainer, unauthorized } from "@/lib/api-auth"
import { createServiceDb, verifyClientOwnership } from "@/lib/ownership"

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

  const validActions = ["activate", "pause", "archive", "restore", "update_name"]
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
      case "update_name": {
        const fullName = typeof body.fullName === "string" ? body.fullName.trim() : ""
        if (fullName.length < 2) {
          return NextResponse.json({ error: "Client name must be at least 2 characters" }, { status: 400 })
        }
        if (fullName.length > 120) {
          return NextResponse.json({ error: "Client name is too long" }, { status: 400 })
        }

        const db = createServiceDb()
        const ownsClient = await verifyClientOwnership(db, clientId, trainerId)
        if (!ownsClient) {
          return NextResponse.json({ error: "Client not found or not owned by trainer" }, { status: 404 })
        }

        const { data, error } = await db
          .from("profiles")
          .update({ full_name: fullName })
          .eq("id", clientId)
          .select("id, full_name")
          .maybeSingle()

        if (error) throw error
        if (!data) {
          return NextResponse.json({ error: "Client profile not found" }, { status: 404 })
        }
        result = { client_id: data.id, full_name: data.full_name }
        break
      }
    }
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
