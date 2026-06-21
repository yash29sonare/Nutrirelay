# Architectural Topography & System Design: Fortress Fitness Pro

> **Master Structural Engineering Blueprint.** This document defines the complete system architecture — data flows, relational schema topology, background task infrastructure, storage lifecycle policy, performance guardrails, and AI cascade logic. All implementation must conform to this blueprint and to the constraints in `CLAUDE.md`.

---

## 1. Unified Ingress & Background Processing Architecture

### Full Data Flow Diagram

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        INGRESS PIPELINE (<200ms)                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

[Meta Cloud API]
      │
      │  POST /api/webhook/whatsapp
      │  Header: X-Hub-Signature-256: sha256=<hmac_hex>
      ▼
[Next.js Edge Route Handler]
      │
      ├─ Read raw body as Buffer (before JSON parse)
      ├─ Verify HMAC-SHA256 signature against WHATSAPP_APP_SECRET
      │       │
      │       ├─ FAIL → HTTP 401 Unauthorized
      │       │          Log to security_events table
      │       │          TERMINATE
      │       │
      │       └─ PASS → Continue
      │
      ├─ pgmq.send('whatsapp_message_queue', rawBodyString)
      │
      └─ HTTP 200 OK  ◄─── Must return within 200ms of request receipt


╔══════════════════════════════════════════════════════════════════════════════╗
║                     ASYNC CONSUMER PIPELINE (no time limit)                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

[pgmq whatsapp_message_queue]
      │
      │  Trigger.dev poll / Supabase Realtime trigger
      ▼
[worker-orchestrator Background Thread]
      │
      ├─ Dequeue raw JSON string
      ├─ Parse Meta payload → extract wam_id, client_phone, message_timestamp, type
      ├─ Lookup client row (trainer_id, is_bot_paused, tracking_status, dpdp_consent_at)
      │
      ├─ Gate 1: is_bot_paused = true → discard silently, no response
      ├─ Gate 2: dpdp_consent_at IS NULL → send consent prompt only
      ├─ Gate 3: tracking_status = 'GHOST_MODE' → discard silently
      │
      ├─ Update clients.last_client_message_at = message_timestamp
      ├─ If tracking_status was 'GHOST_MODE' → reset to 'ACTIVE', clear strike_log
      │
      ▼
[Mastra Core Engine]
      │
      ├─ Route by message type:
      │       ├─ text    → fortressCoach agent
      │       ├─ audio   → voice-note.workflow → transcribe → fortressCoach
      │       ├─ image   → classify (food photo vs UPI screenshot) → route
      │       └─ interactive → post-meal-poll.workflow
      │
      ▼
[Gemini 3.5 Flash (with cascading failover)]
      │
      ├─ Tool execution (parseMealLog, extractVitals, verifyPaymentOCR, ...)
      │
      ▼
[Target Database Write Layers]
      │
      ├─ food_logs (ON CONFLICT (wam_id) DO NOTHING)
      ├─ client_biometrics
      ├─ workout_slots
      ├─ upi_payments (ON CONFLICT (utr_number) DO NOTHING)
      ├─ voice_notes
      └─ clients (status updates, last_client_message_at)
```

### Why This Separation Matters

Meta enforces a hard 3-second delivery timeout. Any missed acknowledgement triggers exponential retries — identical payloads flood the queue, creating duplicate log entries and wasted AI quota. The Producer (Next.js route) owns only two things: signature verification and enqueue. Every other operation belongs to the Consumer.

The `wam_id` UNIQUE constraint on `food_logs` and `utr_number` UNIQUE constraint on `upi_payments` form the idempotency moat — even if Meta retries 10 times, only one row ever lands in the database.

---

## 2. Relational Database Topography (Supabase Postgres Core)

### Entity Relationship Overview

```
trainers (1)
    │
    ├──< clients (many)
    │         │
    │         ├──< client_preferences (many)
    │         ├──< client_schedules (many)
    │         ├──< meal_logs (many)
    │         ├──< workout_slots (many)
    │         ├──< payment_logs (many)
    │         ├──< subscriptions (1 active)
    │         ├──< client_biometrics (many, time-series)
    │         ├──< weight_corridors (many, computed)
    │         ├──< date_projections (many, computed)
    │         ├──< strike_log (many)
    │         ├──< escalation_log (many)
    │         └──< voice_notes (many)
    │
    └──< weekly_reports (many, via clients)
