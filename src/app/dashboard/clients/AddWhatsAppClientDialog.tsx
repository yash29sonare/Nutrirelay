"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Plus, Send } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { InlineNotice } from "@/components/ui/InlineNotice"
import { addWhatsAppClientAction, sendClientOnboardingAction, type AddWhatsAppClientActionState } from "./actions"
import type { OnboardingTemplatePreview } from "@/lib/operations/trainer-whatsapp-clients"

const INITIAL_STATE: AddWhatsAppClientActionState = {
  ok: false,
  message: "",
}

export function AddWhatsAppClientDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<AddWhatsAppClientActionState>(INITIAL_STATE)
  const [pending, startTransition] = useTransition()

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await addWhatsAppClientAction(state, formData)
      setState(result)
      if (result.ok) {
        setOpen(false)
        router.refresh()
      }
    })
  }

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
        <form action={handleAction} className="space-y-4">
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
              {state.message}{state.wamId ? ` WAM ID: ${state.wamId}` : ""}
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

export function SendOnboardingButton({
  clientId,
  preview,
}: {
  clientId: string
  preview: OnboardingTemplatePreview
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<AddWhatsAppClientActionState>(INITIAL_STATE)
  const [pending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      const result = await sendClientOnboardingAction(clientId)
      setState(result)
      if (result.ok) setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        icon={<Send size={13} aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Send onboarding
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Preview onboarding message"
        className="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-4">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--muted)]">Template</p>
                <p className="font-medium text-[var(--foreground)]">{preview.templateName ?? "Unavailable"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Language</p>
                <p className="font-medium text-[var(--foreground)]">{preview.language ?? "Unavailable"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--muted)]">Variables / components</p>
                <p className="font-medium text-[var(--foreground)]">
                  {preview.components.length > 0
                    ? preview.components.map((component) => `${component.type}: ${component.parameters.join(", ")}`).join("; ")
                    : "No variables"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
            <p className="text-xs font-medium uppercase text-[var(--muted)]">Local best preview</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
              {preview.finalPreviewText}
            </p>
            {!preview.exactMetaRenderedTextAvailable ? (
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Exact Meta-rendered text is not fetched by this app; this preview is based on the local approved-template configuration.
              </p>
            ) : null}
          </div>

          <InlineNotice variant="info">{preview.editGuidance}</InlineNotice>

          {state.message ? (
            <InlineNotice variant={state.ok ? "success" : "error"}>
              {state.message}{state.wamId ? ` WAM ID: ${state.wamId}` : ""}
            </InlineNotice>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              icon={<Send size={13} aria-hidden="true" />}
              loading={pending}
              disabled={!preview.available}
              onClick={handleSend}
            >
              Send approved template
            </Button>
          </div>
        </div>
      </Dialog>
      {state.message ? (
        <p className={`max-w-56 text-right text-xs ${state.ok ? "text-emerald-400" : "text-red-300"}`}>
          {state.message}{state.wamId ? ` WAM ID: ${state.wamId}` : ""}
        </p>
      ) : null}
    </div>
  )
}
