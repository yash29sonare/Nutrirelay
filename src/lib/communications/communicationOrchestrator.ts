import { createClient } from "@supabase/supabase-js"
import { sendTemplateMessage, type TemplateId, type TemplateParamMap } from "@/lib/whatsapp/send"
import { appendEvents, getEvents } from "@/lib/events/engagementEventStore"
import { getClientAutomationState } from "@/lib/whatsapp/automation-state"
import type { ConversationPlan } from "@/types/conversation"
import type { ReminderPlan } from "@/types/reminder"

// ── Types ────────────────────────────────────────────────────────────────────

export type CommunicationType = "conversation" | "reminder"

export interface DispatchResult {
  planId: string
  type: CommunicationType
  status: "queued" | "sent" | "failed" | "skipped"
  reason?: string
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

function makeEventId(prefix: string, planId: string): string {
  return `${prefix}-${planId}`
}

type IdentityKey = `${string}:${string}:${string}`

function dedupKey(clientId: string, templateId: string, reason: string): IdentityKey {
  return `${clientId}:${templateId}:${reason}` as IdentityKey
}

// ── Phone resolution (batch) ─────────────────────────────────────────────────

interface ClientPhoneRow {
  id: string
  phone_number: string
}

async function resolveClientPhones(
  clientIds: string[],
): Promise<Map<string, string>> {
  if (clientIds.length === 0) return new Map()

  const db = getDb()
  const uniqueIds = [...new Set(clientIds)]

  const { data } = await db
    .from("profiles")
    .select("id, phone_number")
    .in("id", uniqueIds)

  const rows = (data ?? []) as ClientPhoneRow[]
  const map = new Map<string, string>()
  for (const row of rows) {
    if (row.phone_number) {
      map.set(row.id, row.phone_number)
    }
  }
  return map
}

// ── Dedup ────────────────────────────────────────────────────────────────────

async function buildPendingSet(
  trainerId: string,
): Promise<Set<IdentityKey>> {
  const events = await getEvents(trainerId)
  const pending = new Set<IdentityKey>()

  for (const event of events) {
    if (event.event_type !== "COMMUNICATION_QUEUED") continue
    if (!event.client_id) continue

    const payload = event.payload ?? {}
    const templateId = String(payload.templateId ?? "")
    const reason = String(payload.reason ?? "")
    if (!templateId || !reason) continue

    pending.add(dedupKey(event.client_id, templateId, reason))
  }

  return pending
}

// ── Per-plan dispatch ────────────────────────────────────────────────────────

async function dispatchConversationPlan(
  trainerId: string,
  plan: ConversationPlan,
  phone: string | undefined,
): Promise<DispatchResult> {
  const planId = plan.id
  const reason = plan.reason

  if (!phone) {
    return { planId, type: "conversation", status: "skipped", reason: "No phone number on file" }
  }

  const automationState = await getClientAutomationState(plan.context.clientId)
  if (automationState === "paused_no_response") {
    return {
      planId,
      type: "conversation",
      status: "skipped",
      reason: "Automation paused after 48h without inbound reply",
    }
  }

  // Append QUEUED event
  const queuedId = makeEventId("comm-queued", planId)
  await appendEvents(trainerId, [
    {
      client_id: plan.context.clientId,
      action_id: null,
      event_type: "COMMUNICATION_QUEUED",
      event_id: queuedId,
      payload: {
        conversationId: planId,
        templateId: plan.templateId,
        reason,
        priority: plan.priority,
        message: plan.message,
      },
    },
  ])

  try {
    await sendTemplateMessage(trainerId, phone, plan.templateId as TemplateId, plan.templateParams as TemplateParamMap[TemplateId])

    // Append SENT event
    const sentId = makeEventId("comm-sent", planId)
    await appendEvents(trainerId, [
      {
        client_id: plan.context.clientId,
        action_id: null,
        event_type: "COMMUNICATION_SENT",
        event_id: sentId,
        payload: {
          conversationId: planId,
          templateId: plan.templateId,
          reason,
        },
      },
    ])

    return { planId, type: "conversation", status: "sent" }
  } catch (err) {
    const errorMessage = (err as Error).message

    // Append FAILED event
    const failedId = makeEventId("comm-failed", planId)
    await appendEvents(trainerId, [
      {
        client_id: plan.context.clientId,
        action_id: null,
        event_type: "COMMUNICATION_FAILED",
        event_id: failedId,
        payload: {
          conversationId: planId,
          templateId: plan.templateId,
          reason,
          error: errorMessage,
        },
      },
    ])

    return { planId, type: "conversation", status: "failed", reason: errorMessage }
  }
}

async function dispatchReminderPlan(
  trainerId: string,
  plan: ReminderPlan,
  phone: string | undefined,
): Promise<DispatchResult> {
  const planId = plan.id
  const reason = plan.reason

  if (!phone) {
    return { planId, type: "reminder", status: "skipped", reason: "No phone number on file" }
  }

  const automationState = await getClientAutomationState(plan.context.clientId)
  if (automationState === "paused_no_response") {
    return {
      planId,
      type: "reminder",
      status: "skipped",
      reason: "Automation paused after 48h without inbound reply",
    }
  }

  // Append QUEUED event
  const queuedId = makeEventId("comm-queued", planId)
  await appendEvents(trainerId, [
    {
      client_id: plan.context.clientId,
      action_id: null,
      event_type: "COMMUNICATION_QUEUED",
      event_id: queuedId,
      payload: {
        reminderId: planId,
        templateId: plan.templateId,
        reason,
        priority: plan.priority,
        message: plan.message,
      },
    },
  ])

  try {
    await sendTemplateMessage(trainerId, phone, plan.templateId as TemplateId, plan.templateParams as TemplateParamMap[TemplateId])

    // Append SENT event
    const sentId = makeEventId("comm-sent", planId)
    await appendEvents(trainerId, [
      {
        client_id: plan.context.clientId,
        action_id: null,
        event_type: "COMMUNICATION_SENT",
        event_id: sentId,
        payload: {
          reminderId: planId,
          templateId: plan.templateId,
          reason,
        },
      },
    ])

    return { planId, type: "reminder", status: "sent" }
  } catch (err) {
    const errorMessage = (err as Error).message

    // Append FAILED event
    const failedId = makeEventId("comm-failed", planId)
    await appendEvents(trainerId, [
      {
        client_id: plan.context.clientId,
        action_id: null,
        event_type: "COMMUNICATION_FAILED",
        event_id: failedId,
        payload: {
          reminderId: planId,
          templateId: plan.templateId,
          reason,
          error: errorMessage,
        },
      },
    ])

    return { planId, type: "reminder", status: "failed", reason: errorMessage }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function dispatchPlans(
  trainerId: string,
  conversations: ConversationPlan[],
  reminders: ReminderPlan[],
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = []

  // Collect all unique client IDs
  const allClientIds = [
    ...conversations.map((c) => c.context.clientId),
    ...reminders.map((r) => r.context.clientId),
  ]

  // Batch: resolve phones
  const phones = await resolveClientPhones(allClientIds)

  // Batch: build pending dedup set
  const pending = await buildPendingSet(trainerId)

  // Process conversations
  for (const plan of conversations) {
    const key = dedupKey(plan.context.clientId, plan.templateId, plan.reason)
    if (pending.has(key)) {
      results.push({ planId: plan.id, type: "conversation", status: "skipped", reason: "Duplicate — pending communication exists" })
      continue
    }

    const phone = phones.get(plan.context.clientId)
    const result = await dispatchConversationPlan(trainerId, plan, phone)
    results.push(result)
  }

  // Process reminders
  for (const plan of reminders) {
    const key = dedupKey(plan.context.clientId, plan.templateId, plan.reason)
    if (pending.has(key)) {
      results.push({ planId: plan.id, type: "reminder", status: "skipped", reason: "Duplicate — pending communication exists" })
      continue
    }

    const phone = phones.get(plan.context.clientId)
    const result = await dispatchReminderPlan(trainerId, plan, phone)
    results.push(result)
  }

  return results
}
