import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { PageContainer } from "@/components/layout/PageContainer"
import { EmptyState } from "@/components/ui/EmptyState"
import { createClient } from "@/utils/supabase/server"
import { getNutritionReviewQueue } from "@/lib/meals/mealOperations"
import { getTrainerProfile } from "@/lib/operations/trainer"
import { formatDateTime, formatNumber } from "@/lib/format"
import { getWhatsAppServiceDb } from "@/lib/whatsapp/service-db"
import { ReviewQueueActions } from "./ReviewQueueActions"

export const dynamic = "force-dynamic"

function intakeLabel(meal: Awaited<ReturnType<typeof getNutritionReviewQueue>>[number]) {
  return meal.sourceText || meal.notes || meal.mealType
}

export default async function NutritionReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const authUserId = user?.id ?? null
  const trainer = authUserId ? await getTrainerProfile(authUserId) : null
  const queue = authUserId && trainer ? await getNutritionReviewQueue(authUserId) : []
  const clientIds = Array.from(new Set(queue.map((meal) => meal.clientId)))
  const clientNames = new Map<string, string>()

  if (clientIds.length > 0) {
    const db = getWhatsAppServiceDb()
    const { data: clients } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientIds)

    for (const client of clients ?? []) {
      const row = client as { id: string; full_name: string | null; email: string | null }
      clientNames.set(row.id, row.full_name ?? row.email ?? "Client")
    }
  }

  return (
    <PageContainer>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Nutrition Review</h1>
          <p className="text-sm text-[var(--muted)]">Only AI-flagged intake items that need trainer attention.</p>
        </div>
        <Badge variant={queue.length > 0 ? "warning" : "success"}>
          {queue.length} needing review
        </Badge>
      </div>

      <DashboardSection title="Needs Attention">
        {queue.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={<CheckCircle size={16} />}
                title="No nutrition reviews pending"
                description="Clear AI-logged meals stay out of this queue."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {queue.map((meal) => (
              <Card key={meal.id}>
                <CardContent className="flex flex-wrap items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--warning)]/10">
                    <AlertTriangle size={16} className="text-[var(--warning)]" />
                  </div>
                  <div className="min-w-[220px] flex-1">
                    <p className="text-xs font-medium text-[var(--muted)]">
                      {clientNames.get(meal.clientId) ?? "Client"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{intakeLabel(meal)}</p>
                      <Badge variant={meal.aiConfidence === "low" ? "danger" : "warning"}>{meal.aiConfidence}</Badge>
                      {meal.reviewReason ? <Badge variant="outline">{meal.reviewReason.replace(/_/g, " ")}</Badge> : null}
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDateTime(meal.mealTimestamp)} · {meal.sourceType ?? "unknown"} · {formatNumber(meal.calories)} kcal · P {formatNumber(meal.proteinG)}g · C {formatNumber(meal.carbsG)}g · F {formatNumber(meal.fatG)}g
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/clients/${meal.clientId}`}>
                      <Button size="sm" variant="outline">
                        Open client <ArrowRight size={12} />
                      </Button>
                    </Link>
                    <ReviewQueueActions mealId={meal.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DashboardSection>
    </PageContainer>
  )
}
