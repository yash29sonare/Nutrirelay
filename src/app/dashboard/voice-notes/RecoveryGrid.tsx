"use client";

import { useState, useTransition } from "react";
import { resolveWithTranscript, retranscribeNote } from "./actions";
import { Mic, RefreshCw, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export interface VoiceNoteRow {
  id: string;
  client_name: string;
  client_id: string;
  created_at: string;
  storage_bucket_url: string;
  whatsapp_message_id: string;
  transcript: string | null;
}

interface RecoveryGridProps {
  initialRows: VoiceNoteRow[];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NoteCard({
  row,
  onResolved,
}: {
  row: VoiceNoteRow;
  onResolved: (id: string) => void;
}) {
  const [transcript, setTranscript] = useState(row.transcript ?? "");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSave() {
    setError(null);
    setSaving(true);
    startTransition(async () => {
      const result = await resolveWithTranscript(row.id, transcript);
      if (result.error) {
        setError(result.error);
      } else {
        onResolved(row.id);
      }
      setSaving(false);
    });
  }

  async function handleRetranscribe() {
    setError(null);
    setRetrying(true);
    startTransition(async () => {
      const result = await retranscribeNote(row.id);
      if (result.error) {
        setError(result.error);
      } else {
        onResolved(row.id);
      }
      setRetrying(false);
    });
  }

  const isStale =
    Date.now() - new Date(row.created_at).getTime() > 24 * 60 * 60 * 1000;

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 shrink-0">
              <Mic size={15} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {row.client_name}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatDateTime(row.created_at)}
                {isStale && (
                  <span className="ml-2 text-red-500 font-medium">· Stale</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={handleRetranscribe}
            disabled={retrying || saving}
            aria-label="Re-trigger AI transcription"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface-overlay)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <RefreshCw
              size={12}
              className={retrying ? "animate-spin" : ""}
            />
            {retrying ? "Retrying…" : "Retry AI"}
          </button>
        </div>

        {/* HTML5 audio player */}
        <audio
          controls
          src={row.storage_bucket_url}
          className="w-full h-10 rounded-lg"
          aria-label={`Voice note from ${row.client_name}`}
        />

        {/* Manual transcript input */}
        <div className="space-y-2">
          <label
            htmlFor={`transcript-${row.id}`}
            className="block text-xs font-medium text-[var(--muted)]"
          >
            Manual transcript override
          </label>
          <textarea
            id={`transcript-${row.id}`}
            rows={3}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={saving || retrying}
            placeholder="Type what you heard…"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--surface-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Error */}
        {error && (
          <p role="alert" className="text-xs text-red-500">
            {error}
          </p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || retrying || !transcript.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {saving ? "Saving…" : "Save transcript"}
        </button>
      </CardContent>
    </Card>
  );
}

export function RecoveryGrid({ initialRows }: RecoveryGridProps) {
  const [rows, setRows] = useState<VoiceNoteRow[]>(initialRows);

  function handleResolved(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-[var(--muted)]">
            No failed voice notes. All clear.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <NoteCard
          key={row.id}
          row={row}
          onResolved={handleResolved}
        />
      ))}
    </div>
  );
}
