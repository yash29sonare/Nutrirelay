"use server"

import { revalidatePath } from "next/cache"
import { createServiceDb } from "@/lib/ownership"
import { createClient } from "@/utils/supabase/server"

export async function updateSettingsProfileAction(
  _prevState: { error: string | null; success: string | null },
  formData: FormData,
): Promise<{ error: string | null; success: string | null }> {
  const displayName = String(formData.get("displayName") ?? "").trim()
  const businessName = String(formData.get("businessName") ?? "").trim()

  if (!displayName) {
    return { error: "Display name is required.", success: null }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return { error: "Not authenticated.", success: null }
  }

  const serviceDb = createServiceDb()

  const { error: authError } = await serviceDb.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      display_name: displayName,
    },
  })

  if (authError) {
    return { error: authError.message, success: null }
  }

  const { error: profileError } = await serviceDb
    .from("profiles")
    .update({ full_name: displayName })
    .eq("id", user.id)

  if (profileError) {
    return { error: profileError.message, success: null }
  }

  const { error: trainerError } = await serviceDb
    .from("trainers")
    .update({ business_name: businessName || null })
    .eq("auth_user_id", user.id)

  if (trainerError) {
    return { error: trainerError.message, success: null }
  }

  revalidatePath("/dashboard", "layout")
  revalidatePath("/dashboard/settings")

  return { error: null, success: "Profile updated." }
}