```

### Table Specifications

#### `trainers`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Mirrors `auth.users.id` |
| `display_name` | `TEXT` | `NOT NULL` | Trainer name for dashboard and reports |
| `wa_phone_number_id` | `TEXT` | `NOT NULL UNIQUE` | Meta Graph API sending number ID |
| `wa_access_token` | `TEXT` | `NOT NULL` | Encrypted permanent system user token |
| `wa_business_account_id` | `TEXT` | `NOT NULL` | Meta WABA ID |
| `upi_vpa` | `TEXT` | — | Trainer's UPI VPA for QR code generation |
| `telegram_chat_id` | `TEXT` | — | For injury escalation alerts |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | — |

**RLS Policy:** `FOR ALL USING (auth.uid() = id)`

#### `clients`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | — |
| `trainer_id` | `UUID` | `NOT NULL REFERENCES trainers(id)` | Multi-tenant isolation anchor |
| `wa_phone` | `TEXT` | `NOT NULL` | WhatsApp sender number (from `messages[0].from`) |
| `display_name` | `TEXT` | — | Client's preferred name |
| `age` | `INT` | — | For BMR calculation |
| `height_cm` | `DECIMAL` | — | For BMR calculation |
| `sex` | `TEXT` | `CHECK (IN ('M','F'))` | For Mifflin-St Jeor formula |
| `activity_level` | `TEXT` | `CHECK (IN ('SEDENTARY','LIGHT','MODERATE','ACTIVE','VERY_ACTIVE'))` | TDEE multiplier selection |
| `timezone` | `TEXT` | `NOT NULL DEFAULT 'Asia/Kolkata'` | IANA timezone for cron drift neutralization |
| `last_client_message_at` | `TIMESTAMPTZ` | — | 24-hour window clock anchor |
| `tracking_status` | `TEXT` | `NOT NULL DEFAULT 'PENDING_CONSENT' CHECK (IN ('PENDING_CONSENT','ACTIVE','GHOST_MODE','ESCALATED','PAUSED'))` | Global execution state |
| `is_bot_paused` | `BOOLEAN` | `NOT NULL DEFAULT false` | Trainer manual mute toggle |
| `trainer_alert_flag` | `BOOLEAN` | `NOT NULL DEFAULT false` | Medical/urgent alert indicator |
| `alert_reason` | `TEXT` | — | e.g. `'MEDICAL_ESCALATION'` |
| `dpdp_consent_at` | `TIMESTAMPTZ` | — | NULL = consent not given; data processing blocked |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | — |

**RLS Policy:** `FOR ALL USING (auth.uid() = trainer_id)`

#### `client_preferences`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | — |
| `trainer_id` | `UUID` | `NOT NULL REFERENCES trainers(id)` | RLS anchor |
| `client_id` | `UUID` | `NOT NULL REFERENCES clients(id) ON DELETE CASCADE` | — |
| `preference_type` | `TEXT` | `NOT NULL CHECK (IN ('ALLERGY','DISLIKE','DIET_TYPE'))` | Category |
| `value` | `TEXT` | `NOT NULL` | e.g. `'Peanuts'`, `'Mushrooms'`, `'Vegetarian'` |
| `severity` | `TEXT` | `NOT NULL CHECK (IN ('STRICT','MODERATE','MILD'))` | Enforcement level |
| `notes` | `TEXT` | — | Trainer annotations |

**Index:** `(client_id, preference_type)` for fast pre-tool lookups.
**RLS Policy:** `FOR ALL USING (auth.uid() = trainer_id)`

#### `client_schedules`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | — |
| `trainer_id` | `UUID` | `NOT NULL REFERENCES trainers(id)` | RLS anchor |
| `client_id` | `UUID` | `NOT NULL REFERENCES clients(id) ON DELETE CASCADE` | — |
| `meal_plan_id` | `UUID` | `REFERENCES meal_plans(id)` | Active plan link |
| `slot_type` | `TEXT` | `NOT NULL CHECK (IN ('MEAL','WORKOUT'))` | Schedule category |
| `slot_name` | `TEXT` | `NOT NULL` | e.g. `'Breakfast'`, `'Leg Day'` |
| `scheduled_time` | `TIME` | `NOT NULL` | Local time in client's timezone |
| `window_minutes` | `INT` | `NOT NULL DEFAULT 30` | Grace window for compliance evaluation |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Enable/disable without deletion |
| `calories` | `INT` | — | Meal slot macro targets |
| `protein_g` | `DECIMAL` | — | — |
| `carbs_g` | `DECIMAL` | — | — |
| `fat_g` | `DECIMAL` | — | — |

**RLS Policy:** `FOR ALL USING (auth.uid() = trainer_id)`

#### `meal_logs`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | — |
| `wam_id` | `TEXT` | `NOT NULL UNIQUE` | **Idempotency key** — Meta retry shield |
| `trainer_id` | `UUID` | `NOT NULL REFERENCES trainers(id)` | RLS anchor |
| `client_id` | `UUID` | `NOT NULL REFERENCES clients(id)` | — |
| `slot_id` | `UUID` | `REFERENCES client_schedules(id)` | Links to meal slot |
| `logged_at` | `TIMESTAMPTZ` | `NOT NULL` | From `message_timestamp` — not server clock |
| `meal_name` | `TEXT` | — | Normalized English name |
| `estimated_calories` | `INT` | — | — |
| `protein_g` | `DECIMAL` | — | — |
| `carbs_g` | `DECIMAL` | — | — |
| `fats_g` | `DECIMAL` | — | — |
| `compliance_status` | `TEXT` | `DEFAULT 'UNVERIFIED' CHECK (IN ('OPTIMAL','OVER_LIMIT','UNDER_LIMIT','UNVERIFIED'))` | Computed after parsing |
| `verification_status` | `TEXT` | `DEFAULT 'PENDING' CHECK (IN ('PENDING','VERIFIED','UNVERIFIED'))` | Photo proof state |
| `image_path` | `TEXT` | — | Supabase Storage path for proof-of-plate |
| `transcription_failed` | `BOOLEAN` | `DEFAULT false` | Voice note parse failure flag |
| `is_party_mode` | `BOOLEAN` | `DEFAULT false` | Wild Day placeholder marker |
| `notes` | `TEXT` | — | Raw fallback dump or manual trainer entry |

**All inserts use:** `INSERT INTO meal_logs ... ON CONFLICT (wam_id) DO NOTHING`
**RLS Policy:** `FOR ALL USING (auth.uid() = trainer_id)`

#### `workout_slots`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | — |
| `wam_id` | `TEXT` | `NOT NULL UNIQUE` | Idempotency key |
| `trainer_id` | `UUID` | `NOT NULL REFERENCES trainers(id)` | RLS anchor |
| `client_id` | `UUID` | `NOT NULL REFERENCES clients(id)` | — |
| `schedule_id` | `UUID` | `REFERENCES client_schedules(id)` | Links to scheduled slot |
| `logged_at` | `TIMESTAMPTZ` | `NOT NULL` | From message_timestamp |
| `is_completed` | `BOOLEAN` | `NOT NULL` | Completed or skipped |
| `exertion_scale` | `INT` | `CHECK (exertion_scale BETWEEN 1 AND 10)` | RPE rating |
| `notes` | `TEXT` | — | — |

**RLS Policy:** `FOR ALL USING (auth.uid() = trainer_id)`

#### `payment_logs`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | — |
| `trainer_id` | `UUID` | `NOT NULL REFERENCES trainers(id)` | RLS anchor |
| `client_id` | `UUID` | `NOT NULL REFERENCES clients(id)` | — |
| `wam_id` | `TEXT` | `NOT NULL` | Source message ID |
| `utr_number` | `TEXT` | `NOT NULL UNIQUE` | **Replay fraud shield** — absolute UNIQUE constraint |
| `submitted_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | — |
| `screenshot_path` | `TEXT` | — | Supabase Storage path (private bucket, signed URLs) |
| `gemini_extracted_utr` | `TEXT` | — | Vision-extracted UTR for cross-check |
| `extracted_amount` | `DECIMAL` | — | Vision-extracted payment amount |
| `utr_match_confirmed` | `BOOLEAN` | `DEFAULT false` | Gemini UTR vs submitted UTR match result |
| `verified_by_trainer` | `BOOLEAN` | `NOT NULL DEFAULT false` | Trainer 1-click approval |
| `verified_at` | `TIMESTAMPTZ` | — | — |

