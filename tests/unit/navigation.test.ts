import { describe, expect, it } from "vitest"
import { getNavSections } from "@/lib/navigation"

describe("trainer navigation", () => {
  it("shows only the simplified trainer workspace", () => {
    const labels = getNavSections(false).flatMap((section) => section.items.map((item) => item.label))
    const hrefs = getNavSections(false).flatMap((section) => section.items.map((item) => item.href))

    expect(labels).toEqual(["Overview", "Clients", "Inbox", "Reports", "Analytics", "Settings"])
    expect(hrefs).not.toContain("/dashboard/automations")
    expect(hrefs).not.toContain("/dashboard/events")
    expect(hrefs).not.toContain("/dashboard/conversations")
    expect(hrefs).not.toContain("/dashboard/voice-notes")
  })

  it("adds admin-only workspace links for admin users", () => {
    const labels = getNavSections(true).flatMap((section) => section.items.map((item) => item.label))
    const hrefs = getNavSections(true).flatMap((section) => section.items.map((item) => item.href))

    expect(labels).toContain("Payment Queue")
    expect(hrefs).toContain("/dashboard/queue")
  })
})
