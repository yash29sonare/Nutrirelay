"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, Save } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { InlineNotice } from "@/components/ui/InlineNotice"
import {
  saveClientCustomMessageDraftAction,
  sendClientCustomMessageAction,
  type WhatsAppClientDetailsActionState,
} from "../actions"
import type { TrainerClientMessageDraft } from "@/lib/operations/trainer-whatsapp-clients"

const INITIAL_STATE: WhatsAppClientDetailsActionState = {
  ok: false,
  message: "",
}

const STARTERS = [
  {
    label: "Diet plan",
    title: "Diet plan",
    body: "Here is your diet focus for today:\n\nBreakfast:\nLunch:\nSnack:\nDinner:\n\nReply with your meal photos and any swaps you need.",
  },
  {
    label: "Missed meal follow-up",
    title: "Missed meal follow-up",
    body: "I noticed a meal update is missing today. Please send what you ate, an estimate, or a photo when you can.",
  },
  {
    label: "Photo clarification",
    title: "Photo clarification",
    body: "Please clarify the portion size and ingredients for the last food photo so I can log it accurately.",
  },
  {
    label: "Hydration reminder",
    title: "Hydration reminder",
    body: "Quick hydration check: please aim for steady water intake through the day and reply if you are feeling unusually hungry or tired.",
  },
]

function fieldClassName(): string {
  return [
    "w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--foreground)] outline-none",
    "focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
  ].join(" ")
}

export function CustomMessageComposer({
  clientId,
  draft,
  canSend,
  windowMessage,
}: {
  clientId: string
  draft: TrainerClientMessageDraft | null
  canSend: boolean
  windowMessage: string
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [title, setTitle] = useState(draft?.title ?? "")
  const [body, setBody] = useState(draft?.body ?? "")
  const [state, setState] = useState<WhatsAppClientDetailsActionState>(INITIAL_STATE)
  const [pendingAction, setPendingAction] = useState<"save" | "send" | null>(null)
  const [pending, startTransition] = useTransition()

  function runAction(kind: "save" | "send") {
    const formData = formRef.current ? new FormData(formRef.current) : new FormData()
    setPendingAction(kind)
    setState(INITIAL_STATE)
    startTransition(async () => {
      const result = kind === "save"
        ? await saveClientCustomMessageDraftAction(clientId, INITIAL_STATE, formData)
        : await sendClientCustomMessageAction(clientId, INITIAL_STATE, formData)
      setState(result)
      setPendingAction(null)
      if (result.ok) router.refresh()
    })
  }

  return (
    <form ref={formRef} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STARTERS.map((starter) => (
          <Button
            key={starter.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setTitle(starter.title)
              setBody(starter.body)
            }}
          >
            {starter.label}
          </Button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-[var(--muted)]">Message title</span>
        <input
          name="messageTitle"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          className={fieldClassName()}
          placeholder="Optional"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-[var(--muted)]">Message body</span>
        <textarea
          name="messageBody"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          rows={7}
          maxLength={4000}
          className={fieldClassName()}
          placeholder="Write the client-specific diet plan, follow-up, or instruction."
        />
      </label>

      {!canSend ? (
        <InlineNotice variant="warning">The 24-hour WhatsApp window is closed. Send an approved template first.</InlineNotice>
      ) : (
        <InlineNotice variant="info">{windowMessage}</InlineNotice>
      )}

      {state.message ? (
        <InlineNotice variant={state.ok ? "success" : "error"}>{state.message}</InlineNotice>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          icon={<Save size={14} aria-hidden="true" />}
          loading={pending && pendingAction === "save"}
          disabled={pending}
          onClick={() => runAction("save")}
        >
          Save draft
        </Button>
        <Button
          type="button"
          variant="brand"
          icon={<Send size={14} aria-hidden="true" />}
          loading={pending && pendingAction === "send"}
          disabled={pending || !canSend}
          onClick={() => runAction("send")}
        >
          Send now
        </Button>
      </div>
    </form>
  )
}
