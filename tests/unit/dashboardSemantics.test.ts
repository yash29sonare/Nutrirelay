import { describe, it, expect } from "vitest"
import {
  isClientAtRisk,
  getClientRiskLevel,
  getPerformanceTrend,
  getComplianceState,
} from "@/lib/domain/dashboardSemantics"

describe("dashboardSemantics", () => {
  describe("isClientAtRisk", () => {
    it("returns true when strike count > 0", () => {
      expect(isClientAtRisk({ active_strike_count: 1 })).toBe(true)
      expect(isClientAtRisk({ active_strike_count: 5 })).toBe(true)
    })

    it("returns false when strike count is 0", () => {
      expect(isClientAtRisk({ active_strike_count: 0 })).toBe(false)
    })

    it("handles negative values as not at risk", () => {
      expect(isClientAtRisk({ active_strike_count: -1 })).toBe(false)
    })
  })

  describe("getClientRiskLevel", () => {
    it("returns high for 2+ strikes", () => {
      expect(getClientRiskLevel({ active_strike_count: 2 })).toBe("high")
      expect(getClientRiskLevel({ active_strike_count: 10 })).toBe("high")
    })

    it("returns medium for 1 strike", () => {
      expect(getClientRiskLevel({ active_strike_count: 1 })).toBe("medium")
    })

    it("returns low for 0 strikes", () => {
      expect(getClientRiskLevel({ active_strike_count: 0 })).toBe("low")
    })
  })

  describe("getPerformanceTrend", () => {
    it("returns improving when progress > 5", () => {
      expect(getPerformanceTrend({ activeClients: 5, complianceRate: 0.5, weeklyProgress: 10 })).toBe("improving")
      expect(getPerformanceTrend({ activeClients: 5, complianceRate: 0.5, weeklyProgress: 6 })).toBe("improving")
    })

    it("returns declining when progress < -5", () => {
      expect(getPerformanceTrend({ activeClients: 5, complianceRate: 0.5, weeklyProgress: -10 })).toBe("declining")
      expect(getPerformanceTrend({ activeClients: 5, complianceRate: 0.5, weeklyProgress: -6 })).toBe("declining")
    })

    it("returns stable in the middle range", () => {
      expect(getPerformanceTrend({ activeClients: 5, complianceRate: 0.5, weeklyProgress: 0 })).toBe("stable")
      expect(getPerformanceTrend({ activeClients: 5, complianceRate: 0.5, weeklyProgress: 5 })).toBe("stable")
      expect(getPerformanceTrend({ activeClients: 5, complianceRate: 0.5, weeklyProgress: -5 })).toBe("stable")
    })
  })

  describe("getComplianceState", () => {
    it("returns excellent at 90+", () => {
      expect(getComplianceState({ activeClients: 5, complianceRate: 90, weeklyProgress: 0 }).level).toBe("excellent")
      expect(getComplianceState({ activeClients: 5, complianceRate: 100, weeklyProgress: 0 }).level).toBe("excellent")
    })

    it("returns good at 75-89", () => {
      const state = getComplianceState({ activeClients: 5, complianceRate: 75, weeklyProgress: 0 })
      expect(state.level).toBe("good")
      expect(state.rate).toBe(75)
    })

    it("returns moderate at 50-74", () => {
      expect(getComplianceState({ activeClients: 5, complianceRate: 50, weeklyProgress: 0 }).level).toBe("moderate")
      expect(getComplianceState({ activeClients: 5, complianceRate: 74, weeklyProgress: 0 }).level).toBe("moderate")
    })

    it("returns low at 25-49", () => {
      expect(getComplianceState({ activeClients: 5, complianceRate: 25, weeklyProgress: 0 }).level).toBe("low")
      expect(getComplianceState({ activeClients: 5, complianceRate: 49, weeklyProgress: 0 }).level).toBe("low")
    })

    it("returns critical below 25", () => {
      expect(getComplianceState({ activeClients: 5, complianceRate: 0, weeklyProgress: 0 }).level).toBe("critical")
      expect(getComplianceState({ activeClients: 5, complianceRate: 24, weeklyProgress: 0 }).level).toBe("critical")
    })

    it("handles exact boundary at 90", () => {
      const state = getComplianceState({ activeClients: 5, complianceRate: 90, weeklyProgress: 0 })
      expect(state.level).toBe("excellent")
    })

    it("is deterministic", () => {
      const a = getComplianceState({ activeClients: 5, complianceRate: 75, weeklyProgress: 0 })
      const b = getComplianceState({ activeClients: 5, complianceRate: 75, weeklyProgress: 0 })
      expect(a).toEqual(b)
    })
  })
})
