# Unapplied Migration Archive

This folder preserves local migration SQL files that are not part of the known remote migration history for Supabase project `tbwemyizhpozdqnjfqvk`.

These migrations must not be blindly pushed, replayed, or repaired into production. The live schema already contains many of the objects described by these files, but the active remote migration history does not include these local versions.

The files are kept here for manual SQL comparison and future forward-only repair planning. Active production migration-history representations live in `supabase/migrations`.

This cleanup did not mutate the live database. Do not run `supabase db push` until a separate final deployment-readiness check confirms migration list alignment.

Future schema changes must be forward-only.
