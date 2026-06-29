import type { EngagementEvent } from "@/types/engagement-events"
import type { TimelineEntry } from "@/types/timeline"
import type { EngagementAction } from "@/types/engagement"
import type { ConversationPlan } from "@/types/conversation"
import type { ReminderPlan } from "@/types/reminder"

// ── Event comparison ─────────────────────────────────────────────────────────

export function expectEventsToContain(
  events: EngagementEvent[],
  expectedType: string,
  expectedClientId?: string,
): void {
  const match = events.find(
    (e) =>
      e.event_type === expectedType &&
      (expectedClientId === undefined || e.client_id === expectedClientId),
  )
  expect(match).toBeDefined()
}

export function expectEventsNotToContain(
  events: EngagementEvent[],
  expectedType: string,
): void {
  const match = events.find((e) => e.event_type === expectedType)
  expect(match).toBeUndefined()
}

export function expectEventCount(
  events: EngagementEvent[],
  expectedType: string,
  count: number,
): void {
  const matches = events.filter((e) => e.event_type === expectedType)
  expect(matches).toHaveLength(count)
}

// ── Stable sorting ───────────────────────────────────────────────────────────

export function expectSortedByPriority<T extends { priority: string }>(
  items: T[],
  order: string[] = ["high", "medium", "low"],
): void {
  for (let i = 1; i < items.length; i++) {
    const prevIdx = order.indexOf(items[i - 1].priority)
    const currIdx = order.indexOf(items[i].priority)
    expect(prevIdx).toBeLessThanOrEqual(currIdx)
  }
}

export function expectSortedByTimestamp<T extends { createdAt?: string; created_at?: string }>(
  items: T[],
  ascending: boolean = true,
): void {
  for (let i = 1; i < items.length; i++) {
    const prev = new Date(items[i - 1].createdAt ?? items[i - 1].created_at ?? 0).getTime()
    const curr = new Date(items[i].createdAt ?? items[i].created_at ?? 0).getTime()
    if (ascending) {
      expect(prev).toBeLessThanOrEqual(curr)
    } else {
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  }
}

// ── Timeline assertions ──────────────────────────────────────────────────────

export function expectTimelineToContain(
  entries: TimelineEntry[],
  eventType: string,
  clientId?: string,
): void {
  const match = entries.find(
    (e) =>
      e.eventType === eventType &&
      (clientId === undefined || e.clientId === clientId),
  )
  expect(match).toBeDefined()
}

export function expectTimelineEntryShape(entry: TimelineEntry): void {
  expect(entry).toHaveProperty("id")
  expect(entry).toHaveProperty("timestamp")
  expect(entry).toHaveProperty("clientId")
  expect(entry).toHaveProperty("eventType")
  expect(entry).toHaveProperty("title")
  expect(entry).toHaveProperty("severity")
  expect(entry).toHaveProperty("source")
  expect(entry).toHaveProperty("category")
  expect(entry).toHaveProperty("metadata")
}

// ── Action assertions ────────────────────────────────────────────────────────

export function expectActionShape(action: EngagementAction): void {
  expect(action).toHaveProperty("id")
  expect(action).toHaveProperty("clientId")
  expect(action).toHaveProperty("clientName")
  expect(action).toHaveProperty("priority")
  expect(action).toHaveProperty("type")
  expect(action).toHaveProperty("reason")
  expect(action).toHaveProperty("confidence")
  expect(action).toHaveProperty("createdAt")
}

export function expectActionsFilteredByPriority(
  actions: EngagementAction[],
  expectedPriorities: string[],
): void {
  for (const action of actions) {
    expect(expectedPriorities).toContain(action.priority)
  }
}

// ── AI response assertions ───────────────────────────────────────────────────

export function expectValidAIResponse(response: { text?: string; object?: unknown }): void {
  expect(response).toBeDefined()
  if (response.text !== undefined) {
    expect(typeof response.text).toBe("string")
    expect(response.text.length).toBeGreaterThan(0)
  }
}

export function expectAIResponseContains(response: { text?: string }, substring: string): void {
  expect(response.text).toBeDefined()
  expect(response.text!.toLowerCase()).toContain(substring.toLowerCase())
}

// ── Plan assertions ──────────────────────────────────────────────────────────

export function expectConversationPlanShape(plan: ConversationPlan): void {
  expect(plan).toHaveProperty("id")
  expect(plan).toHaveProperty("reason")
  expect(plan).toHaveProperty("priority")
  expect(plan).toHaveProperty("channel")
  expect(plan).toHaveProperty("message")
  expect(plan).toHaveProperty("templateId")
  expect(plan).toHaveProperty("context.clientId")
  expect(plan).toHaveProperty("context.trainerId")
  expect(plan).toHaveProperty("createdAt")
}

export function expectReminderPlanShape(plan: ReminderPlan): void {
  expect(plan).toHaveProperty("id")
  expect(plan).toHaveProperty("reason")
  expect(plan).toHaveProperty("priority")
  expect(plan).toHaveProperty("status")
  expect(plan).toHaveProperty("schedule")
  expect(plan).toHaveProperty("message")
  expect(plan).toHaveProperty("templateId")
  expect(plan).toHaveProperty("context.clientId")
  expect(plan).toHaveProperty("context.trainerId")
  expect(plan).toHaveProperty("createdAt")
}
