import { describe, it, expect, vi } from "vitest"

const mockDbData = vi.hoisted(() => ({ data: {} as Record<string, unknown> }))

vi.mock("@supabase/supabase-js", () => {
  function makeQuery(tableData: unknown) {
    const data = Array.isArray(tableData) ? tableData : []
    const result = { data, error: null }
    const ordered = {
      limit: vi.fn().mockResolvedValue(result),
      maybeSingle: vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null }),
      single: vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null }),
    }
    const inResult = {
      order: vi.fn(() => ordered),
      limit: vi.fn().mockResolvedValue(result),
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(resolve(result)),
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue(result),
        neq: vi.fn().mockResolvedValue(result),
        in: vi.fn(() => inResult),
        order: vi.fn(() => ordered),
        limit: vi.fn().mockResolvedValue(result),
        maybeSingle: vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null }),
        single: vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null }),
      })),
    }
  }

  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        const tableData = (mockDbData as any).data[table]
        return makeQuery(tableData)
      }),
    })),
  }
})

vi.mock("@/lib/events/engagementEventStore", () => ({
  appendEvents: vi.fn().mockResolvedValue(undefined),
  getEvents: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/lib/meals/mealMapper", () => ({
  mapFoodLogToMealRecord: vi.fn(() => ({
    id: "meal-1", clientId: "c1", trainerId: "t1",
    mealType: "breakfast" as const,
    mealTimestamp: new Date().toISOString(),
    calories: 500, proteinG: 30, carbsG: 60, fatG: 20,
    review: { status: "recorded" as const },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
}))

vi.mock("@/lib/conversations/conversationPlanner", () => ({
  planClientConversation: vi.fn(() => []),
}))

vi.mock("@/lib/reminders/reminderPlanner", () => ({
  planReminders: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/lib/communications/communicationOrchestrator", () => ({
  dispatchPlans: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/lib/format", () => ({
  formatNumber: vi.fn((n: number) => String(n)),
}))

import { runScheduler } from "@/lib/automation/scheduler"
import { planReminders } from "@/lib/reminders/reminderPlanner"

describe("scheduler", () => {
  beforeEach(() => {
    mockDbData.data = {}
  })

  it("returns summary when no trainer_clients exist", async () => {
    mockDbData.data.trainer_clients = []
    const result = await runScheduler()
    expect(result.totalTrainers).toBe(0)
    expect(result.processedTrainers).toBe(0)
    expect(result.failedTrainers).toBe(0)
  })

  it("processes trainers when links exist", async () => {
    mockDbData.data.trainer_clients = [
      { client_id: "c1", trainer_id: "t1" },
      { client_id: "c2", trainer_id: "t1" },
    ]
    const result = await runScheduler()
    expect(result.totalTrainers).toBeGreaterThan(0)
    expect(result.processedTrainers).toBeGreaterThan(0)
  })

  it("handles trainer with no food_logs", async () => {
    mockDbData.data.trainer_clients = [{ client_id: "c1", trainer_id: "t1" }]
    const result = await runScheduler()
    expect(result.totalTrainers).toBe(1)
    expect(result.processedTrainers).toBe(1)
  })

  it("passes skipped breakfast routine metadata into reminder planning", async () => {
    mockDbData.data.trainer_clients = [{ client_id: "c1", trainer_id: "t1" }]
    mockDbData.data.client_workout_schedules = [{
      client_id: "c1",
      breakfast_time: null,
      lunch_time: "14:00:00",
      snack_time: "17:00:00",
      dinner_time: "22:00:00",
    }]
    mockDbData.data.client_onboarding_states = [{
      client_id: "c1",
      collected_data: {
        routine_times: {
          skippedMeals: ["breakfast"],
        },
      },
    }]

    await runScheduler()

    expect(planReminders).toHaveBeenCalledWith(
      "t1",
      expect.arrayContaining([
        expect.objectContaining({
          clientId: "c1",
          routine: expect.objectContaining({
            breakfastTime: null,
            lunchTime: "14:00:00",
            skippedMeals: ["breakfast"],
          }),
        }),
      ]),
      expect.any(Function),
    )
  })
})
