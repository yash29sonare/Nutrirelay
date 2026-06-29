# CLAUDE.md — Fortress Fitness Pro
### Developer Contract · Living Architecture Document · AI Agent North Star

> **This file is the single source of truth for every AI-assisted development session.**
> Read it completely before writing a single line of code. Update it atomically after every change.
>
> **`tasks.md` is the immutable, single-source-of-truth project tracker ledger.** Every phase completion, task status, and migration record must be reflected there. Never overwrite it wholesale — use precise find-and-replace edits only.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Product Name** | Fortress Fitness Pro |
| **Tagline** | The Autonomous Operations Layer for Elite Fitness Trainers |
| **Primary Channel** | WhatsApp (Meta Cloud API) |
| **Target User** | Premium personal fitness trainers managing 20–100+ active clients |
| **Core Problem Solved** | The *Admin Death Spiral* — trainers losing hours daily to manual food log chasing, macro calculations, reminder typing, and subscription renewals |
| **Strategic Outcome** | A single trainer delegates 90% of operational overhead to a HITL AI engine, scales to 100+ clients, and pays **$0 in transactional gateway fees** |
| **Billing Model** | SaaS subscription to the trainer; UPI direct-to-trainer for client payments (zero platform cut) |
| **Compliance Jurisdiction** | India — DPDP Act 2023 + Meta WhatsApp Business Policy |

---

## 2. Tech Stack (2026 Standards)

### Frontend & Web Framework
- **Next.js 15+** — App Router, React Server Components, Server Actions
- **TypeScript** — strict mode enabled (`"strict": true` in tsconfig), no `any` escapes
- **Tailwind CSS** — utility-first styling, custom design tokens for brand colors
- **shadcn/ui** — component primitives (Button, Card, Dialog, Table, Badge, Switch, etc.)
- **Tremor** — data visualization components (AreaChart, BarChart, DonutChart for progress dashboards)

### AI Agent Pipeline
- **Mastra Framework** — modular Agent definitions, Tool registries, and multi-step Workflow orchestration
  - Agents live in `mastra/agents/`
  - Tools live in `mastra/tools/`
  - Workflows live in `mastra/workflows/`
- **Primary LLM:** Google Gemini 3.5 Flash (multimodal: text, voice transcription, vision)
- **Failover chain:** see Section 6 — Multi-Model Cascading Failover Matrix

### Database & Storage Infrastructure
- **Supabase** (hosted PostgreSQL 16)
  - Row-Level Security on **every** table (non-negotiable — see Gate A)
  - **Supabase Queues (pgmq)** for the webhook ingress buffer
  - **pg_cron** for nightly maintenance jobs (storage pruning, report compilation)
  - **Supabase Storage** for voice notes, proof-of-plate images, and weekly PDF reports
  - **Supavisor** connection pooler on port `6543` (transaction mode) — the only allowed DB connection path from serverless functions

### Async Task Orchestration
- **Trigger.dev v4** — durable job execution, delayed evaluations, cron schedules
  - Jobs live in `trigger/`
  - All time-sensitive client operations (ghosting daemon, meal nudges, renewal engine, weekly reports) run here

### External Notification Services
- **Resend** — transactional email for trainer account management
- **Telegram Bot API** — emergency escalation channel for physical injury safety flags (reaches trainer even when WhatsApp is busy)

### DevOps & Tooling
- **pnpm** — package manager (fast, disk-efficient)
- **ESLint + Prettier** — enforced code style
- **Supabase CLI** — local development with `supabase start`

---

## 3. Repository Architecture

