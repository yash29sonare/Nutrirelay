export type StructuredMealReplyOutcome =
  | "followed_plan"
  | "ate_alternative"
  | "skipped_meal"
  | "ate_outside"
  | "meal_option_selected"
  | "unknown"

export interface StructuredReplyResolution {
  outcome: StructuredMealReplyOutcome
  selectedOption: string | null
  needsReview: boolean
  followUpMessage: string | null
  adherenceStatus: "followed" | "alternative" | "skipped" | "outside" | "unknown"
}

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

export function resolveStructuredReply(input: {
  replyId?: string | null
  replyLabel?: string | null
}): StructuredReplyResolution {
  const replyId = normalizeValue(input.replyId)
  const replyLabel = normalizeValue(input.replyLabel)
  const combined = `${replyId} ${replyLabel}`.trim()
  const selectedOption = input.replyLabel?.trim() || input.replyId?.trim() || null

  if (!combined) {
    return {
      outcome: "unknown",
      selectedOption,
      needsReview: false,
      followUpMessage: null,
      adherenceStatus: "unknown",
    }
  }

  if (combined.includes("outside")) {
    return {
      outcome: "ate_outside",
      selectedOption,
      needsReview: true,
      followUpMessage: "You marked outside food. Reply with what you ate, or send a photo.",
      adherenceStatus: "outside",
    }
  }

  if (combined.includes("alternative")) {
    return {
      outcome: "ate_alternative",
      selectedOption,
      needsReview: true,
      followUpMessage: "You marked an alternative meal. Reply with what you ate instead, or send a photo.",
      adherenceStatus: "alternative",
    }
  }

  if (combined.includes("skipped")) {
    return {
      outcome: "skipped_meal",
      selectedOption,
      needsReview: false,
      followUpMessage: "No worries. Get back on track with your next planned meal.",
      adherenceStatus: "skipped",
    }
  }

  if (combined.includes("followed plan") || combined.includes("followed")) {
    return {
      outcome: "followed_plan",
      selectedOption,
      needsReview: false,
      followUpMessage: null,
      adherenceStatus: "followed",
    }
  }

  if (
    combined.includes("roti") ||
    combined.includes("rice") ||
    combined.includes("dal") ||
    combined.includes("paneer")
  ) {
    return {
      outcome: "meal_option_selected",
      selectedOption,
      needsReview: false,
      followUpMessage: null,
      adherenceStatus: "followed",
    }
  }

  return {
    outcome: "unknown",
    selectedOption,
    needsReview: false,
    followUpMessage: null,
    adherenceStatus: "unknown",
  }
}