**All inserts use:** `INSERT INTO payment_logs ... ON CONFLICT (utr_number) DO NOTHING`
**RLS Policy:** `FOR ALL USING (auth.uid() = trainer_id)`

---

## 3. Trigger.dev v4 Serverless Task Architecture

All time-sensitive, recurring, or multi-day stateful evaluations run exclusively inside Trigger.dev v4. No pg_cron is used for application logic — pg_cron is reserved for database maintenance (storage pruning, cache expiry, unlogged table cleanup).

### `ghostMonitorDaemon`

**File:** `trigger/ghosting-daemon.ts`
**Schedule:** Every hour — `0 * * * *`

```
EXECUTION FLOW:

For each client WHERE tracking_status = 'ACTIVE':

  1. Compute: silence_duration = now() - clients.last_client_message_at
     (evaluated in client's clients.timezone to neutralize IST vs UTC drift)

  2. Check strike_log for existing strikes in this cycle

  3. BRANCH:
     silence_duration >= 24h AND no strike_1:
       → sendTemplateMessage(CHECK_IN_24H)
       → INSERT strike_log (strike_number = 1)

     silence_duration >= 48h AND no strike_2:
       → sendTemplateMessage(STREAK_WARNING_48H)
       → INSERT strike_log (strike_number = 2)

     silence_duration >= 72h AND no strike_3:
       → UPDATE clients SET tracking_status = 'GHOST_MODE'
       → Cancel all pending Trigger.dev jobs for this client
       → INSERT strike_log (strike_number = 3)
       → Send GHOST_ALERT to trainer dashboard
       → Send Telegram message to trainer

  4. GHOST_MODE unlock:
     Triggered only by inbound client message in worker-orchestrator
     (not by this daemon)
     → UPDATE clients SET tracking_status = 'ACTIVE'
     → DELETE FROM strike_log WHERE client_id = $1
```