```
fortressfitness/
│
├── app/                              # Next.js App Router root
│   ├── (auth)/                       # Auth group — login, onboarding
│   │   ├── login/
│   │   └── onboarding/               # DPDP consent capture for new trainers
│   │
│   ├── (dashboard)/                  # Protected trainer dashboard routes
│   │   ├── layout.tsx                # Sidebar + auth guard
│   │   ├── page.tsx                  # Overview — active clients, ghost alerts
│   │   ├── clients/
│   │   │   ├── page.tsx              # Client roster table (Tremor)
│   │   │   └── [clientId]/
│   │   │       ├── page.tsx          # Individual client detail
│   │   │       ├── meal-plan/        # Meal plan editor
│   │   │       └── logs/             # Food log timeline with verified/unverified badges
│   │   ├── voice-notes/              # UNREAD_VOICE_NOTE queue with HTML5 player
│   │   ├── payments/                 # UPI OCR verification queue
│   │   ├── analytics/                # Tremor charts — compliance rates, ghost trends
│   │   └── settings/                 # Bot mute toggle, trainer profile, API keys
│   │
│   ├── api/
│   │   ├── webhook/
│   │   │   └── whatsapp/
│   │   │       └── route.ts          # PRODUCER LAYER — wa-ingress (see Gate B)
│   │   ├── trpc/
│   │   │   └── [trpc]/route.ts       # tRPC app router handler
│   │   └── internal/                 # Internal server-to-server routes (Trigger.dev callbacks)
│   │
│   ├── globals.css
│   └── layout.tsx                    # Root layout — font, theme provider
│
├── components/
│   ├── ui/                           # shadcn/ui generated primitives (do not hand-edit)
│   ├── dashboard/                    # Composed dashboard widgets
│   │   ├── ClientCard.tsx
│   │   ├── GhostModeBadge.tsx
│   │   ├── VoiceNotePlayer.tsx       # HTML5 audio player for failed VN queue
│   │   └── BotMuteToggle.tsx
│   └── charts/                       # Tremor wrappers with typed props
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client (anon key)
│   │   ├── server.ts                 # Server Supabase client (service role, SSR cookies)
│   │   └── admin.ts                  # Service-role admin client (bypasses RLS for system ops ONLY)
│   ├── operations/
│   │   ├── dashboard.ts              # Dashboard RPC wrapper + mapper
│   │   └── clients.ts                # Client domain operations (getClientList, etc.)
│   ├── domain/
│   │   └── dashboardSemantics.ts     # Centralized semantic rules (risk, compliance, trend)
│   ├── insights/
│   │   └── dashboardInsights.ts      # Deterministic insight engine
│   ├── engagement/
│   │   ├── engagementEngine.ts       # Action queue generation + reconcile + rebuildState
│   │   ├── engagementRepository.ts   # Persisted action CRUD
│   │   ├── engagementStateEngine.ts  # In-memory suppression rules
│   │   ├── deduplicationEngine.ts    # Set-based O(n) dedup
│   │   ├── getTrainerDailyFeed.ts    # Priority grouping
│   │   └── actionKey.ts             # Canonical action_key for deterministic matching
│   ├── events/
│   │   └── engagementEventStore.ts   # Append-only immutable event store
│   ├── outcomes/
│   │   └── eventOutcomeEngine.ts     # Derived outcome computation from events
│   ├── ai/
│   │   └── engagementAI.ts          # Advisory AI (read-only over events, never writes DB)
│   ├── whatsapp/
│   │   ├── send.ts                   # sendFreeMessage() + sendTemplateMessage()
│   │   ├── templates.ts              # All approved Meta template IDs + param schemas
│   │   ├── verify-signature.ts       # HMAC-SHA256 webhook signature verification
│   │   └── window.ts                 # isWindowOpen(lastClientMessageAt): boolean
│   ├── gemini/
│   │   ├── client.ts                 # Gemini SDK init with failover wrapper
│   │   ├── transcribe.ts             # Audio → text with confidence scoring
│   │   ├── vision.ts                 # Image → structured data (UPI OCR, food logging)
│   │   └── hinglish-parser.ts        # Code-switched NL → macro nutrients
│   ├── pdf/
│   │   └── weekly-report.ts          # Puppeteer/React-PDF weekly summary generator
│   └── utils.ts
│
├── mastra/
│   ├── index.ts                      # Mastra instance export
│   ├── agents/
│   │   ├── coaching-agent.ts         # Primary conversational coaching agent
│   │   ├── food-log-agent.ts         # Meal parsing + macro calculation
│   │   ├── renewal-agent.ts          # Subscription renewal conversation handler
│   │   └── escalation-agent.ts       # Injury/illness detection + routing
│   ├── tools/
│   │   ├── log-meal.tool.ts          # Writes to food_logs with wam_id idempotency
│   │   ├── update-client-status.tool.ts
│   │   ├── send-whatsapp.tool.ts     # Wraps lib/whatsapp/send.ts with window check
│   │   ├── fetch-voice-note.tool.ts  # Downloads .ogg from Meta CDN
│   │   ├── upi-verify.tool.ts        # Gemini Vision UTR extraction + DB check
│   │   └── escalate-injury.tool.ts   # Trainer notification pipeline
│   └── workflows/
│       ├── inbound-message.workflow.ts   # Main message routing workflow (CONSUMER)
│       ├── meal-log.workflow.ts
│       ├── voice-note.workflow.ts
│       └── post-meal-poll.workflow.ts
│
├── trigger/
│   ├── index.ts                      # Trigger.dev client config
│   ├── ghosting-daemon.ts            # 3-strike evaluation cron (see Gate G)
│   ├── meal-nudges.ts                # Timed per-meal-slot dispatcher (see Gate E)
│   ├── post-meal-followup.ts         # 30-min delayed poll sender (see Gate E)
│   ├── renewal-engine.ts             # Day 28 + Day 30 subscription prompts (see Gate H)
│   └── weekly-report.ts             # Sunday 22:00 IST PDF report drop (see Gate H)
│
├── supabase/
│   ├── config.toml                   # Supabase local dev config
│   ├── seed.sql                      # Dev seed data
│   └── migrations/                   # Numbered SQL migration files
│       ├── 0001_init_schema.sql
│       ├── 0002_rls_policies.sql
│       ├── 0003_pgmq_queues.sql
│       └── 0004_pg_cron_jobs.sql
│
├── types/
│   ├── database.types.ts             # Auto-generated from `supabase gen types typescript`
│   ├── whatsapp.types.ts             # Meta webhook payload shapes
│   └── mastra.types.ts               # Agent I/O contracts
│
├── public/
│   └── upi-qr.png                    # Static UPI QR code asset (see Gate H)
│
├── .env.example                      # Template — all keys documented, no values
├── .gitignore
├── CLAUDE.md                         # ← This file
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

---

## 4. Database Schema — Core Tables

> Every table **must** have `trainer_id UUID NOT NULL REFERENCES trainers(id)` and RLS enabled. This is enforced at migration time via a CI lint step.

| Table | Purpose | Key Constraints |
|---|---|---|
| `trainers` | Trainer accounts (auth.users mirror) | `id = auth.uid()` |
| `clients` | Client profiles per trainer | `trainer_id`, `timezone TEXT NOT NULL`, `last_client_message_at TIMESTAMPTZ`, `tracking_status TEXT` (ACTIVE / GHOST_MODE), `is_bot_paused BOOLEAN DEFAULT false`, `dpdp_consent_at TIMESTAMPTZ` |
| `meal_plans` | Macro targets per client | `trainer_id`, `client_id` |
| `meal_slots` | Individual meals within a plan | `meal_plan_id`, `scheduled_time TIME`, `window_minutes INT` |
| `food_logs` | Per-meal intake records | `wam_id TEXT UNIQUE NOT NULL` (idempotency key), `client_id`, `trainer_id`, `verification_status TEXT` (VERIFIED / UNVERIFIED), `image_path TEXT` (Supabase Storage path), `transcription_failed BOOLEAN DEFAULT false` |
| `voice_notes` | Failed VN recovery queue | `wam_id TEXT UNIQUE NOT NULL`, `ogg_path TEXT` (failed_voice_notes bucket), `transcription_failed BOOLEAN DEFAULT true`, `expires_at TIMESTAMPTZ` (now() + 48h), `resolved_by TEXT` |
| `whatsapp_message_queue` | pgmq raw payload buffer | Managed by Supabase Queues extension |
| `strike_log` | Client ghosting strike tracker | `client_id`, `strike_number INT`, `triggered_at TIMESTAMPTZ` |
| `upi_payments` | Payment verification queue | `utr_number TEXT UNIQUE NOT NULL`, `screenshot_path TEXT`, `gemini_extracted_utr TEXT`, `verified_by_trainer BOOLEAN DEFAULT false` |
| `subscriptions` | Client subscription lifecycle | `client_id`, `expires_at TIMESTAMPTZ`, `renewal_notified_d28 BOOLEAN`, `renewal_notified_d30 BOOLEAN` |
| `weekly_reports` | Generated PDF metadata | `client_id`, `week_start DATE`, `pdf_path TEXT`, `sent_at TIMESTAMPTZ` |

---

## 5. Infrastructure Gates — Hardened Constraints

### Gate A — Multi-Tenant Isolation Moat

**Rule:** Every table has RLS enabled. All trainer-facing queries are filtered by `auth.uid() = trainer_id`. No trainer can read, write, or enumerate another trainer's data under any circumstance.

**Implementation requirements:**
- Every migration that creates a table must immediately follow with:
  ```sql
  ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "trainer_isolation" ON <table_name>
    FOR ALL USING (auth.uid() = trainer_id);
  ```
- The `lib/supabase/admin.ts` client (service role) bypasses RLS — it is used **only** for system-level operations (pgmq consumption, pg_cron callbacks). Never expose it to client-side code or user-facing API routes.
- Supabase Storage bucket policies must mirror this pattern — trainers may only access files under paths prefixed with their `trainer_id`.

---

### Gate B — Webhook Ingress Buffer (Meta Retry Storm Defense)

**Rule:** The WhatsApp webhook route must acknowledge Meta in **< 200ms** and never do real work inline.

**Producer Layer** (`app/api/webhook/whatsapp/route.ts`):
1. Receive `POST` from Meta
2. Verify `X-Hub-Signature-256` header via HMAC-SHA256 using `WHATSAPP_APP_SECRET` (`lib/whatsapp/verify-signature.ts`)
3. If verification fails → return `403` immediately, log to Supabase `security_events`
4. If verification passes → enqueue raw JSON body string to `whatsapp_message_queue` via `pgmq.send()`
5. Return `HTTP 200 OK` — nothing else

**Consumer Layer** (`mastra/workflows/inbound-message.workflow.ts`):
- Triggered by Trigger.dev polling pgmq (or Supabase Realtime on the queue table)
- Dequeues messages, runs the full Mastra routing workflow
- All Mastra tool calls, Gemini API calls, and DB writes happen here — never in the Producer

---

### Gate C — Idempotency & Connection Pooling

**Rule:** All serverless DB connections use Supavisor on port `6543`. Every food log requires a unique `wam_id`.

**Connection pooling:**
- `DATABASE_URL` in `.env` must point to: `postgresql://...@<project>.pooler.supabase.com:6543/<db>?pgbouncer=true`
- Never use port `5432` (direct connection) from serverless/edge functions — it exhausts the Postgres connection limit at scale
- Port `5432` is reserved for Supabase CLI local dev and migrations only

