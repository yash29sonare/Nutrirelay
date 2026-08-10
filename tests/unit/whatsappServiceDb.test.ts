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
    expect(normalizeWhatsAppPhone("+91 00000-00000")).toBe("910000000000")
  })

  it("drops one leading local zero after digit extraction", () => {
    expect(normalizeWhatsAppPhone("00000000000")).toBe("0000000000")
  })

  it("returns null when no digits are available", () => {
    expect(normalizeWhatsAppPhone("not-a-phone")).toBeNull()
  })
})
