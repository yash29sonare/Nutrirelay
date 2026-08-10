import { describe, expect, it } from "vitest"
import {
  normalizeWhatsAppPhone,
  normalizeWhatsAppPhoneNumberId,
} from "@/lib/whatsapp/service-db"

describe("WhatsApp service DB helpers", () => {
  it("normalizes phone number ids by trimming whitespace", () => {
    expect(normalizeWhatsAppPhoneNumberId(" 123456 ")).toBe("123456")
  })

  it("returns null for blank phone number ids", () => {
    expect(normalizeWhatsAppPhoneNumberId("   ")).toBeNull()
    expect(normalizeWhatsAppPhoneNumberId(null)).toBeNull()
  })

  it("normalizes WhatsApp phone values to digits", () => {
    expect(normalizeWhatsAppPhone("+91 98765-43210")).toBe("919876543210")
  })

  it("drops one leading local zero after digit extraction", () => {
    expect(normalizeWhatsAppPhone("09876543210")).toBe("9876543210")
  })

  it("returns null when no digits are available", () => {
    expect(normalizeWhatsAppPhone("not-a-phone")).toBeNull()
  })
})