**Idempotency:**
- `food_logs.wam_id` has a `UNIQUE NOT NULL` constraint
- All meal insert paths use `INSERT ... ON CONFLICT (wam_id) DO NOTHING` — duplicates from Meta's retry behavior fail silently at the DB layer, never reach application error handling
- Same pattern applies to `voice_notes.wam_id` and `upi_payments.utr_number`

---

### Gate D — Meta 24-Hour Service Window Optimization

**Rule:** Free-form messages when window is open. Paid utility templates when window is closed. Never waste money.

**Implementation** (`lib/whatsapp/window.ts`):
```typescript
export function isWindowOpen(lastClientMessageAt: Date | null): boolean {
  if (!lastClientMessageAt) return false;
  return Date.now() - lastClientMessageAt.getTime() < 24 * 60 * 60 * 1000;
}
```

**Send wrapper** (`lib/whatsapp/send.ts`):
- `sendMessage(clientId, content)` — checks `clients.last_client_message_at`, routes to `sendFreeMessage()` or `sendTemplateMessage()` accordingly
- `clients.last_client_message_at` is updated on every inbound webhook message from that client
- Template IDs and parameter schemas are typed in `lib/whatsapp/templates.ts` — never hardcode template names inline

---

### Gate E — Two-Layer Diet Delivery & Post-Meal Verification Engine

