-- Add WhatsApp-only client links to stored report audit rows.
-- This is intentionally additive and nullable so legacy profile-client reports keep working.

DO $$
BEGIN
  IF to_regclass('public.weekly_reports') IS NOT NULL THEN
    ALTER TABLE public.weekly_reports
      ADD COLUMN IF NOT EXISTS whatsapp_client_id UUID;

    IF to_regclass('public.trainer_whatsapp_clients') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'weekly_reports_whatsapp_client_id_fkey'
          AND conrelid = 'public.weekly_reports'::regclass
      )
    THEN
      ALTER TABLE public.weekly_reports
        ADD CONSTRAINT weekly_reports_whatsapp_client_id_fkey
        FOREIGN KEY (whatsapp_client_id)
        REFERENCES public.trainer_whatsapp_clients(client_id)
        ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_weekly_reports_whatsapp_client_id
      ON public.weekly_reports (whatsapp_client_id)
      WHERE whatsapp_client_id IS NOT NULL;
  END IF;

  IF to_regclass('public.monthly_reports') IS NOT NULL THEN
    ALTER TABLE public.monthly_reports
      ADD COLUMN IF NOT EXISTS whatsapp_client_id UUID;

    IF to_regclass('public.trainer_whatsapp_clients') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'monthly_reports_whatsapp_client_id_fkey'
          AND conrelid = 'public.monthly_reports'::regclass
      )
    THEN
      ALTER TABLE public.monthly_reports
        ADD CONSTRAINT monthly_reports_whatsapp_client_id_fkey
        FOREIGN KEY (whatsapp_client_id)
        REFERENCES public.trainer_whatsapp_clients(client_id)
        ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_monthly_reports_whatsapp_client_id
      ON public.monthly_reports (whatsapp_client_id)
      WHERE whatsapp_client_id IS NOT NULL;
  END IF;
END $$;
