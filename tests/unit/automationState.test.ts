import { describe, expect, it } from "vitest"
import { deriveClientAutomationState, NO_RESPONSE_WINDOW_MS } from "@/lib/whatsapp/automation-state"

describe("automation-state", () => {
  it("pauses when there is no inbound activity", () => {
    expect(
      deriveClientAutomationState({
        lastInboundAt: null,
        lastPauseMarkerAt: null,
      }),
    ).toBe("paused_no_response")
  })

  it("pauses when the latest inbound is older than 48 hours", () => {
    const now = new Date("2026-07-06T12:00:00.000Z")
    const staleInbound = new Date(now.getTime() - NO_RESPONSE_WINDOW_MS - 1000).toISOString()

    expect(
      deriveClientAutomationState({
        lastInboundAt: staleInbound,
        lastPauseMarkerAt: null,
        now,
      }),
    ).toBe("paused_no_response")
  })

  it("marks resumed_on_inbound when a new reply arrives after a pause marker", () => {
    expect(
      deriveClientAutomationState({
        lastInboundAt: "2026-07-06T10:00:00.000Z",
        lastPauseMarkerAt: "2026-07-05T09:00:00.000Z",
        now: new Date("2026-07-06T12:00:00.000Z"),
      }),
    ).toBe("resumed_on_inbound")
  })
})
