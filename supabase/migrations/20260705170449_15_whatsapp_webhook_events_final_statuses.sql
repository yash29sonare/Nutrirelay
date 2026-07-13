alter table public.whatsapp_webhook_events
  drop constraint if exists whatsapp_webhook_events_processing_status_check;

alter table public.whatsapp_webhook_events
  add constraint whatsapp_webhook_events_processing_status_check
  check (
    processing_status = any (
      array[
        'received'::text,
        'signature_failed'::text,
        'malformed_json'::text,
        'status_recorded'::text,
        'queued'::text,
        'ignored'::text,
        'queue_error'::text,
        'accepted'::text,
        'processed'::text,
        'skipped'::text,
        'failed_handled'::text
      ]
    )
  );