### `billingRenewalEngine`

**File:** `trigger/renewal-engine.ts`
**Schedule:** Daily at 09:00 IST (03:30 UTC) — `30 3 * * *`

```
EXECUTION FLOW:

For each subscription WHERE is_active = true:

  days_remaining = EXTRACT(days FROM (expires_at - now()))

  IF days_remaining <= 2 AND NOT renewal_notified_d28:
    → sendTemplateMessage(RENEWAL_REMINDER_D28)
    → UPDATE subscriptions SET renewal_notified_d28 = true

  IF days_remaining <= 0 AND NOT renewal_notified_d30:
    → sendTemplateMessage(RENEWAL_FINAL_D30)
    → UPDATE subscriptions SET renewal_notified_d30 = true
    → Cancel all active meal_nudge and post_meal_followup jobs for this client
    → UPDATE clients SET tracking_status = 'PAUSED'

POST-PAYMENT (UTR verified by trainer):
  → UPDATE subscriptions SET
      expires_at = now() + interval '30 days',
      renewal_notified_d28 = false,
      renewal_notified_d30 = false,
      is_active = true
  → UPDATE clients SET tracking_status = 'ACTIVE'
  → Re-schedule all meal_nudge and post_meal_followup jobs
```

### `sundayReportCompiler`

**File:** `trigger/weekly-report.ts`
**Schedule:** Every Sunday at 16:30 UTC (22:00 IST) — `30 16 * * 0`

```
EXECUTION FLOW:

For each client WHERE tracking_status IN ('ACTIVE', 'PAUSED'):

  STEP 1 — Aggregate weekly data:
    SELECT FROM meal_logs WHERE client_id = $1
      AND logged_at >= date_trunc('week', now())
    Compute: avg_calories, avg_protein_g, avg_carbs_g, avg_fats_g,
             compliance_pct (OPTIMAL rows / total slots),
             verified_pct (VERIFIED rows / total rows),
             streak_days (consecutive days with ≥1 log)

  STEP 2 — Pull metabolic context:
    SELECT * FROM weight_corridors WHERE client_id = $1 ORDER BY computed_at DESC LIMIT 1
    SELECT * FROM date_projections WHERE client_id = $1 ORDER BY computed_at DESC LIMIT 1

  STEP 3 — Gemini evaluation:
    geminiCall({
      type: 'text',
      prompt: WEEKLY_EVAL_PROMPT (compiled from step 1+2 data),
      responseSchema: { evaluation: string (2-3 paragraphs), headline: string }
    })

  STEP 4 — Build PDF (jsPDF):
    Page 1: Cover — client name, week dates, trainer branding
    Page 2: Macro adherence bar chart, compliance donut, streak calendar
    Page 3: Weight trend sparkline vs target corridor
    Page 4: Gemini written evaluation text
    Footer: "Powered by Fortress Fitness Pro"

  STEP 5 — Upload to Supabase Storage:
    path = weekly-reports/{trainer_id}/{client_id}/{week_start_date}.pdf

  STEP 6 — Send via WhatsApp:
    Meta document message type → binary PDF → client chat

  STEP 7 — Insert weekly_reports row:
    { client_id, trainer_id, week_start, pdf_path, sent_at: now() }
```

