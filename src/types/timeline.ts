export type TimelineSeverity = "info" | "success" | "warning" | "danger" | "brand"

export type TimelineSource =
  | "engagement_event"
  | "engagement_action"
  | "client_state"
  | "onboarding"
  | "food_log"
  | "reminder"
  | "whatsapp"
  | "ai_summary"
  | "poll"
  | "follow_up"
  | "voice_note"
  | "system"

export type TimelineCategory =
  | "action"
  | "event"
  | "ai"
  | "compliance"
  | "system"

export interface TimelineEntry {
  id: string
  timestamp: string
  clientId: string
  eventType: string
  title: string
  description: string
  icon: string
  severity: TimelineSeverity
  source: TimelineSource
  category: TimelineCategory
  metadata: Record<string, unknown>
}
