import { vi } from "vitest"
import type { EngagementEvent, EngagementEventInput } from "@/types/engagement-events"

// ── AI Gateway mock ──────────────────────────────────────────────────────────

export interface MockAIGateway {
  generateText: ReturnType<typeof vi.fn>
  generateObject: ReturnType<typeof vi.fn>
}

export function createMockAIGateway(): MockAIGateway {
  return {
    generateText: vi.fn().mockResolvedValue({ text: "Mock AI response" }),
    generateObject: vi.fn().mockResolvedValue({ object: {} }),
  }
}

// ── Supabase mock ────────────────────────────────────────────────────────────

export interface MockSupabaseQuery {
  select: ReturnType<typeof vi.fn>
  from: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  range: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
}

function mockQueryResult(data: unknown) {
  const chain: MockSupabaseQuery = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data, error: null }),
    update: vi.fn().mockResolvedValue({ data, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  return chain
}

export function createMockSupabase() {
  return {
    from: vi.fn().mockReturnValue(mockQueryResult([])),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "trainer-1" } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    schema: vi.fn().mockReturnThis(),
  }
}

// ── Event Store mock ─────────────────────────────────────────────────────────

export interface MockEventStore {
  appendEvents: ReturnType<typeof vi.fn>
  getEvents: ReturnType<typeof vi.fn>
  getClientEvents: ReturnType<typeof vi.fn>
}

export function createMockEventStore(events?: EngagementEvent[]): MockEventStore {
  return {
    appendEvents: vi.fn().mockResolvedValue(undefined),
    getEvents: vi.fn().mockResolvedValue(events ?? []),
    getClientEvents: vi.fn().mockResolvedValue(events ?? []),
  }
}

// ── Communication pipeline mock ──────────────────────────────────────────────

export interface MockCommunicationPipeline {
  sendTemplateMessage: ReturnType<typeof vi.fn>
  sendMessage: ReturnType<typeof vi.fn>
  sendFreeMessage: ReturnType<typeof vi.fn>
  dispatchPlans: ReturnType<typeof vi.fn>
}

export function createMockCommunicationPipeline(): MockCommunicationPipeline {
  return {
    sendTemplateMessage: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    sendFreeMessage: vi.fn().mockResolvedValue(undefined),
    dispatchPlans: vi.fn().mockResolvedValue([]),
  }
}

// ── WhatsApp sender mock ─────────────────────────────────────────────────────

export interface MockWhatsAppSender {
  sendTemplateMessage: ReturnType<typeof vi.fn>
  sendMessage: ReturnType<typeof vi.fn>
  sendFreeMessage: ReturnType<typeof vi.fn>
  sendDocumentMessage: ReturnType<typeof vi.fn>
}

export function createMockWhatsAppSender(): MockWhatsAppSender {
  return {
    sendTemplateMessage: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    sendFreeMessage: vi.fn().mockResolvedValue(undefined),
    sendDocumentMessage: vi.fn().mockResolvedValue(undefined),
  }
}

// ── Date/time mock helper ────────────────────────────────────────────────────

export function mockDateTime(isoString: string): void {
  const now = new Date(isoString).valueOf()
  vi.setSystemTime(now)
}

export function resetDateTime(): void {
  vi.useRealTimers()
}
