"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/operations/audit";
import { requireTrainer } from "@/lib/api-auth";
import { verifyClientOwnership } from "@/lib/ownership";
import type { Database } from "@/shared/types/supabase";

function getServiceDb() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function toggleActiveStatus(
  clientId: string,
  currentActive: boolean
): Promise<{ error?: string }> {
  let trainerId: string;
  try {
    trainerId = await requireTrainer();
  } catch {
    return { error: "Unauthorized." };
  }

  const db = getServiceDb();
  const owned = await verifyClientOwnership(db, clientId, trainerId);
  if (!owned) return { error: "Client not found or access denied." };

  const { error } = await db
    .from("trainer_clients")
    .update({ is_active: !currentActive })
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId);

  if (error) return { error: error.message };

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "roster_toggle_active",
    entity_type: "trainer_clients",
    entity_id: clientId,
    metadata: { new_active: !currentActive },
  }).catch(() => {});

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/roster");
  return {};
}

export async function unlinkClientFromRoster(
  clientId: string
): Promise<{ error?: string }> {
  let trainerId: string;
  try {
    trainerId = await requireTrainer();
  } catch {
    return { error: "Unauthorized." };
  }

  const db = getServiceDb();
  const owned = await verifyClientOwnership(db, clientId, trainerId);
  if (!owned) return { error: "Client not found or access denied." };

  const { error } = await db
    .from("trainer_clients")
    .delete()
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId);

  if (error) return { error: error.message };

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "roster_unlink",
    entity_type: "trainer_clients",
    entity_id: clientId,
    metadata: { action: "unlinked" },
  }).catch(() => {});

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/roster");
  return {};
}
