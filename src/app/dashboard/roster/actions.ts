"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Database } from "@/shared/types/supabase";

function getServiceDb() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function resolveTrainer(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("Unauthorized — no active session.");
  return user.id;
}

async function verifyOwnership(
  db: ReturnType<typeof getServiceDb>,
  clientId: string,
  trainerId: string
): Promise<boolean> {
  const { data } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId)
    .limit(1)
    .single();
  return !!data;
}

export async function toggleActiveStatus(
  clientId: string,
  currentActive: boolean
): Promise<{ error?: string }> {
  let trainerId: string;
  try {
    trainerId = await resolveTrainer();
  } catch {
    return { error: "Unauthorized." };
  }

  const db = getServiceDb();
  const owned = await verifyOwnership(db, clientId, trainerId);
  if (!owned) return { error: "Client not found or access denied." };

  const { error } = await db
    .from("trainer_clients")
    .update({ is_active: !currentActive })
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/roster");
  return {};
}

export async function unlinkClientFromRoster(
  clientId: string
): Promise<{ error?: string }> {
  let trainerId: string;
  try {
    trainerId = await resolveTrainer();
  } catch {
    return { error: "Unauthorized." };
  }

  const db = getServiceDb();
  const owned = await verifyOwnership(db, clientId, trainerId);
  if (!owned) return { error: "Client not found or access denied." };

  const { error } = await db
    .from("trainer_clients")
    .delete()
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/roster");
  return {};
}