---

## 4. Supabase Storage Infrastructure & Image Pruning Lifecycles

### Storage Bucket Map

| Bucket Name | Access | Contents | Retention Policy |
|---|---|---|---|
| `proof-of-plate` | Private | Food log verification photos | 14 days post-verification, then pruned |
| `failed-voice-notes` | Private | Failed transcription `.ogg` files | 48 hours hard expiry |
| `payment-screenshots` | Private | UPI bank confirmation screenshots | Pruned after trainer verification + 7 days |
| `weekly-reports` | Private | Generated PDF reports | Indefinite (trainer-controlled) |

All buckets enforce trainer-scoped path prefixes (`{trainer_id}/...`). Supabase Storage policies mirror RLS: a trainer can only access objects under their own `trainer_id` path. Signed URLs (1-hour expiry) are issued for all dashboard preview renders — no public URLs.

### `/tmp/receipts/` (Ephemeral OCR Buffer)

A virtual path concept within `payment-screenshots` bucket. UPI screenshots are uploaded here during Gemini Vision processing. After the OCR extraction completes (whether successful or failed), the file is moved to its permanent path or deleted. This isolates in-progress OCR files from confirmed payment records.

```
Upload path:    payment-screenshots/tmp/{trainer_id}/{wam_id}.jpg
Post-OCR path:  payment-screenshots/confirmed/{trainer_id}/{utr_number}.jpg
```

### `failed_voice_notes/` Bucket

`.ogg` files stored here are indexed in the `voice_notes` table with an `expires_at = now() + 48h` column. The `storage-pruner` cron job reads expired rows and deletes the corresponding Storage objects before deleting the rows.

### `storage-pruner` — Nightly Cron Task

**File:** `trigger/storage-pruner.ts`
**Schedule:** Daily at 02:00 IST (20:30 UTC previous day) — `30 20 * * *`

```
EXECUTION FLOW:

STEP 1 — Prune expired voice notes:
  SELECT * FROM voice_notes WHERE expires_at < now()
  For each row:
    → supabase.storage.from('failed-voice-notes').remove([ogg_path])
    → DELETE FROM voice_notes WHERE id = $1

STEP 2 — Prune old proof-of-plate images:
  SELECT * FROM meal_logs
    WHERE verification_status = 'VERIFIED'
    AND image_path IS NOT NULL
    AND logged_at < now() - interval '14 days'
  For each row:
    → supabase.storage.from('proof-of-plate').remove([image_path])
    → UPDATE meal_logs SET image_path = NULL WHERE id = $1

STEP 3 — Downsize retained payment screenshots:
  SELECT * FROM payment_logs
    WHERE verified_by_trainer = true
    AND screenshot_path IS NOT NULL
    AND verified_at < now() - interval '7 days'
  For each row:
    → Download image → Sharp resize to max 400px width → convert to WebP → target ≤5KB
    → Re-upload compressed version to same path (upsert: true)
    → UPDATE payment_logs SET screenshot_path = <webp_path> WHERE id = $1
    → Log compressed byte count to storage_audit_log

STEP 4 — Log audit summary:
  INSERT INTO storage_audit_log {
    pruned_voice_notes: N,
    pruned_plate_images: N,
    compressed_screenshots: N,
    bytes_reclaimed: N,
    run_at: now()
  }
```

---

## 5. High-Speed Performance & Scale Guardrails

### A. Connection Pooling (Supavisor Moat)

**Rule:** All serverless functions, edge routes, Trigger.dev workers, and Mastra tool `execute()` functions must connect via the Supavisor Transaction Pool on **port 6543**. Port 5432 (direct connection) is reserved exclusively for the Supabase CLI and migration tooling.

```
Supavisor Transaction Pool URL format:
postgresql://<user>:<password>@<project>.pooler.supabase.com:6543/<database>?pgbouncer=true

Set as: DATABASE_URL in .env.local
Used by: All runtime Supabase client instances

Direct connection URL format (migrations only):
postgresql://<user>:<password>@<project>.supabase.com:5432/<database>

Set as: DATABASE_DIRECT_URL in .env.local
Used by: supabase db push, Prisma migrate (if used)
```

At scale with 100+ active clients and Trigger.dev workers processing concurrent jobs, direct connections would exhaust Postgres's default connection limit of ~100. Supavisor multiplexes hundreds of application-layer connections onto a tight pool of real Postgres connections, eliminating this ceiling entirely.

