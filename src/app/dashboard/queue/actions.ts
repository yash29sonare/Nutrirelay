"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/operations/audit";
import { requireTrainer } from "@/lib/api-auth";
import type { Database } from "@/shared/types/supabase";

function getServiceDb() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function isPaymentOwnedByTrainer(
  db: ReturnType<typeof getServiceDb>,
  paymentId: string,
  trainerId: string
): Promise<boolean> {
  const { data: payment } = await db
    .from("upi_payments")
    .select("client_id")
    .eq("id", paymentId)
    .limit(1)
    .single();

  if (!payment) return false;

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", payment.client_id)
    .eq("is_active", true)
    .limit(1)
    .single();

  return !!tc;
}

export async function approvePayment(
  paymentId: string
): Promise<{ error?: string }> {
  let trainerId: string;
  try {
    trainerId = await requireTrainer();
  } catch {
    return { error: "Unauthorized." };
  }

  const db = getServiceDb();
  const owned = await isPaymentOwnedByTrainer(db, paymentId, trainerId);
  if (!owned) return { error: "Payment not found or access denied." };

  const { error } = await db
    .from("upi_payments")
    .update({ payment_status: "verified" })
    .eq("id", paymentId);

  if (error) return { error: error.message };

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "payment_approved",
    entity_type: "upi_payments",
    entity_id: paymentId,
    metadata: { payment_status: "verified" },
  }).catch(() => {});

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/queue");
  return {};
}

export async function rejectPayment(
  paymentId: string
): Promise<{ error?: string }> {
  let trainerId: string;
  try {
    trainerId = await requireTrainer();
  } catch {
    return { error: "Unauthorized." };
  }

  const db = getServiceDb();
  const owned = await isPaymentOwnedByTrainer(db, paymentId, trainerId);
  if (!owned) return { error: "Payment not found or access denied." };

  const { error } = await db
    .from("upi_payments")
    .update({ payment_status: "rejected" })
    .eq("id", paymentId);

  if (error) return { error: error.message };

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "payment_rejected",
    entity_type: "upi_payments",
    entity_id: paymentId,
    metadata: { payment_status: "rejected" },
  }).catch(() => {});

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/queue");
  return {};
}
