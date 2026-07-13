"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { updateSettingsProfileAction } from "./actions"

interface SettingsProfileFormProps {
  initialDisplayName: string
  initialBusinessName: string
}

const INITIAL_STATE = {
  error: null,
  success: null,
} as { error: string | null; success: string | null }

export function SettingsProfileForm({
  initialDisplayName,
  initialBusinessName,
}: SettingsProfileFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(updateSettingsProfileAction, INITIAL_STATE)

  useEffect(() => {
    if (state.success) {
      router.refresh()
    }
  }, [router, state.success])

  return (
    <form id="profile" action={formAction} className="space-y-4">
      <Input
        label="Display name"
        name="displayName"
        defaultValue={initialDisplayName}
        placeholder="Your name"
        disabled={pending}
      />
      <Input
        label="Business name"
        name="businessName"
        defaultValue={initialBusinessName}
        placeholder="Nutrition practice"
        disabled={pending}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" loading={pending} disabled={pending}>
          Save profile
        </Button>
        {state.error && <p className="text-xs text-[var(--destructive)]">{state.error}</p>}
        {state.success && <p className="text-xs text-[var(--muted)]">{state.success}</p>}
      </div>
    </form>
  )
}
