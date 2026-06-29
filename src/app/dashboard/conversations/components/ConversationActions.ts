"use server"

import { revalidatePath } from "next/cache"
import { requireTrainer } from "@/lib/api-auth"
import { appendEvents } from "@/lib/events/engagementEventStore"

export async function approveConversation(
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
        event_type: "CONVERSATION_APPROVED",
        event_id: `approve-${planId}`,
        payload: { conversationId: planId },
      },
    ])
    revalidatePath("/dashboard/conversations")
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to approve conversation." }
  }
}

export async function dismissConversation(
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
        event_type: "CONVERSATION_DISMISSED",
        event_id: `dismiss-${planId}`,
        payload: { conversationId: planId },
      },
    ])
    revalidatePath("/dashboard/conversations")
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to dismiss conversation." }
  }
}

export async function snoozeConversation(
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
        event_type: "CONVERSATION_SNOOZED",
        event_id: `snooze-${planId}`,
        payload: { conversationId: planId },
      },
    ])
    revalidatePath("/dashboard/conversations")
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to snooze conversation." }
  }
}
