import type { TimelineEntry, TimelineSeverity, TimelineCategory } from "@/types/timeline"
import type { EngagementEvent } from "@/types/engagement-events"
import type { EngagementAction } from "@/types/engagement"
import type { ClientSummary } from "@/types/dashboard"

const EVENT_META: Record<
  string,
  { title: string; severity: TimelineSeverity; category: TimelineCategory; icon: string }
> = {
  ACTION_CREATED:    { title: "Action created",     severity: "brand",   category: "action",     icon: "sparkles" },
  ACTION_COMPLETED:  { title: "Action completed",   severity: "success", category: "action",     icon: "checkCircle" },
  ACTION_IGNORED:    { title: "Action ignored",     severity: "warning", category: "action",     icon: "xCircle" },
  ACTION_SNOOZED:    { title: "Action snoozed",     severity: "info",    category: "action",     icon: "clock" },
  ACTION_SUPPRESSED: { title: "Action suppressed",  severity: "warning", category: "action",     icon: "shield" },
  TRAINER_NOTE_ADDED:{ title: "Trainer note added", severity: "info",    category: "event",      icon: "fileText" },
  CLIENT_STATE_UPDATED:{
    title: "Client state updated",
    severity: "info",
    category: "event",
    icon: "refreshCw",
  },
}

const ACTION_TYPE_META: Record<
  string,
  { icon: string; severity: TimelineSeverity; category: TimelineCategory }
> = {
  check_in:    { icon: "userCheck",  severity: "danger",  category: "action" },
  recovery:    { icon: "heart",      severity: "warning", category: "action" },
  message:     { icon: "messageSquare", severity: "brand", category: "action" },
  review:      { icon: "search",     severity: "info",    category: "action" },
  adjust_plan: { icon: "sliders",    severity: "info",    category: "action" },
}

export function mapEngagementEvents(
  events: EngagementEvent[],
  clientId: string,
): TimelineEntry[] {
  return events
    .filter((e) => e.client_id === clientId)
    .map((e) => {
      const meta = EVENT_META[e.event_type] ?? {
        title: e.event_type,
        severity: "info" as TimelineSeverity,
        category: "event" as TimelineCategory,
        icon: "activity",
      }
      const reason =
        e.payload && typeof e.payload === "object" && "reason" in e.payload
          ? String(e.payload.reason)
          : ""
      return {
        id: `evt-${e.id}`,
        timestamp: e.created_at,
        clientId: e.client_id ?? clientId,
        eventType: e.event_type,
        title: meta.title,
        description: reason || meta.title,
        icon: meta.icon,
        severity: meta.severity,
        source: "engagement_event",
        category: meta.category,
        metadata: (e.payload ?? {}) as Record<string, unknown>,
      }
    })
}

export function mapClientState(client: ClientSummary): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  const now = new Date().toISOString()

  if (client.total_meals_logged_today > 0) {
    entries.push({
      id: `sys-meals-${client.client_id}-${now.slice(0, 10)}`,
      timestamp: now,
      clientId: client.client_id,
      eventType: "MEALS_LOGGED",
      title: "Meals logged today",
      description: `${client.total_meals_logged_today} meal${client.total_meals_logged_today !== 1 ? "s" : ""} · ${client.total_calories_today} kcal · ${client.total_protein_today}g protein`,
      icon: "utensilsCrossed",
      severity: client.total_meals_logged_today >= 3 ? "success" : "info",
      source: "client_state",
      category: "compliance",
      metadata: {
        mealsLogged: client.total_meals_logged_today,
        calories: client.total_calories_today,
        protein: client.total_protein_today,
      },
    })
  }

  if (client.active_strike_count > 0) {
    entries.push({
      id: `sys-strikes-${client.client_id}-${now.slice(0, 10)}`,
      timestamp: now,
      clientId: client.client_id,
      eventType: "ACTIVE_STRIKES",
      title: "Active strikes",
      description: `${client.active_strike_count} active strike${client.active_strike_count !== 1 ? "s" : ""} — requires attention`,
      icon: "alertTriangle",
      severity: client.active_strike_count >= 2 ? "danger" : "warning",
      source: "client_state",
      category: "compliance",
      metadata: { strikeCount: client.active_strike_count },
    })
  }

  return entries
}

export function mapEngagementActions(
  actions: EngagementAction[],
  clientId: string,
): TimelineEntry[] {
  return actions
    .filter((a) => a.clientId === clientId || !a.clientId)
    .map((a) => {
      const meta = ACTION_TYPE_META[a.type] ?? {
        icon: "zap",
        severity: "info" as TimelineSeverity,
        category: "action" as TimelineCategory,
      }
      return {
        id: `act-${a.id}`,
        timestamp: a.createdAt,
        clientId: a.clientId || clientId,
        eventType: `ACTION_${a.type.toUpperCase()}`,
        title: a.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: a.reason,
        icon: meta.icon,
        severity: meta.severity,
        source: "engagement_action",
        category: meta.category,
        metadata: {
          priority: a.priority,
          confidence: a.confidence,
          actionType: a.type,
        },
      }
    })
}
