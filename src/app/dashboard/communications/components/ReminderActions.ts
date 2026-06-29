"use server"

import { revalidatePath } from "next/cache"
import { requireTrainer } from "@/lib/api-auth"
import { appendEvents } from "@/lib/events/engagementEventStore"

export async function approveReminder(
  planId: string,
  clientId: string,
): Promise<{ error?: string }> {
  let trainerId: string
  try {
    trainerId = await requireTrainer()
  } catch {
    return { error: "Unauthorized." }
  }

  try {
    await appendEvents(trainerId, [
      {
        client_id: clientId,
        action_id: null,
        event_type: "REMINDER_APPROVED",
        event_id: `approve-rem-${planId}`,
        payload: { reminderId: planId },
      },
    ])
    revalidatePath("/dashboard/communications")
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to approve reminder." }
  }
}

export async function dismissReminder(
  planId: string,
  clientId: string,
): Promise<{ error?: string }> {
  let trainerId: string
  try {
    trainerId = await requireTrainer()
  } catch {
    return { error: "Unauthorized." }
  }

  try {
    await appendEvents(trainerId, [
      {
        client_id: clientId,
        action_id: null,
        event_type: "REMINDER_DISMISSED",
        event_id: `dismiss-rem-${planId}`,
        payload: { reminderId: planId },
      },
    ])
    revalidatePath("/dashboard/communications")
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to dismiss reminder." }
  }
}

export async function snoozeReminder(
  planId: string,
  clientId: string,
): Promise<{ error?: string }> {
  let trainerId: string
  try {
    trainerId = await requireTrainer()
  } catch {
    return { error: "Unauthorized." }
  }

  try {
    await appendEvents(trainerId, [
      {
        client_id: clientId,
        action_id: null,
        event_type: "REMINDER_SNOOZED",
        event_id: `snooze-rem-${planId}`,
        payload: { reminderId: planId },
      },
    ])
    revalidatePath("/dashboard/communications")
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to snooze reminder." }
  }
}
