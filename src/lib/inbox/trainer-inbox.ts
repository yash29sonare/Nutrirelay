import { createServiceDb } from "@/lib/ownership"
import type { EngagementEvent } from "@/types/engagement-events"

export type InboxFilter = "all" | "needs-review" | "text" | "photos" | "voice" | "follow-ups"
export type InboxItemKind = "text" | "photo" | "voice" | "follow-up"

export interface TrainerInboxItem {
  id: string
  clientId: string
  clientName: string
  clientPhone: string | null
  kind: InboxItemKind
  summary: string
  status: string
  timestamp: string
  needsReview: boolean
}

export interface TrainerInboxData {
  items: TrainerInboxItem[]
  summary: {
    needsReview: number
    newReplies: number
    mediaReview: number
    followUps: number
  }
}

interface CommunicationRow {
  id: string
  client_id: string
  direction: string
  message_type: string
  message_timestamp: string
  delivery_status: string | null
  wam_id: string | null
  metadata: Record<string, unknown> | null
}

interface VoiceNoteRow {
  id: string
  client_id: string
  created_at: string
  transcript: string | null
  whatsapp_message_id: string
  processing_status: string
}

function metadataText(metadata: Record<string, unknown> | null): string | null {
  const candidates = [
    metadata?.original_text,
    metadata?.message_preview,
    metadata?.caption,
    metadata?.transcript,
    metadata?.template_id,
  ]
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null
}

function pendingEvents(events: EngagementEvent[], plannedType: string, handledTypes: string[], payloadKey: string) {
  const handled = new Set(
    events
      .filter((event) => handledTypes.includes(event.event_type))
      .map((event) => event.payload?.[payloadKey])
      .filter((value): value is string => typeof value === "string"),
  )

  return events.filter((event) => {
    const id = event.payload?.[payloadKey]
    return event.event_type === plannedType && typeof id === "string" && !handled.has(id)
  })
}

function communicationItem(
  row: CommunicationRow,
  clientName: string,
  clientPhone: string | null,
): TrainerInboxItem | null {
  const messageType = row.message_type.toUpperCase()
  const direction = row.direction.toUpperCase()
  const failed = row.delivery_status?.toLowerCase() === "failed"

  if (direction !== "INBOUND" && !failed) return null

  const kind: InboxItemKind = messageType === "IMAGE"
    ? "photo"
    : messageType === "AUDIO" || messageType === "VOICE"
      ? "voice"
      : failed
        ? "follow-up"
        : "text"

  const fallback = failed
    ? "A WhatsApp message could not be delivered."
    : kind === "photo"
      ? "Photo received from WhatsApp."
      : kind === "voice"
        ? "Voice note received from WhatsApp."
        : "WhatsApp reply received."

  return {
    id: `communication:${row.id}`,
    clientId: row.client_id,
    clientName,
    clientPhone,
    kind,
    summary: metadataText(row.metadata) ?? fallback,
    status: failed ? "Delivery failed" : kind === "text" ? "New reply" : "Needs review",
    timestamp: row.message_timestamp,
    needsReview: true,
  }
}

