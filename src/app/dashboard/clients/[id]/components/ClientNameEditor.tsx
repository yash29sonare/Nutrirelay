"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit2 } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface ClientNameEditorProps {
  clientId: string
  initialName: string
}

export function ClientNameEditor({ clientId, initialName }: ClientNameEditorProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveName() {
    const nextName = name.trim()
    if (nextName.length < 2) {
      setError("Enter a valid client name.")
      return
    }

    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/trainer/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_name", fullName: nextName }),
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to update client name")
      }
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update client name")
    } finally {
      setPending(false)
    }
  }

  if (!editing) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        <Edit2 size={13} />
        Edit
      </Button>
    )
  }

  return (
    <div className="flex min-w-[240px] flex-col gap-2 sm:flex-row sm:items-center">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-9 min-w-0 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
        aria-label="Client name"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="brand" loading={pending} onClick={() => void saveName()}>
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setName(initialName)
            setError(null)
            setEditing(false)
          }}
        >
          Cancel
        </Button>
      </div>
      {error ? <p className="text-xs text-[var(--destructive)] sm:w-full">{error}</p> : null}
    </div>
  )
}