### B. High-Speed Session Cache (Unlogged Table — Redis Replacement)

**Migration:** `supabase/migrations/01_unlogged_cache.sql`

```sql
CREATE UNLOGGED TABLE session_cache (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- pg_cron cleanup every 5 minutes
SELECT cron.schedule(
  'purge-session-cache',
  '*/5 * * * *',
  $$DELETE FROM session_cache WHERE expires_at < now()$$
);
```

**Why UNLOGGED:** PostgreSQL UNLOGGED tables skip the Write-Ahead Log (WAL), making reads and writes approximately 3-5× faster than regular tables. The trade-off is that data is lost on a server crash — acceptable for ephemeral session state. If the cache is empty on restart, the next message from a client simply rebuilds it.

**What is cached:**

| Cache Key Pattern | Value Shape | TTL |
|---|---|---|
| `session:{client_id}` | Rolling 10-turn conversation history array + compressed summary | 48 hours |
| `window:{client_id}` | `{ last_client_message_at, is_open: boolean }` | 30 minutes |
| `prefs:{client_id}` | Full `client_preferences` array | 1 hour |
| `plan:{client_id}` | Active `client_schedules` rows for today | 6 hours |

Cache invalidation: writes to `client_preferences` or `client_schedules` must call `DELETE FROM session_cache WHERE key = 'prefs:{client_id}'` or `'plan:{client_id}'` to bust stale entries.

---

## 6. Shared Mathematical Formula Engine & Memory Sync

### `shared/physical-math.ts`

All metabolic calculations in the system originate from this single file. No tool, workflow, or API route may implement these formulas inline — always import from this module.

```typescript
// Mifflin-St Jeor BMR
export function computeBMR(params: {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: 'M' | 'F';
}): number {
  const base = (10 * params.weight_kg) + (6.25 * params.height_cm) - (5 * params.age);
  return params.sex === 'M' ? base + 5 : base - 161;
}

// TDEE from BMR + activity multiplier
export const ACTIVITY_MULTIPLIERS = {
  SEDENTARY:   1.2,
  LIGHT:       1.375,
  MODERATE:    1.55,
  ACTIVE:      1.725,
  VERY_ACTIVE: 1.9,
} as const;

export function computeTDEE(bmr: number, activityLevel: keyof typeof ACTIVITY_MULTIPLIERS): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

// Weekly fat loss projection (1kg fat ≈ 7700 kcal deficit)
export function projectedWeeklyLossKg(dailyDeficitKcal: number): number {
  return parseFloat(((dailyDeficitKcal * 7) / 7700).toFixed(2));
}

// Goal date projection
export function projectGoalDate(params: {
  currentWeightKg: number;
  targetWeightKg: number;
  weeklyLossKg: number;
}): Date {
  const weeksNeeded = (params.currentWeightKg - params.targetWeightKg) / params.weeklyLossKg;
  const goalDate = new Date();
  goalDate.setDate(goalDate.getDate() + Math.ceil(weeksNeeded * 7));
  return goalDate;
}

// Weight corridor bounds (±10% of weekly loss as tolerance band)
export function computeWeightCorridor(tdee: number, targetCalories: number) {
  const dailyDeficit = tdee - targetCalories;
  const weeklyLoss = projectedWeeklyLossKg(dailyDeficit);
  return {
    upper_bound_kg_per_week: parseFloat((weeklyLoss * 1.1).toFixed(2)),
    lower_bound_kg_per_week: parseFloat((weeklyLoss * 0.9).toFixed(2)),
    projected_weekly_loss_kg: weeklyLoss,
  };
}
```

### Memory Vector Synchronization (Vellum)

Long-term client context — injury history, persistent medical notes, trainer-written preference annotations — is stored as vector documents in Vellum indexed by `client_id`. This prevents high-cardinality historical data from flooding the LLM context window on every message.

```
CONTEXT ASSEMBLY (before each fortressCoach invocation):

1. session_cache lookup → rolling 10-turn history + compressed summary
2. session_cache lookup → today's client_schedules (meal slots / workout windows)
3. session_cache lookup → client_preferences (allergens / dislikes)
4. Vellum semantic search:
     index: "client-health-{client_id}"
     query: incomingMessageText
     topK: 3
     → returns: relevant injury records, medical annotations, trainer notes
5. Latest biometric row from client_biometrics
6. Latest weight_corridors + date_projections rows

Combined context package injected into fortressCoach system context:
{
  client_profile,
  client_preferences,      ← from cache
  recent_turns,            ← last 10 from cache
  compressed_history,      ← dense summary from cache
  active_slots,            ← today's schedule from cache
  health_context,          ← Vellum semantic results
  latest_biometrics,
  metabolic_forecast,
}
```

