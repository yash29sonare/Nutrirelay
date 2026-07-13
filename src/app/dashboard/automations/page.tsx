import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { createClient } from "@/utils/supabase/server"
import { createServiceDb } from "@/lib/ownership"
import { getTrainerProfile } from "@/lib/operations/trainer"
import { AutomationWorkspace } from "./AutomationWorkspace"

export const dynamic = "force-dynamic"

export default async function AutomationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const authUserId = user?.id ?? null
  const trainerProfile = authUserId ? await getTrainerProfile(authUserId) : null

  let initialConfig = null
  let initialPhotos: Array<{
    id: string
    client_id: string
    image_path: string
    logged_at: string
    notes: string | null
  }> = []

  if (trainerProfile?.trainer_id) {
    const db = createServiceDb()

    const [automationRes, photoRes] = await Promise.all([
      db
        .from("trainer_automations")
        .select("*")
        .eq("trainer_id", trainerProfile.trainer_id)
        .maybeSingle(),
      db
        .from("food_logs")
        .select("id, client_id, image_path, logged_at, notes")
        .eq("trainer_id", trainerProfile.trainer_id)
        .eq("verification_status", "PENDING")
        .not("image_path", "is", null)
        .order("logged_at", { ascending: false })
        .limit(50),
    ])

    initialConfig = automationRes.data ?? null
    initialPhotos = (photoRes.data ?? []) as typeof initialPhotos
  }

  return (
    <PageContainer>
      <PageHeader
        title="Automations"
        description="Automations help trainers by preparing meal nudges, ghosting follow-ups, recurring reports, and photo verification work without manual tracking."
      />
      <AutomationWorkspace initialConfig={initialConfig} initialPhotos={initialPhotos} />
    </PageContainer>
  )
}
