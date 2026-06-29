import { NextRequest, NextResponse } from "next/server"
import { createServiceDb } from "@/lib/ownership"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = (await params).clientId
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10)

  try {
    const trainerId = await requireTrainer()
    const db = createServiceDb()

    const { data: tc } = await db
      .from("trainer_clients")
      .select("client_id")
      .eq("trainer_id", trainerId)
      .eq("client_id", clientId)
      .limit(1)
      .maybeSingle()

    if (!tc) return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 })

    const { data } = await db
      .from("communication_logs")
      .select("id, direction, message_type, message_timestamp, delivery_status, metadata, created_at")
      .eq("client_id", clientId)
      .order("message_timestamp", { ascending: false })
      .limit(limit)

    return NextResponse.json({ ok: true, communications: data ?? [] })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
