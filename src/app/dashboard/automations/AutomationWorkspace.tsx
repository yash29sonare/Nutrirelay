"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { InlineNotice } from "@/components/ui/InlineNotice"
import { cn } from "@/lib/utils"
import { Bot, CheckCircle2, Clock3, ImageOff, Loader2, ShieldAlert, Sparkles } from "lucide-react"

type AutomationKey =
  | "meal_reminders_enabled"
  | "ghosting_detection_enabled"
  | "weekly_reports_enabled"
  | "monthly_reports_enabled"
  | "goal_prediction_enabled"
  | "escalation_enabled"

interface AutomationState {
  id?: string
  meal_reminders_enabled?: boolean
  weekly_reports_enabled?: boolean
  monthly_reports_enabled?: boolean
  ghosting_detection_enabled?: boolean
  escalation_enabled?: boolean
  goal_prediction_enabled?: boolean
  updated_at?: string
}

interface PendingPhoto {
  id: string
  client_id: string
  image_path: string
  logged_at: string
  notes: string | null
}

interface AutomationDescriptor {
  key: AutomationKey
  label: string
  description: string
  group: string
}

interface AutomationWorkspaceProps {
  initialConfig: AutomationState | null
  initialPhotos: PendingPhoto[]
}

const AUTOMATIONS: AutomationDescriptor[] = [
  {
    key: "meal_reminders_enabled",
    label: "Meal nudges",
    description: "Queues follow-up nudges when logging drops off or a client misses expected meals.",
    group: "Client follow-up",
  },
  {
    key: "ghosting_detection_enabled",
    label: "Ghosting detection",
    description: "Flags likely churn risk and prepares intervention prompts from engagement gaps.",
    group: "Client follow-up",
  },
  {
    key: "escalation_enabled",
    label: "Escalation routing",
    description: "Raises high-risk cases into the trainer review flow when automated follow-up is not enough.",
    group: "Operations",
  },
  {
    key: "goal_prediction_enabled",
    label: "Goal projections",
    description: "Generates projected goal success signals from compliance and progress patterns.",
    group: "Insights",
  },
  {
    key: "weekly_reports_enabled",
    label: "Weekly reports",
    description: "Builds weekly report payloads for trainer-facing client review and follow-up planning.",
    group: "Insights",
  },
  {
    key: "monthly_reports_enabled",
    label: "Monthly reports",
    description: "Builds monthly projection and compliance report payloads for long-range review.",
    group: "Insights",
  },
]

const BACKGROUND_JOBS = [
  "compliance-batch",
  "renewal-engine",
  "scheduler",
  "storage-pruner",
  "weekly-report",
  "monthly-projections",
]

const SAFE_INITIAL_CONFIG: Record<AutomationKey, boolean> = {
  meal_reminders_enabled: false,
  ghosting_detection_enabled: false,
  weekly_reports_enabled: false,
  monthly_reports_enabled: false,
  goal_prediction_enabled: false,
  escalation_enabled: false,
}

function formatTimestamp(value: string | undefined) {
  if (!value) return "Not updated yet"
  return new Date(value).toLocaleString()
}

function groupAutomations(config: AutomationState | null) {
  const groups = new Map<string, AutomationDescriptor[]>()

  for (const automation of AUTOMATIONS) {
    const items = groups.get(automation.group) ?? []
    items.push(automation)
    groups.set(automation.group, items)
  }

  return [...groups.entries()].map(([title, items]) => ({
    title,
    items: items.map((item) => ({
      ...item,
      enabled: Boolean(config?.[item.key]),
    })),
  }))
}

