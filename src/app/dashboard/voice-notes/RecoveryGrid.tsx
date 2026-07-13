"use client";

import { useState, useTransition } from "react";
import { resolveWithTranscript, retranscribeNote } from "./actions";
import { formatDateTime } from "@/lib/format";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Mic, RefreshCw, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

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
  currentTimeMs: number;
}

function NoteCard({
  row,
  onResolved,
  currentTimeMs,
}: {
  row: VoiceNoteRow;
  onResolved: (id: string) => void;
  currentTimeMs: number;
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
    currentTimeMs - new Date(row.created_at).getTime() > 24 * 60 * 60 * 1000;

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

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetranscribe}
            disabled={retrying || saving}
            aria-label="Re-trigger AI transcription"
            icon={<RefreshCw size={12} className={retrying ? "animate-spin" : ""} />}
          >
            {retrying ? "Retrying…" : "Retry AI"}
          </Button>
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
          <Textarea
            id={`transcript-${row.id}`}
            rows={3}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={saving || retrying}
            placeholder="Type what you heard…"
          />
        </div>

        {/* Error */}
        {error && (
          <InlineNotice>{error}</InlineNotice>
        )}

        {/* Save button */}
        <Button
          variant="brand"
          size="md"
          onClick={handleSave}
          disabled={saving || retrying || !transcript.trim()}
          loading={saving}
          icon={saving ? undefined : <Check size={14} />}
        >
          {saving ? "Saving…" : "Save transcript"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function RecoveryGrid({ initialRows, currentTimeMs }: RecoveryGridProps) {
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
          currentTimeMs={currentTimeMs}
        />
      ))}
    </div>
  );
}