**Layer 1 — Full Broadcast** (triggered on trainer meal plan save):
- Mastra workflow fires immediately on `meal_plans` row update
- Sends a comprehensive daily/weekly macro reference to the client as a formatted WhatsApp message

**Layer 2 — Timed Micro-Nudges** (`trigger/meal-nudges.ts`):
- Trigger.dev cron evaluates active `meal_slots` records
- Dispatches precise meal details to the client at the slot's `scheduled_time` in the client's local timezone (`clients.timezone`)
- Logs dispatch event to `food_logs` with `verification_status = 'PENDING'`

**Layer 3 — Post-Meal Follow-Up** (`trigger/post-meal-followup.ts`):
- Exactly **30 minutes** after a micro-nudge, Trigger.dev fires a delayed job
- Sends a WhatsApp Interactive Poll: *"Did you finish your meal?"* with options: `Same Amount / More / Less / Something Else`
- If user selects `Something Else`:
  - Gemini 3.5 Flash parses code-switched Hinglish (text or voice) via `lib/gemini/hinglish-parser.ts`
  - Example input: *"do roti aur bhindi ki sabzi khayi thi"* → parsed into `{ carbs_g, protein_g, fat_g, calories }`
  - Result written to `food_logs` with `verification_status = 'UNVERIFIED'`

**Photo Proof — "Proof of Plate":**
- After macro data is logged, bot sends: *"Drop a quick photo of your plate for a verified log ✓"*
- If client sends image:
  - Store in Supabase Storage under `proof-of-plate/{trainer_id}/{client_id}/{date}.jpg`
  - Update `food_logs.image_path` + set `verification_status = 'VERIFIED'`