export function AutomationWorkspace({ initialConfig, initialPhotos }: AutomationWorkspaceProps) {
  const [config, setConfig] = useState<AutomationState | null>(initialConfig)
  const [photos, setPhotos] = useState<PendingPhoto[]>(initialPhotos)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
  const isPending = pendingLabel !== null

  async function loadWorkspace() {
    setError(null)

    try {
      const [automationRes, photoRes] = await Promise.all([
        fetch("/api/trainer/automations", { cache: "no-store" }),
        fetch("/api/trainer/photos/pending", { cache: "no-store" }),
      ])

      const automationJson = await automationRes.json()
      const photoJson = await photoRes.json()

      if (!automationRes.ok) {
        throw new Error(automationJson.error ?? "Unable to load automations")
      }

      if (!photoRes.ok) {
        throw new Error(photoJson.error ?? "Unable to load pending photo review")
      }

      setConfig(automationJson.automations)
      setPhotos(Array.isArray(photoJson.photos) ? photoJson.photos : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load automation workspace")
    }
  }

  async function runAutomationAction(action: string, body: Record<string, unknown>, successMessage: string) {
    setFeedback(null)
    setError(null)
    setPendingLabel(action)

    try {
      const response = await fetch("/api/trainer/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error ?? `Unable to ${action}`)
      }

      setFeedback(successMessage)
      await loadWorkspace()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action}`)
    } finally {
      setPendingLabel(null)
    }
  }

  async function handleCreateConfig() {
    await runAutomationAction(
      "create automation config",
      { action: "create", config: SAFE_INITIAL_CONFIG },
      "Automation controls are initialized and remain off until you enable them.",
    )
  }

  async function handleToggle(automationKey: AutomationKey, nextEnabled: boolean) {
    await runAutomationAction(
      nextEnabled ? "enable automation" : "disable automation",
      {
        action: nextEnabled ? "enable" : "disable",
        automation_key: automationKey,
      },
      `${nextEnabled ? "Enabled" : "Disabled"} ${AUTOMATIONS.find((item) => item.key === automationKey)?.label ?? "automation"}.`,
    )
  }

  async function handlePhotoAction(photoId: string, action: "verify" | "reject") {
    setFeedback(null)
    setError(null)
    setPendingLabel(`${action}:${photoId}`)

    try {
      const response = await fetch("/api/trainer/photos/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          food_log_id: photoId,
          ...(action === "reject" ? { reason: "Rejected from automation workspace review queue" } : {}),
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error ?? `Unable to ${action} photo`)
      }

      setPhotos((current) => current.filter((photo) => photo.id !== photoId))
      setFeedback(action === "verify" ? "Photo verified." : "Photo moved back to unverified.")
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : `Unable to ${action} photo`)
    } finally {
      setPendingLabel(null)
    }
  }

  const groups = groupAutomations(config)

  return (
    <div className="space-y-6">
      {error && <InlineNotice variant="error">{error}</InlineNotice>}
      {feedback && <InlineNotice variant="success">{feedback}</InlineNotice>}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Trainer automation controls</CardTitle>
              <CardDescription>
                These toggles control the trainer-owned features already backed by the automation API.
              </CardDescription>
            </div>
            <Badge variant={config ? "success" : "outline"}>
              {config ? "Configured" : "Not initialized"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!config ? (
            <EmptyState
              icon={<Bot size={16} />}
              title="No automation config yet"
              description="Create the trainer automation config with every automation off, then enable only the controls you want."
              action={(
                <Button
                  variant="brand"
                  loading={isPending && pendingLabel === "create automation config"}
                  onClick={() => {
                    void handleCreateConfig()
                  }}
                >
                  Initialize automations
                </Button>
              )}
              className="py-6"
            />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                {groups.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles size={15} className="text-brand-500" />
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">{group.title}</h3>
                    </div>
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <label
                          key={item.key}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/50 p-3"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-[var(--surface-border)] accent-[var(--primary)]"
                            checked={item.enabled}
                            disabled={isPending}
                            onChange={(event) => {
                              void handleToggle(item.key, event.target.checked)
                            }}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--foreground)]">{item.label}</span>
                              <Badge variant={item.enabled ? "success" : "outline"}>
                                {item.enabled ? "On" : "Off"}
                              </Badge>
                            </div>
                            <p className="text-xs leading-5 text-[var(--muted)]">{item.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-overlay)]/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Always-on platform jobs</p>
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      Some background jobs are system-level and are not trainer-specific toggles. They still power the dashboard.
                    </p>
                  </div>
                  <p className="text-xs text-[var(--muted)]">Last updated: {formatTimestamp(config.updated_at)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {BACKGROUND_JOBS.map((job) => (
                    <Badge key={job} variant="outline">
                      {job}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Pending photo verification</CardTitle>
              <CardDescription>
                Review food log photos that are still waiting on manual verification.
              </CardDescription>
            </div>
            <Badge variant={photos.length > 0 ? "warning" : "success"}>
              {photos.length} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {photos.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={16} />}
              title="No photos waiting for review"
              description="The pending verification queue is clear."
              className="py-6"
            />
          ) : (
            photos.map((photo) => {
              const photoActionPending = isPending && pendingLabel?.endsWith(photo.id)

              return (
                <div
                  key={photo.id}
                  className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">Client {photo.client_id.slice(0, 8)}</Badge>
                        <span className="text-xs text-[var(--muted)]">
                          Logged {new Date(photo.logged_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg bg-[var(--surface-overlay)]/40 p-3">
                        <ImageOff size={16} className="mt-0.5 shrink-0 text-[var(--muted)]" />
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-medium text-[var(--foreground)]">Stored image path</p>
                          <p className="break-all text-xs text-[var(--muted)]">{photo.image_path}</p>
                        </div>
                      </div>
                      {photo.notes ? (
                        <p className="text-xs text-[var(--muted)]">Notes: {photo.notes}</p>
                      ) : (
                        <p className="text-xs text-[var(--muted)]">No notes attached to this photo.</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="brand"
                        size="sm"
                        loading={photoActionPending && pendingLabel?.startsWith("verify")}
                        onClick={() => {
                          void handlePhotoAction(photo.id, "verify")
                        }}
                      >
                        Verify
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={photoActionPending && pendingLabel?.startsWith("reject")}
                        onClick={() => {
                          void handlePhotoAction(photo.id, "reject")
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What automations are built</CardTitle>
          <CardDescription>
            This answers the old “what kind of automations do we have?” placeholder directly from the codebase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Clock3 size={15} className="text-brand-500" />
              <p className="text-sm font-semibold text-[var(--foreground)]">Outreach and retention</p>
            </div>
            <p className="text-xs leading-5 text-[var(--muted)]">
              Meal nudges, ghosting detection, renewal prompts, and scheduler dispatch all support client follow-up.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert size={15} className="text-brand-500" />
              <p className="text-sm font-semibold text-[var(--foreground)]">Reporting and system upkeep</p>
            </div>
            <p className="text-xs leading-5 text-[var(--muted)]">
              Weekly reports, monthly projections, compliance refresh jobs, and storage pruning are already implemented behind the scenes.
            </p>
          </div>
        </CardContent>
      </Card>

      {isPending && (
        <p className={cn("flex items-center gap-2 text-xs text-[var(--muted)]")}>
          <Loader2 size={12} className="animate-spin" />
          Saving automation changes…
        </p>
      )}
    </div>
  )
}