---

## 7. Multi-Model Cascade Logic Boundaries

**File:** `src/lib/gemini/client.ts`

The failover wrapper is the exclusive Gemini API access point. No module imports the Google Generative AI SDK directly.

### Cascade Priority Chain

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GEMINI FAILOVER CASCADE                          │
└─────────────────────────────────────────────────────────────────────┘

PRIORITY 1 ─ google/gemini-3.5-flash
  Role: Flagship multimodal engine
  Handles: Vision OCR (UPI screenshots, food photos), audio transcription
           (voice notes), complex Hinglish NL reasoning, multi-intent parsing
  Trigger: Always attempted first

        │ 429 Too Many Requests
        │ 500 Internal Server Error
        ▼

PRIORITY 2 ─ google/gemini-3.1-flash-lite
  Role: High-speed text classification backup
  Handles: Text-only meal logging, baseline intent classification,
           simple macro extraction from clean English input
  Trigger: 429 or 500 from Priority 1

        │ 429 or 500
        ▼

PRIORITY 3 ─ google/gemini-2.5-flash
  Role: End-of-line JSON schema enforcer
  Handles: Structural JSON output guarantee — ensures tool call responses
           conform to Zod schemas even under severe regional congestion
  Trigger: 429 or 500 from Priority 2

        │ Any error
        ▼

PRIORITY 4 ─ HARD FALLBACK BLOCK
  Actions (all synchronous, in order):
    1. Set food_logs.transcription_failed = true  (or equivalent table)
    2. Write raw utterance / media file ID into .notes column verbatim
    3. Insert FAILED_PARSE dashboard flag for trainer review
    4. Send client neutral acknowledgement:
       "Got it — I'll flag that for your coach to review."
  Returns: { hardFallback: true, rawInput: string }
```

### Error Classification

Only `429 Too Many Requests` and `500 Internal Server Error` trigger model cascade. All other errors (401, 403, 400 invalid request, network timeout) bubble up immediately without attempting the next model — these indicate misconfiguration or corrupted input, not capacity issues, and retrying a different model would not help.

---

## 8. DPDP Act Compliance Gate Architecture

The Digital Personal Data Protection Act 2023 (India) requires explicit, informed, prior consent before processing health data. This gate is enforced at the database and application layer simultaneously.

```
FIRST CONTACT FLOW:

1. New phone number sends first message
2. worker-orchestrator looks up clients.dpdp_consent_at
3. IF NULL:
   → Do NOT process message content
   → INSERT row into consent_pending_log { client_id, raw_message, received_at }
   → Send DPDP_CONSENT template message (paid Meta template)
   → Wait for client response

4. Client taps "I Agree" (WhatsApp button reply)
   → worker-orchestrator receives interactive payload
   → UPDATE clients SET dpdp_consent_at = now(), tracking_status = 'ACTIVE'
   → Send onboarding welcome message
   → Begin normal tracking flow

5. IF client does not consent:
   → Bot remains silent (sends no further messages)
   → Trainer sees PENDING_CONSENT badge on roster
   → All health data processing remains locked