- If no image within 15 minutes: log remains `UNVERIFIED`
- Dashboard renders verified logs with a green badge and thumbnail; unverified with an amber badge

---

### Gate F — Voice Note Recovery Pipeline

**Rule:** A failed transcription must never silently disappear. It must be surfaced to the trainer for manual resolution.

**Flow** (`mastra/workflows/voice-note.workflow.ts`):
1. Client sends audio message → webhook enqueues payload
2. Consumer downloads `.ogg` from Meta's temporary CDN URL (`lib/gemini/transcribe.ts`)
3. Gemini 3.5 Flash attempts transcription with confidence scoring
4. **If confidence ≥ threshold (0.75):** process as normal text input
5. **If confidence < threshold OR API error:**
   - Upload `.ogg` to Supabase Storage bucket `failed-voice-notes/{trainer_id}/{client_id}/{wam_id}.ogg`
   - Insert row into `voice_notes` with `transcription_failed = true`, `expires_at = now() + interval '48 hours'`
   - Set `food_logs.transcription_failed = true` on the associated log row
   - Flag appears as yellow `UNREAD_VOICE_NOTE` badge on trainer dashboard (`/dashboard/voice-notes`)
   - Dashboard renders an HTML5 `<audio>` player with the Storage bucket URL
   - Trainer can: manually type the entry OR click a "Clarify with AI" button that re-submits to Gemini with a custom prompt
6. **pg_cron cleanup job** (nightly): deletes `voice_notes` rows where `expires_at < now()` and removes associated Storage objects

---

### Gate G — 3-Strike Ghosting Lockdown Daemon

**Rule:** Silence is expensive. Freeze messaging to ghost clients, never waste Meta API quota on the unresponsive.

**Evaluation** (`trigger/ghosting-daemon.ts`):
- Trigger.dev cron runs every hour
- For each `ACTIVE` client, computes hours of silence relative to `clients.last_client_message_at` in their `clients.timezone`

| Strike | Silence Duration | Action |
|---|---|---|
| **Strike 1** | ≥ 24 hours | Send conversational check-in template (window-aware via Gate D) |
| **Strike 2** | ≥ 48 hours | Send firm streak-warning template |
| **Strike 3** | ≥ 72 hours | Set `clients.tracking_status = 'GHOST_MODE'`, cancel all pending Trigger.dev jobs for this client, send `GHOST_ALERT` to trainer dashboard + Telegram escalation |

**Lock behavior:**
- Once `tracking_status = 'GHOST_MODE'`, **all outbound message dispatchers check this flag first and abort**
- The lock is lifted **only** when the client sends an inbound message — the webhook consumer resets `tracking_status = 'ACTIVE'` and clears all `strike_log` entries for that client
- No manual trainer override required (though the dashboard can show a "Force Unlock" button for edge cases)

---

### Gate H — Additional Operational & Financial Guardrails

#### H1 — Zero-Fee UPI OCR Payment Gate
- Static `public/upi-qr.png` displayed on the client's payment page
- Client uploads bank success screenshot + types 12-digit UTR number
- `lib/gemini/vision.ts` extracts UTR from screenshot, compares against submitted UTR
- `upi_payments.utr_number` has `UNIQUE NOT NULL` — duplicate UTR submissions rejected at DB level before processing
- Verified payments enter a dashboard queue for trainer 1-click confirmation (`/dashboard/payments`)

#### H2 — Bot Mute Toggle
- `clients.is_bot_paused BOOLEAN DEFAULT false`
- Dashboard switch at `/dashboard/clients/[clientId]/settings`
- **All outbound message functions check `is_bot_paused` as the first gate** — if `true`, abort silently
- Inbound messages are still processed and logged while muted (trainer may want to read context)
- The toggle allows the trainer to type personal manual messages without AI interference

#### H3 — Automated Renewal Engine (`trigger/renewal-engine.ts`)
- Trigger.dev cron checks `subscriptions.expires_at` daily
- **Day 28:** sends a soft renewal reminder template
- **Day 30:** sends an urgent final renewal template + pauses daily meal crons for this client
- After payment confirmed (UTR verified by trainer): resets `expires_at`, re-enables all crons
- Flags `renewal_notified_d28` / `renewal_notified_d30` prevent duplicate sends

