import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/whatsapp/send", () => ({
  sendTemplateMessage: vi.fn(),
}))

vi.mock("@/lib/events/engagementEventStore", () => ({
  appendEvents: vi.fn().mockResolvedValue(undefined),
  getEvents: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/lib/whatsapp/automation-state", () => ({
  getClientAutomationState: vi.fn().mockResolvedValue("active"),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({ data: [{ id: "c1", phone_number: "+1234567890" }], error: null }),
      })),
    })),
  })),
}))

import { dispatchPlans } from "@/lib/communications/communicationOrchestrator"
import { sendTemplateMessage } from "@/lib/whatsapp/send"
import { appendEvents, getEvents } from "@/lib/events/engagementEventStore"
import { getClientAutomationState } from "@/lib/whatsapp/automation-state"
import { createConversationPlan, createReminderPlan } from "../builders/index"

describe("communicationOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("dispatches conversation plans to WhatsApp", async () => {
    vi.mocked(sendTemplateMessage).mockResolvedValue(undefined)

    const convPlan = createConversationPlan({ clientId: "c1" })
    const result = await dispatchPlans("t1", [convPlan], [])

    expect(result.length).toBeGreaterThan(0)
    const sent = result.filter((r) => r.status === "sent")
    expect(sent.length).toBeGreaterThan(0)
    expect(sendTemplateMessage).toHaveBeenCalled()
  })

  it("dispatches reminder plans to WhatsApp", async () => {
    vi.mocked(sendTemplateMessage).mockResolvedValue(undefined)

    const remPlan = createReminderPlan({ clientId: "c1" })
    const result = await dispatchPlans("t1", [], [remPlan])

    expect(result.length).toBeGreaterThan(0)
    const sent = result.filter((r) => r.status === "sent")
    expect(sent.length).toBeGreaterThan(0)
  })

  it("handles empty plans", async () => {
    const result = await dispatchPlans("t1", [], [])
    expect(result).toHaveLength(0)
  })

  it("skips plans when phone number is missing", async () => {
    vi.mocked(sendTemplateMessage).mockResolvedValue(undefined)

    const result = await dispatchPlans("t1", [], [])
    expect(result).toHaveLength(0)
  })

  it("records failed status when sendTemplateMessage throws", async () => {
    vi.mocked(sendTemplateMessage).mockRejectedValue(new Error("WhatsApp API error"))

    const convPlan = createConversationPlan({ clientId: "c1" })
    const result = await dispatchPlans("t1", [convPlan], [])

    const failed = result.filter((r) => r.status === "failed")
    expect(failed.length).toBeGreaterThan(0)
  })

  it("appends event store entries for each plan", async () => {
    vi.mocked(sendTemplateMessage).mockResolvedValue(undefined)

    const convPlan = createConversationPlan({ clientId: "c1" })
    await dispatchPlans("t1", [convPlan], [])

    expect(appendEvents).toHaveBeenCalled()
  })

  it("is idempotent with dedup", async () => {
    vi.mocked(sendTemplateMessage).mockResolvedValue(undefined)

    const convPlan = createConversationPlan({ clientId: "c1" })
    const result1 = await dispatchPlans("t1", [convPlan], [])
    expect(result1.some((r) => r.status === "sent")).toBe(true)
  })

  it("suppresses outbound automation when the client is paused for no response", async () => {
    vi.mocked(getClientAutomationState).mockResolvedValue("paused_no_response")

    const convPlan = createConversationPlan({ clientId: "c1" })
    const result = await dispatchPlans("t1", [convPlan], [])

    expect(result[0]?.status).toBe("skipped")
    expect(result[0]?.reason).toContain("48h")
    expect(sendTemplateMessage).not.toHaveBeenCalled()
  })
})
