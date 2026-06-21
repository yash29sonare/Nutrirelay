-- Enable Core Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Provision Core Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('proof-of-plate',      'proof-of-plate',      false, 5242880,   ARRAY['image/*']::text[]),
  ('failed-voice-notes',  'failed-voice-notes',  false, 16777216,  ARRAY['audio/ogg', 'audio/*']::text[]),
  ('billing-screenshots', 'billing-screenshots', false, 5242880,   ARRAY['image/*']::text[]),
  ('weekly-reports',      'weekly-reports',      false, 10485760,  ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;