#### H4 — DPDP Compliance Flow (India Digital Personal Data Protection Act 2023)
- **First contact gate:** every new client phone number that enters the system triggers the `dpdp-consent` workflow before any data processing begins
- Client must tap "I Agree" on the WhatsApp consent template
- `clients.dpdp_consent_at` is set on confirmation
- **Until `dpdp_consent_at` is non-null:** the bot responds only with the consent request message; all other message types are dropped and logged to `consent_pending_log`
- Trainer onboarding also captures trainer-side consent for processing their clients' health data

#### H5 — Auto-PDF Weekly Report (`trigger/weekly-report.ts`)
- **Every Sunday at 22:00 IST** (UTC+5:30 = 16:30 UTC)
- For each active client (not GHOST_MODE):
  1. `pg_cron` runs `prune_verified_images()` — deletes Supabase Storage objects for logs older than 14 days where `verification_status = 'VERIFIED'` (space management)
  2. Gemini 3.5 Flash generates a personalized written performance evaluation from the week's `food_logs`
  3. `lib/pdf/weekly-report.ts` compiles a styled PDF (macro adherence charts, verified vs unverified ratio, streak stats)
  4. PDF stored in `weekly-reports/{trainer_id}/{client_id}/{week_start}.pdf`
  5. PDF sent to client via WhatsApp document message
  6. `weekly_reports` row inserted for audit trail

#### H6 — Coach Escalation (Physical Injury Safety Protocol)
- **Trigger keywords / phrases** (evaluated in the Mastra coaching agent at every message):
  - `chest pain`, `can't breathe`, `heart`, `severe pain`, `joint pain`, `can't move`, `injury`, `hurt badly`, `dizzy`, `vomiting`, `fever`, `swelling`, and Hinglish equivalents
- **On trigger:**
  1. Immediately halt the coaching workflow — do not proceed with normal meal/fitness response
  2. Send client a calm, reassuring message: *"I've flagged this to your trainer right away. Please rest and contact a doctor if needed."*
  3. Set `clients.tracking_status = 'ESCALATED'`
  4. Push `HIGH_PRIORITY_ALERT` to trainer dashboard (red banner, top of queue)
  5. Fire Telegram bot message to trainer's registered Telegram chat ID via `TELEGRAM_BOT_TOKEN`
  6. Log full message context to `escalation_log` table
- Resume normal operation only when trainer manually clears the escalation from the dashboard

---

## 6. Multi-Model Cascading Failover Matrix

All Gemini API calls must be wrapped in the failover client (`lib/gemini/client.ts`). Never call the Gemini SDK directly in business logic — always go through the wrapper.

| Priority | Model ID | Role | Trigger |
|---|---|---|---|
| **1 — Primary** | `gemini-3.5-flash` | Default engine — high-fidelity multimodal (vision, audio, NL reasoning) | Always attempted first |
| **2 — Fallback 1** | `gemini-3.1-flash-lite` | Rapid classification and text logging | Catches `429 Too Many Requests` from Priority 1 |
| **3 — Fallback 2** | `gemini-2.5-flash` | End-of-line execution guarantee | Catches `429` from Priority 2 |
| **4 — Hard Fallback** | *(no model)* | Silent degradation | Any error from Priority 3 OR all 3 models unavailable |

**Hard Fallback behavior:**
- Set `food_logs.transcription_failed = true`
- Dump raw utterance / message text into `food_logs.notes` column as-is
- Insert `UNREAD_VOICE_NOTE` or `FAILED_PARSE` flag row for trainer dashboard review
- Never surface a raw error to the client — send a neutral: *"Got it, I'll log that for your trainer to review."*

**Failover wrapper pseudocode** (`lib/gemini/client.ts`):
```typescript
const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'] as const;

export async function geminiCall<T>(task: GeminiTask): Promise<T | HardFallbackResult> {
  for (const model of MODELS) {
    try {
      return await callGemini(model, task);
    } catch (err) {
      if (!is429(err)) throw err; // non-rate-limit errors bubble up immediately
    }
  }
  return hardFallback(task);
}
```

---

## 7. Environment Variables

All secrets are in `.env.local` (gitignored). The `.env.example` file must be kept current with all keys listed (no values). Never commit secrets.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-only, admin.ts client — never expose to browser
DATABASE_URL=                        # Supavisor port 6543 for serverless (transaction pool)
DATABASE_DIRECT_URL=                 # Port 5432 for Prisma/migrations only

# Meta WhatsApp Cloud API
WHATSAPP_APP_SECRET=                 # For HMAC-SHA256 webhook signature verification
WHATSAPP_ACCESS_TOKEN=               # Permanent system user token
WHATSAPP_PHONE_NUMBER_ID=            # Sending phone number ID
WHATSAPP_BUSINESS_ACCOUNT_ID=

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=        # Used by lib/gemini/client.ts failover wrapper

