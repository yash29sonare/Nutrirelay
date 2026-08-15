"use client"

import { useActionState, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { InlineNotice } from "@/components/ui/InlineNotice"
import { addWhatsAppClientAction, type AddWhatsAppClientActionState } from "./actions"

const INITIAL_STATE: AddWhatsAppClientActionState = {
  ok: false,
  message: "",
}

export function AddWhatsAppClientDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(addWhatsAppClientAction, INITIAL_STATE)

  return (
    <>
      <Button
        type="button"
        variant="brand"
        icon={<Plus size={15} aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Add Client
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Add WhatsApp client">
        <form action={formAction} className="space-y-4">
          <Input
            label="Client name"
            name="clientName"
            placeholder="Client name"
            autoComplete="off"
            required
            minLength={2}
            maxLength={120}
          />
          <Input
            label="WhatsApp number"
            name="whatsappNumber"
            placeholder="Enter client WhatsApp number"
            inputMode="tel"
            autoComplete="tel"
            required
          />
          <Textarea
            label="Onboarding goal"
            name="goal"
            placeholder="Example: Improve protein consistency and daily meal logging"
            required
            minLength={3}
            maxLength={500}
          />
          <Textarea
            label="Diet notes"
            name="dietNotes"
            placeholder="Optional notes for coaching context"
            maxLength={1000}
          />

          {state.message ? (
            <InlineNotice variant={state.ok ? "success" : "error"}>
              {state.message}
            </InlineNotice>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" loading={pending}>
              Add Client
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
