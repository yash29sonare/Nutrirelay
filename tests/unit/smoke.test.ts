import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createMeal,
  createClient,
  createConversationPlan,
  createReminderPlan,
  createAction,
  createEvent,
  createTimelineEntry,
  createDashboardData,
  resetCounter,
} from "../builders/index"
import {
  mealComplete,
  mealLowCalorie,
  conversationHigh,
  conversationMedium,
  reminderOverdue,
  actionHigh,
  eventMealRecorded,
  timelineMealLogged,
  dashboardSingleClient,
} from "../fixtures/index"
import {
  createMockAIGateway,
  createMockSupabase,
  createMockEventStore,
  createMockCommunicationPipeline,
  createMockWhatsAppSender,
} from "../mocks/index"
import {
  expectConversationPlanShape,
  expectReminderPlanShape,
  expectActionShape,
  expectTimelineEntryShape,
  expectSortedByPriority,
  expectEventsToContain,
  expectValidAIResponse,
} from "../helpers/index"

beforeEach(() => {
  resetCounter()
})

// ── Builders ──────────────────────────────────────────────────────────────────

describe("builders", () => {
  it("createMeal produces valid defaults", () => {
    const meal = createMeal()
    expect(meal.id).toMatch(/^meal-/)
    expect(meal.clientId).toBe("client-1")
    expect(meal.trainerId).toBe("trainer-1")
    expect(meal.calories).toBe(650)
    expect(meal.mealType).toBe("lunch")
  })

  it("createMeal accepts overrides", () => {
    const meal = createMeal({ calories: 100, mealType: "breakfast", clientId: "client-99" })
    expect(meal.calories).toBe(100)
    expect(meal.mealType).toBe("breakfast")
    expect(meal.clientId).toBe("client-99")
  })

  it("createMeal with attachment", () => {
    const meal = createMeal({ hasAttachment: true })
    expect(meal.attachment).toBeDefined()
    expect(meal.attachment!.type).toBe("image")
  })

  it("createClient produces valid defaults", () => {
    const client = createClient()
    expect(client.client_id).toMatch(/^client-/)
    expect(client.client_name).toBe("Test Client")
    expect(client.total_meals_logged_today).toBe(2)
  })

  it("createClient accepts overrides", () => {
    const client = createClient({ clientName: "Alice", mealsLoggedToday: 5, strikeCount: 3 })
    expect(client.client_name).toBe("Alice")
    expect(client.total_meals_logged_today).toBe(5)
    expect(client.active_strike_count).toBe(3)
  })

  it("createConversationPlan produces valid defaults", () => {
    const plan = createConversationPlan()
    expectConversationPlanShape(plan)
    expect(plan.reason).toBe("low_information")
    expect(plan.priority).toBe("medium")
  })

  it("createConversationPlan accepts overrides", () => {
    const plan = createConversationPlan({ reason: "missing_attachment", priority: "high" })
    expect(plan.reason).toBe("missing_attachment")
    expect(plan.priority).toBe("high")
  })

  it("createReminderPlan produces valid defaults", () => {
    const plan = createReminderPlan()
    expectReminderPlanShape(plan)
    expect(plan.reason).toBe("meal_overdue")
  })

  it("createReminderPlan accepts overrides", () => {
    const plan = createReminderPlan({ reason: "daily_check_in", priority: "low" })
    expect(plan.reason).toBe("daily_check_in")
    expect(plan.priority).toBe("low")
  })

  it("createAction produces valid defaults", () => {
    const action = createAction()
    expectActionShape(action)
    expect(action.priority).toBe("medium")
  })

  it("createAction accepts overrides", () => {
    const action = createAction({ priority: "high", confidence: 0.99 })
    expect(action.priority).toBe("high")
    expect(action.confidence).toBe(0.99)
  })

  it("createEvent produces valid defaults", () => {
    const event = createEvent()
    expect(event.event_type).toBe("MEAL_RECORDED")
    expect(event.client_id).toBe("client-1")
    expect(event.trainer_id).toBe("trainer-1")
  })

  it("createEvent accepts overrides", () => {
    const event = createEvent({ eventType: "CONVERSATION_PLANNED", clientId: "client-2" })
    expect(event.event_type).toBe("CONVERSATION_PLANNED")
    expect(event.client_id).toBe("client-2")
  })

  it("createTimelineEntry produces valid defaults", () => {
    const entry = createTimelineEntry()
    expectTimelineEntryShape(entry)
    expect(entry.source).toBe("food_log")
  })

  it("createDashboardData produces valid defaults", () => {
    const data = createDashboardData()
    expect(data.version).toBe("v1")
    expect(data.metrics.activeClients).toBe(1)
    expect(data.clients).toHaveLength(1)
  })

  it("builders are deterministic (sequential IDs differ)", () => {
    const m1 = createMeal()
    const m2 = createMeal()
    expect(m1.id).not.toBe(m2.id)
  })
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

describe("fixtures", () => {
  it("mealComplete has attachment", () => {
    expect(mealComplete.calories).toBe(650)
    expect(mealComplete.attachment).toBeDefined()
  })

  it("mealLowCalorie has very low calories", () => {
    expect(mealLowCalorie.calories).toBe(30)
    expect(mealLowCalorie.attachment).toBeUndefined()
  })

  it("conversation fixtures have descending priority", () => {
    expect(conversationHigh.priority).toBe("high")
    expect(conversationMedium.priority).toBe("medium")
  })

  it("reminderOverdue is active", () => {
    expect(reminderOverdue.reason).toBe("meal_overdue")
    expect(reminderOverdue.status).toBe("active")
  })

  it("action fixtures have correct shape", () => {
    expectActionShape(actionHigh)
    expect(actionHigh.priority).toBe("high")
  })

  it("event fixtures have correct types", () => {
    expect(eventMealRecorded.event_type).toBe("MEAL_RECORDED")
    expect(eventMealRecorded.payload?.mealId).toBe("meal-complete-1")
  })

  it("timeline fixtures have correct source", () => {
    expect(timelineMealLogged.source).toBe("food_log")
    expectTimelineEntryShape(timelineMealLogged)
  })

  it("dashboard fixture has expected structure", () => {
    expect(dashboardSingleClient.version).toBe("v1")
    expect(dashboardSingleClient.clients).toHaveLength(1)
    expect(dashboardSingleClient.trainer.business_name).toBe("Test Gym")
  })
})

// ── Mocks ─────────────────────────────────────────────────────────────────────

describe("mocks", () => {
  it("createMockAIGateway returns working mock", async () => {
    const ai = createMockAIGateway()
    const result = await ai.generateText()
    expect(result.text).toBe("Mock AI response")
    expectValidAIResponse(result)
  })

  it("createMockSupabase returns chainable query", async () => {
    const supabase = createMockSupabase()
    const result = await supabase.from("food_logs").select("*").eq("id", "x").single()
    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
  })

  it("createMockEventStore stores and retrieves", async () => {
    const events = [createEvent({ eventType: "MEAL_RECORDED" })]
    const store = createMockEventStore(events)
    const result = await store.getEvents("trainer-1")
    expect(result).toHaveLength(1)
    expect(result[0].event_type).toBe("MEAL_RECORDED")
  })

  it("createMockCommunicationPipeline returns working mock", async () => {
    const comms = createMockCommunicationPipeline()
    await comms.sendTemplateMessage("t1", "+123", "meal_confirmation", ["name", "meal", "500"])
    expect(comms.sendTemplateMessage).toHaveBeenCalledOnce()
  })

  it("createMockWhatsAppSender returns working mock", async () => {
    const wa = createMockWhatsAppSender()
    await wa.sendFreeMessage("t1", "+123", "hello")
    expect(wa.sendFreeMessage).toHaveBeenCalledWith("t1", "+123", "hello")
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

describe("helpers", () => {
  it("expectEventsToContain finds matching event", () => {
    const events = [createEvent({ eventType: "MEAL_RECORDED" })]
    expect(() => expectEventsToContain(events, "MEAL_RECORDED")).not.toThrow()
    expect(() => expectEventsToContain(events, "CONVERSATION_PLANNED")).toThrow()
  })

  it("expectSortedByPriority validates priority ordering", () => {
    const items = [
      createConversationPlan({ priority: "high" }),
      createConversationPlan({ priority: "medium" }),
      createConversationPlan({ priority: "low" }),
    ]
    expect(() => expectSortedByPriority(items)).not.toThrow()
  })

  it("expectSortedByPriority rejects unsorted", () => {
    const items = [
      createConversationPlan({ priority: "low" }),
      createConversationPlan({ priority: "high" }),
    ]
    expect(() => expectSortedByPriority(items)).toThrow()
  })
})