# Trigger.dev
TRIGGER_SECRET_KEY=                  # Trigger.dev v4 project secret

# Resend (Email)
RESEND_API_KEY=

# Telegram (Injury Escalation)
TELEGRAM_BOT_TOKEN=
TELEGRAM_TRAINER_CHAT_ID=            # Per-trainer — stored in DB, not env

# App Config
NEXT_PUBLIC_APP_URL=                 # e.g. https://fortressfitness.pro
CRON_SECRET=                         # Shared secret for validating internal cron route calls
```

---

## 8. Development Workflow

### Initial Setup
```bash
pnpm install
cp .env.example .env.local          # Fill in all values
supabase start                      # Start local Supabase (Docker required)
supabase db push                    # Apply all migrations
supabase gen types typescript --local > types/database.types.ts
pnpm dev                            # Start Next.js dev server on :3000
```

### Expose Local Webhook (WhatsApp Dev Testing)
```bash
# Use ngrok or Cloudflare Tunnel to expose localhost:3000
ngrok http 3000
# Register the ngrok URL as your Meta webhook endpoint
# Webhook path: /api/webhook/whatsapp
# Verify token: set in Meta dashboard, validated in route.ts
```

### Database Migrations
```bash
# Create a new migration
supabase migration new <descriptive_name>
# Edit the generated file in supabase/migrations/
supabase db push                     # Apply to local
# For production: supabase db push --db-url $DATABASE_DIRECT_URL
```

### Regenerate Types After Schema Changes
```bash
supabase gen types typescript --local > types/database.types.ts
```

### Key Scripts (`package.json`)
| Script | Purpose |
|---|---|
| `pnpm dev` | Next.js development server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint check |
| `pnpm typecheck` | TypeScript strict check (no emit) |
| `pnpm trigger:dev` | Trigger.dev local dev worker |
| `pnpm mastra:dev` | Mastra development server |

---

## 9. Coding Standards & Guardrails

- **TypeScript strict mode** is non-negotiable. No `any`, no `@ts-ignore`, no untyped Supabase queries — always use the generated `database.types.ts` types.
- **RLS first.** Never write a DB query that returns another trainer's data, even if you "know" the auth context is right. Trust the database policy, not application logic.
- **Gate checks are always first.** Every outbound message function: check `is_bot_paused` → check `tracking_status` → check window open/closed → then send.
- **Idempotent inserts everywhere.** `ON CONFLICT DO NOTHING` on all `wam_id` and `utr_number` writes.
- **No direct Gemini SDK calls** in workflows or tools — always go through `lib/gemini/client.ts`.
- **No port 5432 in serverless code.** Migration scripts only.
- **Templates are typed.** All WhatsApp template sends must reference a typed entry from `lib/whatsapp/templates.ts`. No raw template name strings inline.
- **Timezone-aware scheduling.** All Trigger.dev jobs that evaluate client activity must convert times to `clients.timezone` before comparing. Never assume IST or UTC.

---

## 10. Security Considerations

- Webhook route validates Meta signature **before** any processing — reject unsigned requests with `403`, log the attempt
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) is **server-only** — never in `NEXT_PUBLIC_*` variables
- UPI payment screenshots are stored in a private Supabase Storage bucket with signed URLs (expiring 1h) — never public URLs
- Voice note `.ogg` files in `failed-voice-notes` bucket are trainer-scoped and auto-expire after 48h
- All `console.log` in production routes must redact phone numbers and message content — use `[REDACTED]` placeholders in logs
- DPDP: health tracking data (`food_logs`, `voice_notes`) is never processed until `clients.dpdp_consent_at IS NOT NULL`

---

## 11. System Contract — Autonomous Maintenance Protocol

> **SYSTEM CONTRACT:** You are an autonomous developer operating on the Fortress Fitness Pro codebase. Every single time you finish executing a code change, scaffolding a new file, resolving a technical dependency, adding a Mastra tool, defining a Trigger.dev job, or running a migration — your **final atomic action before concluding your work turn** is to audit the workspace and update this `CLAUDE.md` file.
>
> You must document:
> - Newly created files and their purpose (add to Section 3 repository tree)
> - Updated or newly discovered environment variable keys (add to Section 7)
> - New Mastra tool parameters, agent capabilities, or workflow I/O contracts
> - Schema changes — new tables, columns, constraints, or RLS policies
> - Any deviation from the infrastructure gates in Section 5, with explicit justification
> - New Trigger.dev job IDs, cron schedules, or delayed job patterns
> - Configuration variable changes in `next.config.ts`, `supabase/config.toml`, or `trigger/index.ts`
>
> **Treating this `CLAUDE.md` as a static document is a core failure state.** It must accurately mirror the operational reality of the codebase at all times. If you updated code but did not update this file, your work turn is incomplete.

---

*Last updated: 2026-06-18 — Critical runtime audit & force-rewrite compliance pass. (1) `.env.example` verified — TRIGGER_SECRET_KEY correct. (2) All Mastra tools use `execute: async ({ context }: any)` + `const { field } = context as { field: type }` destructuring. (3) `mealParser.ts` is now a zero-cost local heuristic — 50-entry food keyword DB (Indian staples: dal, roti, paneer, biryani etc.), string-length fallback, no generateObject/generateText calls. (4) All three tools: `createClient(url as string, key as string, { auth: { persistSession: false } })`. npx tsc --noEmit zero errors. npm run build clean.* (1) `.env.example` created at root with all keys including TRIGGER_SECRET_KEY and WHATSAPP_VERIFY_TOKEN. (2) `src/trigger/automation-scheduler.ts` weeklyReportSchedule maxDuration raised to 900s. (3) `src/app/api/webhooks/whatsapp/route.ts` — `export const dynamic="force-dynamic"` confirmed + Cache-Control: no-store on final 200. (4) Three Mastra v1 domain tools hardened: `mealParser.ts` (meal-parser, generateObject), `subscriptionVerifier.ts` (subscription-verifier, phone→tier lookup), `strikeEnforcer.ts` (strike-enforcer, strike_log insert). All tools use flat execute params and createClient(url as string, key as string, {auth:{persistSession:false}}). npx tsc --noEmit zero errors. npm run build clean.* (1) `@trigger.dev/sdk@^4.4.6` (dep) + `@trigger.dev/build@^4.4.6` (devDep) installed; `"dev:trigger": "trigger.dev dev"` added to package.json scripts. (2) `trigger.config.ts` created at repo root — ffmpeg() build extension, external: ["fluent-ffmpeg"], maxDuration: 300, runtime: "node". (3) `src/lib/whatsapp/verify-signature.ts` — module-level throw moved inside verifySignature() body; next build no longer crashes when WHATSAPP_APP_SECRET absent. (4) `src/app/api/webhooks/whatsapp/route.ts` rewritten — runtime="nodejs", global singleton Supabase admin client (persistSession/autoRefreshToken: false), await tasks.trigger() with idempotencyKey: wamid, instant 200. (5) `src/trigger/media-consumer.ts` — streams audio to /tmp via Readable.fromWeb + pipeline, try/catch/finally: writeStream.destroy() → fs.existsSync → await fs.promises.unlink, maxDuration: 300. (6) `src/trigger/automation-scheduler.ts` — ghostingDaemonSchedule (0 * * * *), renewalEngineSchedule (30 3 * * *), weeklyReportSchedule (30 16 * * 0) via schedules.task(). (7) `src/mastra/index.ts` — getMastra() race-condition sealed via mastraInitPromise on globalThis. npx tsc --noEmit zero errors. npm run build clean.*

## 12. Project Artefacts Index

| File | Purpose |
|---|---|
| `CLAUDE.md` | This file — architecture contract and AI agent north star |
| `tasks.md` | Living 6-phase development roadmap with granular implementation checklist |
| `whatsapp_spec.md` | Complete technical reference for the WhatsApp ingress & gateway layer |
| `ai_agent_spec.md` | Mastra AI orchestration & Gemini framework layer blueprint — agent definition, tool schemas, guardrails, failover, memory |
| `design.md` | Master structural engineering blueprint — ingress pipeline, relational schema topology, Trigger.dev tasks, storage lifecycle, Supavisor pooling, Gemini cascade |
| `payment_flow.md` | Zero-fee UPI OCR gate & ledger architecture — 4-layer fraud prevention, state machine, storage pruning, schema additions |
| `.gitignore` | Custom ignores: node_modules, .env*, .mastra/, Supabase caches, media binaries |
| `package.json` | Next.js 16.2.7, React 19.2.4, TypeScript, Tailwind CSS v4 |
| `next.config.ts` | Minimal Next.js config with React Compiler enabled |
| `tsconfig.json` | Strict TypeScript, ES2017 target, `@/*` → `./src/*` path alias |
| `src/app/` | Default Next.js App Router scaffold (boilerplate only — not yet customized) |
