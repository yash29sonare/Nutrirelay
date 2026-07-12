import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDbState = vi.hoisted(() => ({
  trainerClients: [] as Array<{ trainer_id: string; client_id: string; is_active: boolean }>,
  profiles: [] as Array<{ id: string; full_name: string | null }>,
  weeklyReports: [] as Array<{
    id: string
    client_id: string
    report_date: string
    summary: string
    pdf_storage_url: string | null
    created_at: string
    updated_at: string
  }>,
  weeklyReportInArgs: [] as string[][],
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "trainer_clients") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockDbState.trainerClients, error: null })),
          })),
        }
      }

      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            in: vi.fn((_column: string, ids: string[]) => Promise.resolve({
              data: mockDbState.profiles.filter((profile) => ids.includes(profile.id)),
              error: null,
            })),
          })),
        }
      }

      if (table === "weekly_reports") {
        return {
          select: vi.fn(() => ({
            in: vi.fn((_column: string, ids: string[]) => {
              mockDbState.weeklyReportInArgs.push(ids)
              return {
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: mockDbState.weeklyReports.filter((report) => ids.includes(report.client_id)),
                    error: null,
                  })),
                })),
              }
            }),
          })),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  })),
}))

import {
  buildWeeklyReportHistory,
  getSafeWeeklyReportClientIds,
  getTrainerWeeklyReportHistory,
} from "@/lib/dashboard-reads"

describe("weekly report history", () => {
  beforeEach(() => {
    mockDbState.trainerClients = []
    mockDbState.profiles = []
    mockDbState.weeklyReports = []
    mockDbState.weeklyReportInArgs = []
  })

  it("trainer sees only weekly reports for owned clients", async () => {
    mockDbState.trainerClients = [
      { trainer_id: "trainer-a", client_id: "client-1", is_active: true },
      { trainer_id: "trainer-b", client_id: "client-2", is_active: true },
    ]
    mockDbState.profiles = [
      { id: "client-1", full_name: "Owned Client" },
      { id: "client-2", full_name: "Unowned Client" },
    ]
    mockDbState.weeklyReports = [
      {
        id: "report-1",
        client_id: "client-1",
        report_date: "2026-07-13",
        summary: "Owned summary",
        pdf_storage_url: "trainer-a/client-1/2026-07-13.pdf",
        created_at: "2026-07-13T10:00:00Z",
        updated_at: "2026-07-13T10:00:00Z",
      },
      {
        id: "report-2",
        client_id: "client-2",
        report_date: "2026-07-13",
        summary: "Unowned summary",
        pdf_storage_url: "trainer-b/client-2/2026-07-13.pdf",
        created_at: "2026-07-13T10:00:00Z",
        updated_at: "2026-07-13T10:00:00Z",
      },
    ]

    const result = await getTrainerWeeklyReportHistory("trainer-a")

    expect(result.reports).toHaveLength(1)
    expect(result.reports[0]?.client_id).toBe("client-1")
  })

  it("trainer cannot see reports for unowned clients", async () => {
    mockDbState.trainerClients = [
      { trainer_id: "trainer-b", client_id: "client-2", is_active: true },
    ]
    mockDbState.weeklyReports = [
      {
        id: "report-2",
        client_id: "client-2",
        report_date: "2026-07-13",
        summary: "Unowned summary",
        pdf_storage_url: "trainer-b/client-2/2026-07-13.pdf",
        created_at: "2026-07-13T10:00:00Z",
        updated_at: "2026-07-13T10:00:00Z",
      },
    ]

    const result = await getTrainerWeeklyReportHistory("trainer-a")

    expect(result.reports).toEqual([])
  })

  it("ambiguous multi-trainer ownership is excluded and blocked", async () => {
    const ownership = getSafeWeeklyReportClientIds("trainer-a", [
      { trainer_id: "trainer-a", client_id: "client-1", is_active: true },
      { trainer_id: "trainer-b", client_id: "client-1", is_active: true },
    ])

    expect(ownership.safeClientIds).toEqual([])
    expect(ownership.blockedClientIds).toEqual(["client-1"])
  })

  it("returns a clean empty state when no weekly reports exist", async () => {
    mockDbState.trainerClients = [
      { trainer_id: "trainer-a", client_id: "client-1", is_active: true },
    ]
    mockDbState.profiles = [{ id: "client-1", full_name: "Owned Client" }]

    const result = await getTrainerWeeklyReportHistory("trainer-a")

    expect(result.reports).toEqual([])
    expect(result.blocked_client_ids).toEqual([])
  })

  it("filters weekly reports server-side by safe owned client ids", async () => {
    mockDbState.trainerClients = [
      { trainer_id: "trainer-a", client_id: "client-1", is_active: true },
      { trainer_id: "trainer-b", client_id: "client-2", is_active: true },
    ]
    mockDbState.profiles = [{ id: "client-1", full_name: "Owned Client" }]

    await getTrainerWeeklyReportHistory("trainer-a")

    expect(mockDbState.weeklyReportInArgs).toEqual([["client-1"]])
  })

  it("does not expose document storage paths in the read model", () => {
    const reports = buildWeeklyReportHistory({
      reports: [
        {
          id: "report-1",
          client_id: "client-1",
          report_date: "2026-07-13",
          summary: "Owned summary",
          pdf_storage_url: "trainer-a/client-1/2026-07-13.pdf",
          created_at: "2026-07-13T10:00:00Z",
          updated_at: "2026-07-13T10:00:00Z",
        },
      ],
      clientNamesById: new Map([["client-1", "Owned Client"]]),
    })

    expect(reports[0]).toMatchObject({
      client_id: "client-1",
      has_document: true,
    })
    expect("pdf_storage_url" in reports[0]!).toBe(false)
  })
})
