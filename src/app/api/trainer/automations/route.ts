import { NextRequest, NextResponse } from "next/server"
import { createServiceDb } from "@/lib/ownership"
import { createAutomation, updateAutomation, enableAutomation, disableAutomation, deleteAutomation } from "@/lib/operations/automation-management"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const trainerId = await requireTrainer()
    const db = createServiceDb()
    const { data } = await db
      .from("trainer_automations")
      .select("*")
      .eq("trainer_id", trainerId)
      .maybeSingle()

    return NextResponse.json({ ok: true, automations: data ?? null })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, config, automation_key } = body

  try {
    const trainerId = await requireTrainer()
    let result
    switch (action) {
      case "create":
        result = await createAutomation(trainerId, config)
        break
      case "update":
        result = await updateAutomation(trainerId, config)
        break
      case "enable":
        await enableAutomation(trainerId, automation_key)
        result = { ok: true, action: "enabled", automation_key }
        break
      case "disable":
        await disableAutomation(trainerId, automation_key)
        result = { ok: true, action: "disabled", automation_key }
        break
      case "delete":
        await deleteAutomation(trainerId)
        result = { ok: true, action: "deleted" }
        break
      default:
        return NextResponse.json({ error: "Invalid action. Valid: create, update, enable, disable, delete" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
