"use client"

import { useState, useTransition } from "react"
import type { MealRecord } from "@/types/meal"
import type { MealAIResult } from "@/types/meal-ai"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { InlineNotice } from "@/components/ui/InlineNotice"
import { formatMealType, formatReviewStatus } from "@/lib/meals/mealFormatting"
import { formatDateTime, formatNumber } from "@/lib/format"
import { approveMeal, rejectMeal } from "./MealReviewActions"
import {
  CheckCircle, XCircle, UtensilsCrossed, AlertTriangle,
  Info, HelpCircle, Image,
} from "lucide-react"

const CONFIDENCE_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  high: "success",
  medium: "warning",
  low: "danger",
}

function ConfidenceBadge({ level }: { level: string }) {
  return (
    <Badge variant={CONFIDENCE_VARIANT[level] ?? "default"} className="capitalize">
      {level}
    </Badge>
  )
}

function MealInfoCard({ meal }: { meal: MealRecord }) {
  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={14} className="text-[var(--muted)]" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                {formatMealType(meal.mealType)}
              </h3>
              <Badge
                variant={
                  meal.review.status === "verified"
                    ? "success"
                    : meal.review.status === "unverified"
                      ? "warning"
                      : meal.review.status === "pending"
                        ? "info"
                        : "default"
                }
              >
                {formatReviewStatus(meal.review.status)}
              </Badge>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {formatDateTime(meal.mealTimestamp)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-xs text-[var(--muted)]">Calories</p>
            <p className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
              {formatNumber(meal.calories)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Protein</p>
            <p className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
              {formatNumber(meal.proteinG)}g
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Carbs</p>
            <p className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
              {formatNumber(meal.carbsG)}g
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Fat</p>
            <p className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
              {formatNumber(meal.fatG)}g
            </p>
          </div>
        </div>

        {meal.attachment && (
          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
            <Image size={12} />
            <span>Photo attached</span>
          </div>
        )}

        {meal.notes && (
          <p className="mt-3 text-xs text-[var(--muted)] italic">
            &ldquo;{meal.notes}&rdquo;
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function AIAnalysisCard({ ai }: { ai: MealAIResult }) {
  return (
    <Card className="border-brand-500/20 bg-brand-500/[0.02]">
      <CardContent className="py-4 px-5 space-y-4">
        <div className="flex items-center gap-1.5">
          <Info size={14} className="text-brand-500" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            AI Analysis
          </h3>
          <ConfidenceBadge level={ai.confidence.overall} />
        </div>

        <p className="text-xs text-[var(--muted)] leading-relaxed">
          {ai.summary}
        </p>

        {/* Detected foods */}
        {ai.detectedFoods.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Detected foods
            </h4>
            <div className="space-y-1.5">
              {ai.detectedFoods.map((food, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[var(--foreground)] truncate">{food.name}</span>
                    <span className="text-[var(--muted)] text-xs shrink-0">
                      {food.estimatedPortion}
                    </span>
                  </div>
                  <ConfidenceBadge level={food.confidence} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence scores */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--muted)]">Macros:</span>
            <ConfidenceBadge level={ai.confidence.macos} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--muted)]">Food detection:</span>
            <ConfidenceBadge level={ai.confidence.foodDetection} />
          </div>
        </div>

        {/* Missing information */}
        {ai.missingInformation.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={11} />
              Missing information
            </h4>
            {ai.missingInformation.map((m, i) => (
              <p key={i} className="text-xs text-[var(--warning)]">
                {m.field}: {m.description}
              </p>
            ))}
          </div>
        )}

        {/* Observations */}
        {ai.observations.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              Observations
            </h4>
            {ai.observations.map((o, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-[var(--muted)] shrink-0">[{o.category}]</span>
                <span className="text-[var(--foreground)]">{o.observation}</span>
                <ConfidenceBadge level={o.confidence} />
              </div>
            ))}
          </div>
        )}

        {/* Suggested questions */}
        {ai.questions.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
              <HelpCircle size={11} />
              Suggested follow-up questions
            </h4>
            {ai.questions.map((q, i) => (
              <div key={i} className="text-xs space-y-0.5">
                <p className="text-[var(--foreground)]">{q.question}</p>
                <p className="text-[var(--muted)]">{q.reason}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReviewControls({
  meal,
  onComplete,
}: {
  meal: MealRecord
  onComplete: () => void
}) {
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  if (meal.review.status !== "recorded" && meal.review.status !== "pending") {
    return null
  }

  function handleApprove() {
    setError("")
    startTransition(async () => {
      const result = await approveMeal(meal.id)
      if (result.error) {
        setError(result.error)
      } else {
        onComplete()
      }
    })
  }

  function handleReject() {
    setError("")
    startTransition(async () => {
      const result = await rejectMeal(meal.id, notes || undefined)
      if (result.error) {
        setError(result.error)
      } else {
        onComplete()
      }
    })
  }

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-3">
        {error && <InlineNotice variant="error">{error}</InlineNotice>}

        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--muted)]">
            Review notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this meal..."
            rows={2}
            disabled={isPending}
            className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="brand"
            size="sm"
            icon={<CheckCircle size={14} />}
            loading={isPending}
            onClick={handleApprove}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<XCircle size={14} />}
            loading={isPending}
            onClick={handleReject}
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface MealReviewWorkspaceProps {
  meal: MealRecord
  aiResult: MealAIResult
}

export function MealReviewWorkspace({ meal, aiResult }: MealReviewWorkspaceProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
        <CheckCircle size={14} />
        Meal review
      </h2>

      <MealInfoCard meal={meal} />
      <AIAnalysisCard ai={aiResult} />
      <ReviewControls meal={meal} onComplete={() => setDismissed(true)} />
    </div>
  )
}
