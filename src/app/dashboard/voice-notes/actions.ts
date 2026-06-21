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

async function isNoteOwnedByTrainer(
  db: ReturnType<typeof getServiceDb>,
  noteId: string,
  trainerId: string
): Promise<boolean> {
  const { data: note } = await db
    .from("voice_notes")
    .select("client_id")
    .eq("id", noteId)
    .limit(1)
    .single();

  if (!note) return false;

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", note.client_id)
    .eq("is_active", true)
    .limit(1)
    .single();

  return !!tc;
}

export async function resolveWithTranscript(
  noteId: string,
  transcript: string
): Promise<{ error?: string }> {
  if (!transcript.trim()) return { error: "Transcript cannot be empty." };

  let trainerId: string;
  try {
    trainerId = await resolveTrainer();
  } catch {
    return { error: "Unauthorized." };
  }

  const db = getServiceDb();
  const owned = await isNoteOwnedByTrainer(db, noteId, trainerId);
  if (!owned) return { error: "Note not found or access denied." };

  const { error } = await db
    .from("voice_notes")
    .update({ transcript: transcript.trim(), processing_status: "completed" })
    .eq("id", noteId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/voice-notes");
  return {};
}

export async function retranscribeNote(
  noteId: string
): Promise<{ error?: string }> {
  let trainerId: string;
  try {
    trainerId = await resolveTrainer();
  } catch {
    return { error: "Unauthorized." };
  }

  const db = getServiceDb();
  const owned = await isNoteOwnedByTrainer(db, noteId, trainerId);
  if (!owned) return { error: "Note not found or access denied." };

  const { data: note } = await db
    .from("voice_notes")
    .select("whatsapp_message_id, client_id")
    .eq("id", noteId)
    .limit(1)
    .single();

  if (!note) return { error: "Note record missing." };

  try {
    const { getMastra } = await import("@/mastra/index");
    const mastra = await getMastra();
    const workflow = mastra.getWorkflow("voiceNoteRecoveryWorkflow");
    const run = await workflow.createRun();
    await run.start({
      inputData: {
        mediaId:           note.whatsapp_message_id,
        whatsappMessageId: note.whatsapp_message_id,
        userContext:       { clientId: note.client_id, trainerId },
      },
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/voice-notes");
  return {};
}
