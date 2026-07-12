import { looksMealRelatedText } from "@/mastra/tools/mealParser"

export type WhatsAppMediaKind = "food_photo" | "progress_photo" | "other_media"

export function classifyImageMessage(input: {
  caption?: string | null
  extractedContent?: string | null
  foodName?: string | null
}): WhatsAppMediaKind {
  const caption = input.caption?.toLowerCase().trim() ?? ""
  const extracted = input.extractedContent?.toLowerCase().trim() ?? ""
  const foodName = input.foodName?.toLowerCase().trim() ?? ""
  const combined = `${caption} ${extracted} ${foodName}`

  if (looksMealRelatedText(combined) || (foodName && foodName !== "unknown" && foodName !== "not_food")) {
    return "food_photo"
  }

  if (/\b(progress|body|physique|check.?in|transformation|weekly progress|weight update)\b/.test(combined)) {
    return "progress_photo"
  }

  return "other_media"
}
