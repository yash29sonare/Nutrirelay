import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/Card";
import { RecoveryGrid, type VoiceNoteRow } from "./RecoveryGrid";
import { Mic, Clock } from "lucide-react";
import type { Database } from "@/shared/types/supabase";

export const dynamic = "force-dynamic";

function getDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function fetchFailedVoiceNotes(trainerId: string): Promise<VoiceNoteRow[]> {
  const db = getDb();

  // Scope to this trainer's clients via trainer_clients join
  const { data: tcRows } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("is_active", true);

  if (!tcRows || tcRows.length === 0) return [];

  const clientIds = tcRows.map((r) => r.client_id);

  const { data: notes, error } = await db
    .from("voice_notes")
    .select("id, client_id, created_at, storage_bucket_url, transcript, whatsapp_message_id, processing_status")
    .eq("processing_status", "failed")
    .in("client_id", clientIds)
    .order("created_at", { ascending: true });

  if (error || !notes) return [];

  // Resolve client names from profiles
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", clientIds);

  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return notes.map((n) => ({
    id:                  n.id,
    client_name:         nameMap.get(n.client_id) ?? "Unknown client",
    client_id:           n.client_id,
    created_at:          n.created_at,
    storage_bucket_url:  n.storage_bucket_url,
    whatsapp_message_id: n.whatsapp_message_id,
    transcript:          n.transcript,
  }));
}

const MS_PER_HOUR = 1000 * 60 * 60;

export default async function VoiceNotesPage() {
  const db = getDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  const trainerId = user?.id ?? null;

  const rows = trainerId ? await fetchFailedVoiceNotes(trainerId) : [];

  const staleCount = rows.filter(
    (r) => Date.now() - new Date(r.created_at).getTime() > 24 * MS_PER_HOUR
  ).length;

  return (
    <div className="px-6 py-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          Voice Note Recovery
        </h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Failed transcriptions awaiting manual resolution.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 shrink-0">
              <Mic size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)] leading-none">
                {rows.length}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">Unresolved failed notes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 shrink-0">
              <Clock size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)] leading-none">
                {staleCount}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">Older than 24 hours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recovery grid */}
      {!trainerId ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--muted)]">Sign in to view recovery queue.</p>
          </CardContent>
        </Card>
      ) : (
        <RecoveryGrid initialRows={rows} />
      )}
    </div>
  );
}
