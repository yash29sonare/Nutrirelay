"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import type { MealRecord } from "@/types/meal"

function numberInputValue(value: number) {
  return Number.isFinite(value) ? String(value) : "0"
}

export function NutritionReviewControls({
  meal,
  mergeCandidates,
}: {
  meal: MealRecord
  mergeCandidates: MealRecord[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    foodText: meal.sourceText ?? meal.notes ?? "",
    calories: numberInputValue(meal.calories),
    proteinG: numberInputValue(meal.proteinG),
    carbsG: numberInputValue(meal.carbsG),
    fatG: numberInputValue(meal.fatG),
    trainerNote: meal.trainerNote ?? "",
    mergedIntoId: "",
  })

  async function patch(key: string, body: Record<string, unknown>) {
    setPending(key)
    setError(null)
    try {
      const response = await fetch(`/api/trainer/nutrition-reviews/${meal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to update review")
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update review")
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="min-w-[220px] space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          loading={pending === "reviewed"}
          onClick={() => void patch("reviewed", { reviewState: "reviewed" })}
        >
          Mark reviewed
        </Button>
        <Button
          size="sm"
          variant="danger"
          loading={pending === "reject"}
          onClick={() => void patch("reject", { reviewState: "rejected" })}
        >
          Reject
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen((current) => !current)}>
          {open ? "Close" : "Edit"}
        </Button>
      </div>

      {open ? (
        <div className="space-y-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/30 p-2">
          <input
            className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-raised)] px-2 py-1 text-xs text-[var(--foreground)]"
            value={form.foodText}
            placeholder="Food text"
            onChange={(event) => setForm((current) => ({ ...current, foodText: event.target.value }))}
          />
          <div className="grid grid-cols-4 gap-1">
            {(["calories", "proteinG", "carbsG", "fatG"] as const).map((key) => (
              <input
                key={key}
                className="min-w-0 rounded-md border border-[var(--surface-border)] bg-[var(--surface-raised)] px-2 py-1 text-xs text-[var(--foreground)]"
                value={form[key]}
                inputMode="decimal"
                aria-label={key}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              />
            ))}
          </div>
          <textarea
            className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-raised)] px-2 py-1 text-xs text-[var(--foreground)]"
            rows={2}
            value={form.trainerNote}
            placeholder="Trainer note"
            onChange={(event) => setForm((current) => ({ ...current, trainerNote: event.target.value }))}
          />
          {mergeCandidates.length > 0 ? (
            <select
              className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-raised)] px-2 py-1 text-xs text-[var(--foreground)]"
              value={form.mergedIntoId}
              onChange={(event) => setForm((current) => ({ ...current, mergedIntoId: event.target.value }))}
            >
              <option value="">Merge into...</option>
              {mergeCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {(candidate.sourceText ?? candidate.mealType).slice(0, 40)}
                </option>
              ))}
            </select>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="brand"
              loading={pending === "correct"}
              onClick={() => void patch("correct", {
                reviewState: "corrected",
                foodText: form.foodText,
                calories: form.calories,
                proteinG: form.proteinG,
                carbsG: form.carbsG,
                fatG: form.fatG,
                trainerNote: form.trainerNote,
              })}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!form.mergedIntoId}
              loading={pending === "merge"}
              onClick={() => void patch("merge", {
                reviewState: "merged",
                mergedIntoId: form.mergedIntoId,
                trainerNote: form.trainerNote,
              })}
            >
              Merge
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-xs text-[var(--destructive)]">{error}</p> : null}
    </div>
  )
}
