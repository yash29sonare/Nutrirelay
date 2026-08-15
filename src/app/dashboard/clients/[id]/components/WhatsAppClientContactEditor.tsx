"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/Button"
import { InlineNotice } from "@/components/ui/InlineNotice"
import { updateWhatsAppClientDetailsAction, type WhatsAppClientDetailsActionState } from "../actions"
import type { TrainerWhatsAppClientDetail } from "@/lib/operations/trainer-whatsapp-clients"

const INITIAL_STATE: WhatsAppClientDetailsActionState = {
  ok: false,
  message: "",
}

function fieldClassName(disabled = false): string {
  return [
    "w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--foreground)] outline-none",
    "focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
    disabled ? "cursor-not-allowed opacity-60" : "",
  ].join(" ")
}

export function WhatsAppClientContactEditor({ client }: { client: TrainerWhatsAppClientDetail }) {
  const updateAction = updateWhatsAppClientDetailsAction.bind(null, client.client_id)
  const [state, formAction, pending] = useActionState(updateAction, INITIAL_STATE)
  const reminderTimes = client.meal_reminder_times.join(", ")
  const phoneValue = client.normalized_whatsapp_number ?? client.whatsapp_number ?? ""

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-[var(--muted)]">Client name</span>
          <input
            name="clientName"
            defaultValue={client.client_name}
            minLength={2}
            maxLength={120}
            required
            className={fieldClassName()}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-[var(--muted)]">WhatsApp phone</span>
          <input
            name="whatsappNumber"
            defaultValue={phoneValue}
            disabled={client.phone_edit_locked}
            inputMode="tel"
            className={fieldClassName(client.phone_edit_locked)}
          />
          {client.phone_edit_locked ? <input type="hidden" name="whatsappNumber" value={phoneValue} /> : null}
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-xs font-medium text-[var(--muted)]">Goal</span>
          <textarea
            name="goal"
            defaultValue={client.goal ?? ""}
            rows={2}
            maxLength={500}
            className={fieldClassName()}
          />
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-xs font-medium text-[var(--muted)]">Diet notes</span>
          <textarea
            name="dietNotes"
            defaultValue={client.diet_notes ?? ""}
            rows={3}
            maxLength={1000}
            className={fieldClassName()}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-[var(--muted)]">Meal reminder times</span>
          <input
            name="mealReminderTimes"
            defaultValue={reminderTimes}
            placeholder="09:00, 13:00, 20:00"
            className={fieldClassName()}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-[var(--muted)]">Workout time</span>
          <input
            name="workoutTime"
            type="time"
            defaultValue={client.workout_time ?? ""}
            className={fieldClassName()}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-[var(--muted)]">Client status</span>
          <select name="status" defaultValue={client.status === "inactive" ? "inactive" : "active"} className={fieldClassName()}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className="flex items-center gap-2 pt-6 text-sm text-[var(--foreground)]">
          <input
            name="automationEnabled"
            type="checkbox"
            defaultChecked={client.automation_enabled}
            className="h-4 w-4 rounded border-[var(--surface-border)] bg-[var(--surface-raised)]"
          />
          Automation enabled
        </label>
      </div>

      {client.phone_edit_locked && client.phone_edit_lock_reason ? (
        <InlineNotice variant="warning">{client.phone_edit_lock_reason}</InlineNotice>
      ) : null}

      {state.message ? (
        <InlineNotice variant={state.ok ? "success" : "error"}>{state.message}</InlineNotice>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" variant="brand" loading={pending}>
          Save details
        </Button>
      </div>
    </form>
  )
}
