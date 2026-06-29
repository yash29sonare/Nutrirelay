import { NextRequest, NextResponse } from "next/server"
import { getClientTimeline } from "@/lib/operations/client-timeline"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = (await params).clientId
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10)
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10)
  const eventTypes = req.nextUrl.searchParams.get("event_types")

  try {
    const trainerId = await requireTrainer()
    const events = await getClientTimeline({
      clientId,
      trainerId,
      limit,
      offset,
      eventTypes: eventTypes ? eventTypes.split(",") : undefined,
    })
    return NextResponse.json({ ok: true, events })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
