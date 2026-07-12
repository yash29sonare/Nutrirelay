import { describe, expect, it } from "vitest"
import { resolveStructuredReply } from "@/lib/whatsapp/structuredReplies"

describe("structuredReplies", () => {
  it("classifies outside food replies and requests follow-up", () => {
    const result = resolveStructuredReply({
      replyId: "dinner_ate_outside",
      replyLabel: "Ate outside",
    })

    expect(result.outcome).toBe("ate_outside")
    expect(result.needsReview).toBe(true)
    expect(result.followUpMessage).toContain("what you ate")
  })

  it("classifies skipped replies without creating review pressure", () => {
    const result = resolveStructuredReply({
      replyId: "dinner_skipped",
      replyLabel: "Skipped dinner",
    })

    expect(result.outcome).toBe("skipped_meal")
    expect(result.needsReview).toBe(false)
    expect(result.adherenceStatus).toBe("skipped")
  })

  it("treats known dinner selections as followed adherence context", () => {
    const result = resolveStructuredReply({
      replyId: "dinner_paneer_meal",
      replyLabel: "Paneer meal",
    })

    expect(result.outcome).toBe("meal_option_selected")
    expect(result.adherenceStatus).toBe("followed")
    expect(result.followUpMessage).toBeNull()
  })
})
