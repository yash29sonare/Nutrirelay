import { NextRequest, NextResponse } from "next/server"
import { getTrainerClientSummaries } from "@/lib/dashboard-reads"
import { inviteClient } from "@/lib/operations/client-lifecycle"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const trainerId = await requireTrainer()
    const clients = await getTrainerClientSummaries(trainerId)
    return NextResponse.json({ ok: true, clients })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { client_id } = body
  if (!client_id) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 })
  }

  try {
    const trainerId = await requireTrainer()
    const result = await inviteClient(trainerId, client_id)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