```

---

## Appendix A: Migration Sequence

| File | Contents |
|---|---|
| `00_extensions.sql` | Enable pg_cron, pg_net, pgmq |
| `01_unlogged_cache.sql` | session_cache UNLOGGED table + pg_cron cleanup job |
| `02_queue_system.sql` | pgmq whatsapp_message_queue + security_events |
| `03_core_identity.sql` | trainers, clients (with trainer_alert_flag, alert_reason) |
| `03b_alert_columns.sql` | *(if 03 was already applied)* ALTER TABLE clients ADD COLUMN trainer_alert_flag, alert_reason |
| `04_client_preferences.sql` | client_preferences + indexes |
| `05_meal_and_workout.sql` | client_schedules, meal_logs, workout_slots, voice_notes, escalation_log, strike_log |
| `06_forecasting_logic.sql` | client_biometrics, weight_corridors, date_projections, subscriptions, payment_logs, weekly_reports, consent_pending_log, storage_audit_log |
| `07_rls_security.sql` | RLS ENABLE + trainer_isolation policies on every table |

---

## Appendix B: File Map Cross-Reference

| System Component | Primary File(s) |
|---|---|
| Webhook Producer | `src/app/api/webhook/whatsapp/route.ts` |
| Worker-Orchestrator Consumer | `src/mastra/workflows/inbound-message.workflow.ts` |
| Gemini Failover Client | `src/lib/gemini/client.ts` |
| WhatsApp Send Router | `src/lib/whatsapp/send.ts` + `window.ts` + `templates.ts` |
| Mathematical Formulas | `shared/physical-math.ts` |
| Session Cache Utilities | `src/lib/supabase/cache.ts` |
| Ghost Monitor Daemon | `trigger/ghosting-daemon.ts` |
| Billing Renewal Engine | `trigger/renewal-engine.ts` |
| Weekly Report Compiler | `trigger/weekly-report.ts` |
| Storage Pruner | `trigger/storage-pruner.ts` |
| Database Migrations | `supabase/migrations/00_*.sql` → `07_*.sql` |

---

## Appendix C: Actual Workspace State (as of 2026-06-09)

### Files Present on Disk

```
fortressfitness/
├── .gitignore                        ✓ Custom — Mastra, Supabase, secrets, media ignores
├── AGENTS.md                         ✓ Scaffold default (not yet customized)
├── CLAUDE.md                         ✓ Architecture contract — living document
├── ai_agent_spec.md                  ✓ Mastra & Gemini layer technical spec
├── design.md                         ✓ This file — master structural blueprint
├── eslint.config.mjs                 ✓ Next.js 16 default ESLint config
├── next.config.ts                    ✓ Minimal Next.js config, React Compiler enabled
├── next-env.d.ts                     ✓ Auto-generated Next.js TypeScript declarations
├── package.json                      ✓ Next.js 16.2.7 / React 19.2.4 / TypeScript / Tailwind v4
├── package-lock.json                 ✓ npm lock file (npm used for scaffold; pnpm for future installs)
├── payment_flow.md                   ✓ UPI OCR gate & ledger technical spec
├── postcss.config.mjs                ✓ Tailwind CSS v4 PostCSS config
├── README.md                         ✓ Scaffold default (not yet customized)
├── tasks.md                          ✓ 6-phase implementation roadmap
├── tsconfig.json                     ✓ Strict TypeScript, ES2017, @/* alias → ./src/*
├── whatsapp_spec.md                  ✓ Ingress & gateway technical spec
│
├── public/                           ✓ Default SVG assets (file, globe, next, vercel, window)
│
├── src/
│   └── app/
│       ├── favicon.ico               ✓ Default
│       ├── globals.css               ✓ Tailwind v4 base styles
│       ├── layout.tsx                ✓ Root layout — Geist fonts, metadata
│       └── page.tsx                  ✓ Boilerplate home page (not yet customized)
│
└── supabase/
    ├── .gitignore                    ✓ Supabase CLI generated
    ├── config.toml                   ✓ Hardened — pooler:6543, pg16, RLS defaults, 4 buckets
    └── seed.sql                      ✓ Empty — ready for dev seed data
```

### What Does NOT Exist Yet (pending implementation)

```
src/app/(auth)/                       ✗ Phase 5
src/app/(dashboard)/                  ✗ Phase 5
src/app/api/webhook/whatsapp/         ✗ Phase 3
src/lib/                              ✗ Phase 2–3
src/mastra/                           ✗ Phase 2
src/types/                            ✗ Phase 1 (post-migration gen)
shared/                               ✗ Phase 2
trigger/                              ✗ Phase 4
supabase/migrations/                  ✗ Phase 1 (next step)
.env.local                            ✗ Must be created manually (see Section 7 of CLAUDE.md)
```

### Local Infrastructure Status

| Service | Status | Notes |
|---|---|---|
| Next.js 16.2.7 | ✓ Installed | `npm run dev` works |
| Supabase CLI (npx) | ✓ Available (v2.105.0) | Via `npx supabase` |
| Docker Desktop | ✗ Not installed | Required for `supabase start` — install before Phase 1 Task 1 |
| Supabase local stack | ✗ Not started | Blocked on Docker |
| Mastra | ✗ Not installed | Phase 2 |
| Trigger.dev v4 | ✗ Not installed | Phase 4 |
| shadcn/ui | ✗ Not installed | Phase 5 |
| Tremor | ✗ Not installed | Phase 5 |

---

*Last updated: 2026-06-09 — Appendix C added reflecting actual workspace file tree and infrastructure status after config.toml hardening. No SQL migrations written yet. Docker Desktop installation required before local Supabase stack can boot.*