export async function getTrainerInboxData(
  trainerId: string,
  events: EngagementEvent[],
): Promise<TrainerInboxData> {
  const db = createServiceDb()
  const { data: links, error: linksError } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("is_active", true)

  if (linksError) throw new Error("Unable to load trainer-owned clients for Inbox")

  const clientIds = [...new Set((links ?? []).map((link) => link.client_id))]
  if (clientIds.length === 0) {
    return {
      items: [],
      summary: { needsReview: 0, newReplies: 0, mediaReview: 0, followUps: 0 },
    }
  }

  const [profilesRes, communicationsRes, voiceNotesRes] = await Promise.all([
    db.from("profiles").select("id, full_name, phone_number").in("id", clientIds),
    db
      .from("communication_logs")
      .select("id, client_id, direction, message_type, message_timestamp, delivery_status, wam_id, metadata")
      .eq("trainer_id", trainerId)
      .in("client_id", clientIds)
      .order("message_timestamp", { ascending: false })
      .limit(100),
    db
      .from("voice_notes")
      .select("id, client_id, created_at, transcript, whatsapp_message_id, processing_status")
      .eq("processing_status", "failed")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  if (profilesRes.error || communicationsRes.error || voiceNotesRes.error) {
    throw new Error("Unable to load trainer Inbox")
  }

  const profileMap = new Map(
    (profilesRes.data ?? []).map((profile) => [
      profile.id,
      {
        name: profile.full_name?.trim() || "Client",
        phone: profile.phone_number ?? null,
      },
    ]),
  )

  const voiceRows = (voiceNotesRes.data ?? []) as VoiceNoteRow[]
  const failedVoiceWamIds = new Set(voiceRows.map((row) => row.whatsapp_message_id))
  const items: TrainerInboxItem[] = []

  for (const row of (communicationsRes.data ?? []) as unknown as CommunicationRow[]) {
    if (row.wam_id && failedVoiceWamIds.has(row.wam_id)) continue
    const profile = profileMap.get(row.client_id) ?? { name: "Client", phone: null }
    const item = communicationItem(row, profile.name, profile.phone)
    if (item) items.push(item)
  }

  for (const row of voiceRows) {
    const profile = profileMap.get(row.client_id) ?? { name: "Client", phone: null }
    items.push({
      id: `voice:${row.id}`,
      clientId: row.client_id,
      clientName: profile.name,
      clientPhone: profile.phone,
      kind: "voice",
      summary: row.transcript?.trim() || "Voice note transcription needs trainer review.",
      status: "Transcription failed",
      timestamp: row.created_at,
      needsReview: true,
    })
  }

  const conversationEvents = pendingEvents(
    events,
    "CONVERSATION_PLANNED",
    ["CONVERSATION_APPROVED", "CONVERSATION_DISMISSED", "CONVERSATION_SNOOZED"],
    "conversationId",
  )
  const reminderEvents = pendingEvents(
    events,
    "REMINDER_PLANNED",
    ["REMINDER_APPROVED", "REMINDER_DISMISSED", "REMINDER_SNOOZED"],
    "reminderId",
  )

  for (const event of [...conversationEvents, ...reminderEvents]) {
    if (!event.client_id || !clientIds.includes(event.client_id)) continue
    const profile = profileMap.get(event.client_id) ?? { name: "Client", phone: null }
    const message = event.payload?.message
    const reason = event.payload?.reason
    items.push({
      id: `event:${event.event_id}`,
      clientId: event.client_id,
      clientName: profile.name,
      clientPhone: profile.phone,
      kind: "follow-up",
      summary: typeof message === "string" && message.trim()
        ? message.trim()
        : typeof reason === "string" && reason.trim()
          ? reason.replaceAll("_", " ")
          : "Follow-up is ready for trainer review.",
      status: event.event_type === "REMINDER_PLANNED" ? "Reminder prepared" : "Follow-up prepared",
      timestamp: event.created_at,
      needsReview: true,
    })
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000

  return {
    items,
    summary: {
      needsReview: items.filter((item) => item.needsReview).length,
      newReplies: items.filter((item) => item.kind === "text" && new Date(item.timestamp).getTime() >= dayAgo).length,
      mediaReview: items.filter((item) => item.kind === "photo" || item.kind === "voice").length,
      followUps: items.filter((item) => item.kind === "follow-up").length,
    },
  }
}

export function matchesInboxFilter(item: TrainerInboxItem, filter: InboxFilter): boolean {
  if (filter === "all") return true
  if (filter === "needs-review") return item.needsReview
  if (filter === "photos") return item.kind === "photo"
  if (filter === "voice") return item.kind === "voice"
  if (filter === "follow-ups") return item.kind === "follow-up"
  return item.kind === "text"
}
