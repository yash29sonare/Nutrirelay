import { describe, expect, it } from "vitest"
import { estimateMealFromText, looksMealRelatedText } from "@/mastra/tools/mealParser"

describe("mealParser", () => {
  it("extracts Hinglish quantities for meal text", () => {
    const result = estimateMealFromText("Aaj breakfast me 2 anda aur 1 banana khaya")

    expect(result?.food_name).toContain("anda")
    expect(result?.food_name).toContain("banana")
    expect(result?.estimated_calories).toBe(261)
  })

  it("recognizes Hindi meal text", () => {
    const result = estimateMealFromText("आज नाश्ते में 2 अंडे और 1 केला खाया")

    expect(result?.food_name).toContain("अंडे")
    expect(result?.food_name).toContain("केला")
    expect(result?.protein_g).toBeGreaterThan(10)
  })

  it("does not classify non-diet Hinglish text as meal-related", () => {
    expect(looksMealRelatedText("kal call karna")).toBe(false)
    expect(estimateMealFromText("kal call karna")).toBeNull()
  })
})
