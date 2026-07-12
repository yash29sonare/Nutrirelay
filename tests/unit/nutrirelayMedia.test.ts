import { describe, expect, it } from "vitest"
import { classifyImageMessage } from "@/lib/whatsapp/media-classification"

describe("NutriRelay media classification", () => {
  it("labels food captions as food photos", () => {
    expect(classifyImageMessage({ caption: "2 roti aur sabzi" })).toBe("food_photo")
  })

  it("labels progress captions without creating food context", () => {
    expect(classifyImageMessage({ caption: "weekly progress" })).toBe("progress_photo")
  })

  it("labels unresolved images as other media", () => {
    expect(classifyImageMessage({ extractedContent: "not a meal" })).toBe("other_media")
  })
})
