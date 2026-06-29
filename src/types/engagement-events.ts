export type EngagementEventType =
  | "ACTION_CREATED"
  | "ACTION_COMPLETED"
  | "ACTION_IGNORED"
  | "ACTION_SNOOZED"
  | "ACTION_SUPPRESSED"
  | "TRAINER_NOTE_ADDED"
  | "CLIENT_STATE_UPDATED"
  | "MEAL_RECORDED"
  | "MEAL_REVIEWED"
  | "CONVERSATION_PLANNED"
  | "CONVERSATION_APPROVED"
  | "CONVERSATION_DISMISSED"
  | "CONVERSATION_SNOOZED"
  | "REMINDER_PLANNED"
  | "REMINDER_APPROVED"
  | "REMINDER_DISMISSED"
  | "REMINDER_SNOOZED"
  | "COMMUNICATION_QUEUED"
  | "COMMUNICATION_SENT"
  | "COMMUNICATION_FAILED"
  | "AUTOMATION_STARTED"
  | "AUTOMATION_COMPLETED"
  | "AUTOMATION_FAILED"

export interface EngagementEvent {
  id: string
  trainer_id: string
  client_id: string | null
  action_id: string | null
  event_type: EngagementEventType
  event_id: string
  payload: Record<string, unknown> | null
  created_at: string
}

export interface EngagementEventInput {
  client_id: string | null
  action_id: string | null
  event_type: EngagementEventType
  event_id: string
  payload?: Record<string, unknown>
}
