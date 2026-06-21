# Technical Specification: Mastra AI Orchestration & Gemini Framework Layer

> **Blueprint for the AI agent layer.** All Mastra agent definitions, tool schemas, guardrail logic, failover handling, and memory architecture must conform to this document.
> Cross-reference `CLAUDE.md` Section 2 (Tech Stack) and `whatsapp_spec.md` Section 3 (Consumer pattern) when implementing.

---

## 1. Modular Agent Definition (`fortressCoach`)

**File:** `src/mastra/agents/coach.ts`

The `fortressCoach` agent is the primary reasoning engine for all client-facing interactions. It receives parsed message payloads from the Consumer worker, maintains stateful multi-turn context, executes structured tool calls, and produces all outbound coaching responses.

### Model Configuration

```typescript
import { Agent } from '@mastra/core';
import { google } from '@ai-sdk/google';

export const fortressCoach = new Agent({
  name: 'fortressCoach',
  model: google('gemini-1.5-flash'), // primary; failover handled in src/lib/gemini/client.ts
  instructions: COACH_SYSTEM_PROMPT,
  tools: {
    parseMealLog,
    extractVitals,
    verifyWorkoutSlot,
    recalibrateMetabolicCorridor,
    requestClarification,
    verifyPaymentOCR,
    escalateInjury,
  },
});
```

**Multi-model fallover:** Mastra's `model` field accepts a single model reference; the cascading failover across `gemini-3.5-flash → gemini-3.1-flash-lite → gemini-2.5-flash → hard fallback` is implemented in the shared wrapper at `src/lib/gemini/client.ts` (see Section 6). The agent invokes `geminiCall()` from that module for all direct Gemini calls (transcription, vision, Hinglish parsing). Mastra handles tool orchestration; the failover wrapper handles model-level resilience.

### Mastra Instance Registration

```typescript
// src/mastra/index.ts
import { Mastra } from '@mastra/core';
import { fortressCoach } from './agents/coach';

export const mastra = new Mastra({
  agents: { fortressCoach },
});
```

---

## 2. System Persona & Language Processing Constraints

### System Prompt (`COACH_SYSTEM_PROMPT`)

The system prompt is defined as a constant in `src/mastra/agents/coach.ts` and injected at agent initialization. It establishes persona, language rules, tool invocation policy, and hard constraints.

```
You are FortressCoach — a disciplined, data-driven personal fitness coach serving premium clients on WhatsApp.

PERSONA:
- You are precise, warm, and results-focused. You do not offer empty encouragement.
- You speak in clear, direct English. If the client writes in Hinglish (Hindi words in Latin script, e.g. "paneer sandwich khaya", "aaj legs ka workout skip ho gaya"), match their register naturally.
- All tool inputs must be normalized to English strings and precise metric values. Never pass Hinglish strings into tool schemas.

LINGUISTIC NORMALIZATION:
- "paneer sandwich khaya" → meal_name: "Paneer Sandwich"
- "do roti aur bhindi ki sabzi" → meal_name: "2 Rotis with Bhindi Sabzi"
- "aaj weight 74.2 tha" → current_weight_kg: 74.2
- Always extract numeric values as integers or decimals. Never store raw Hinglish strings in database fields.

CONVERSATION RULES:
- Minimize conversational filler. Acknowledge, log, and deliver the insight.
- After logging a meal, respond with the macro summary, not praise.
- Do not repeat what the client just said back to them.
- If data is incomplete, call requestClarification exactly once before proceeding.

MANDATORY CHECKS BEFORE ANY TOOL CALL:
1. DPDP gate: If client dpdp_consent_at is null, respond only with the consent prompt. Do not process any data.
2. Safety gate: Scan every message for medical risk phrases (see Section 7 of ai_agent_spec.md). If found, call escalateInjury immediately and halt.
3. Allergy gate: Before calling parseMealLog, check client_preferences for SEVERE allergens. If match found, reject with the allergen warning. Do not log.
4. Bot mute gate: If is_bot_paused is true, do not generate any response.
```

### Hinglish Code-Switching Standard

The agent must handle Latin-script Hindi transparently across all input types:

| Raw Input | Normalized Output |
|---|---|
| `"paneer sandwich khaya"` | `meal_name: "Paneer Sandwich"` |
| `"do roti aur bhindi ki sabzi khayi thi"` | `meal_name: "2 Rotis with Bhindi Sabzi"` |
| `"aaj legs ka workout skip ho gaya"` | `is_completed: false` for leg slot |
| `"subah 74.2 tha weight"` | `current_weight_kg: 74.2` |
| `"neend 6 ghante hui"` | `sleep_duration_hours: 6` |
| `"bahut thaka hua hoon, energy 3/10"` | `energy_level_scale: 3` |

Normalization happens inside the agent's reasoning step before tool invocation — the Zod schemas receive only clean English strings and numeric values.

---

## 3. Real-Time Tool Registries & Strict Zod Schemas

All tools are defined using Mastra's `createTool()` API with Zod input schemas. The schema is the contract — no tool may accept unvalidated input.

### `parseMealLog`

**File:** `src/mastra/tools/parse-meal-log.tool.ts`
**Trigger:** Text, poll reply, or voice transcription containing dietary content.

```typescript
import { createTool } from '@mastra/core';
import { z } from 'zod';

export const parseMealLog = createTool({
  id: 'parseMealLog',
  description: 'Log a client meal with macro breakdown. Normalize all food names to English before calling.',
  inputSchema: z.object({
    wam_id: z.string().min(1),
    client_id: z.string().uuid(),
    trainer_id: z.string().uuid(),
    meal_name: z.string().min(1),
    estimated_calories: z.number().int().min(0).max(10000),
    protein_g: z.number().min(0).max(500),
    carbs_g: z.number().min(0).max(1000),
    fats_g: z.number().min(0).max(500),
    is_verified_by_photo: z.boolean(),
    meal_slot_id: z.string().uuid().optional(),
    is_party_mode: z.boolean().default(false),
  }),
  execute: async ({ context }) => {
    // INSERT INTO food_logs ... ON CONFLICT (wam_id) DO NOTHING
    // Returns: { logged: true, food_log_id: string } | { logged: false, reason: 'DUPLICATE' }
  },
});
```

**Pre-call gate (enforced by agent reasoning, not the tool itself):**
Before invoking `parseMealLog`, the agent must check `client_preferences` for SEVERE allergens and cross-reference the identified food items. If a match is found, the tool is NOT called. See Section 4A.

### `extractVitals`

**File:** `src/mastra/tools/extract-vitals.tool.ts`
**Trigger:** Morning check-in messages containing weight, sleep, water, or energy data.

```typescript
export const extractVitals = createTool({
  id: 'extractVitals',
  description: 'Record client biometric and wellness vitals from a morning check-in.',
  inputSchema: z.object({
    client_id: z.string().uuid(),
    trainer_id: z.string().uuid(),
    current_weight_kg: z.number().min(20).max(300),
    sleep_duration_hours: z.number().min(0).max(24),
    water_intake_liters: z.number().min(0).max(20),
    energy_level_scale: z.number().int().min(1).max(10),
    recorded_at: z.string().datetime(), // ISO string from message_timestamp
  }),
  execute: async ({ context }) => {
    // INSERT INTO client_biometrics
    // Then invoke recalibrateMetabolicCorridor if weight has changed by ±0.5kg
  },
});
```

### `verifyWorkoutSlot`

**File:** `src/mastra/tools/verify-workout-slot.tool.ts`
**Trigger:** Client confirms or skips a workout window via poll reply or text.

```typescript
export const verifyWorkoutSlot = createTool({
  id: 'verifyWorkoutSlot',
  description: 'Mark a scheduled workout slot as completed or skipped.',
  inputSchema: z.object({
    slot_id: z.string().uuid(),
    client_id: z.string().uuid(),
    trainer_id: z.string().uuid(),
    is_completed: z.boolean(),
    exertion_scale: z.number().int().min(1).max(10).optional(),
    notes: z.string().max(500).optional(),
    logged_at: z.string().datetime(),
  }),
  execute: async ({ context }) => {
    // UPDATE workout_slots SET completion_status, exertion_scale WHERE id = slot_id
  },
});
```

### `recalibrateMetabolicCorridor`

**File:** `src/mastra/tools/recalibrate-metabolic-corridor.tool.ts`
**Trigger:** Automatically invoked by `extractVitals` when weight delta ≥ ±0.5kg from last recorded value.

```typescript
export const recalibrateMetabolicCorridor = createTool({
  id: 'recalibrateMetabolicCorridor',
  description: 'Recompute BMR, TDEE, and weight projection corridors using Mifflin-St Jeor formula.',
  inputSchema: z.object({
    client_id: z.string().uuid(),
    trainer_id: z.string().uuid(),
    weight_kg: z.number(),
    height_cm: z.number(),
    age: z.number().int(),
    sex: z.enum(['M', 'F']),
    activity_level: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']),
    target_weight_kg: z.number(),
  }),
  execute: async ({ context }) => {
    // Import computeBMR, computeTDEE, projectGoalDate from shared/physical-math.ts
    // INSERT INTO weight_corridors, UPDATE date_projections
  },
});
```

**Formula source:** `shared/physical-math.ts` — Mifflin-St Jeor equations:
```
Male:   BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
Female: BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
TDEE   = BMR × activity_multiplier
```

### `requestClarification`

**File:** `src/mastra/tools/request-clarification.tool.ts`
**Trigger:** Incoming log data is structurally incomplete or ambiguous.

```typescript
export const requestClarification = createTool({
  id: 'requestClarification',
  description: 'Ask the client a single, targeted clarifying question. Call at most once per message.',
  inputSchema: z.object({
    missing_parameter: z.enum(['VOLUME', 'INGREDIENTS', 'TIMING']),
    clarification_prompt: z.string().min(10).max(200),
  }),
  execute: async ({ context }) => {
    // Sends the clarification_prompt via sendWhatsApp tool
    // Returns: { sent: true }
    // The agent must NOT attempt to log anything until the client replies with the missing data
  },
});
```

**Usage constraint:** This tool must be called **at most once** per incomplete message. If the clarification reply is also ambiguous, log with best-effort estimates and set `verification_status = 'UNVERIFIED'` rather than entering a clarification loop.

### `verifyPaymentOCR`

**File:** `src/mastra/tools/verify-payment-ocr.tool.ts`
**Trigger:** Client sends an image that the classifier identifies as a bank payment screenshot.

```typescript
export const verifyPaymentOCR = createTool({
  id: 'verifyPaymentOCR',
  description: 'Extract UTR number and payment amount from a UPI payment screenshot using Gemini Vision.',
  inputSchema: z.object({
    client_id: z.string().uuid(),
    trainer_id: z.string().uuid(),
    wam_id: z.string().min(1),
    image_storage_path: z.string().min(1),
    client_submitted_utr: z.string().length(12).optional(),
  }),
  outputSchema: z.object({
    extracted_utr: z.string().length(12).nullable(),
    extracted_amount: z.number().positive().nullable(),
    utr_match: z.boolean(),
    confidence: z.number().min(0).max(1),
  }),
  execute: async ({ context }) => {
    // 1. Download image from Supabase Storage via signed URL
    // 2. Call geminiCall({ type: 'vision', prompt: UTR_EXTRACTION_PROMPT, imageBuffer })
    // 3. Parse extracted UTR — check against upi_payments.utr_number UNIQUE constraint
    // 4. INSERT INTO upi_payments ... ON CONFLICT (utr_number) DO NOTHING
    // 5. Return match result for dashboard queue
  },
});
```

---

## 4. Advanced Logical Guardrails

### A. Allergy & Dislike Interception Engine

**Execution order:** This check must run **before** `parseMealLog` is invoked — it is an agent-level reasoning gate, not a tool.

```
INTERCEPTION PIPELINE:

1. Agent receives message containing dietary content
2. Agent identifies food items from the message text/transcription
3. Agent queries client_preferences WHERE client_id = $1 AND preference_type = 'ALLERGY'
4. For each identified food item:
   a. Fuzzy-match against client_preferences.value entries
   b. IF match found AND severity = 'STRICT':
        → DO NOT call parseMealLog
        → DO NOT insert any food_logs row
        → Respond with:
          "Log Rejected. This meal contains an item matching your registered allergens list.
           Please confirm what you actually ate, and I will log the safe portion."
        → Log rejection event to a separate allergen_rejections audit table
   c. IF match found AND severity = 'MODERATE':
        → Log the meal normally
        → Append a warning flag to the food_logs.notes field: "[ALLERGEN_WARNING: {item}]"
        → Respond with a soft caution note alongside the macro summary
5. IF no allergen match → proceed normally to parseMealLog
```

**Table dependency:** `client_preferences` (from migration `04_client_preferences.sql`).
**Columns used:** `preference_type`, `value`, `severity` (STRICT / MODERATE / MILD).

### B. "Wild Day / Party Mode" State Handler

**Trigger phrases** (detected by agent reasoning, not keyword matching):
- Semantic indicators of social eating where tracking is not possible: weddings, parties, festivals, "cheat day", "shaadi mein tha", "birthday celebration", "outing ke saath tha", "can't track today", etc.

**Execution path:**

```
1. Agent detects party/social-eating semantic context
2. Agent calls parseMealLog with the following fixed placeholder values:
   {
     meal_name: "Party / Social Meal (Untracked)",
     estimated_calories: 1000,
     protein_g: 30,
     carbs_g: 120,
     fats_g: 40,
     is_verified_by_photo: false,
     is_party_mode: true,
   }
3. food_logs row is inserted with is_party_mode = true
4. The daily completion streak is preserved — the slot is marked as logged, not skipped
5. Agent responds:
   "Got it — I've logged a Party Mode placeholder to keep your streak alive.
    Back to the plan tomorrow. 💪"
   (This is one of the few cases where a motivational tone is appropriate)
```

**Why a fixed placeholder:** Forcing clients to estimate macros during a social event creates friction and abandonment. The placeholder keeps the streak engine alive, preserves psychological engagement, and is clearly marked in the data so trainers can contextualize weekly compliance numbers.

---

## 5. Vellum Context Ingestion & Memory Rolling Window

### Context Architecture

The agent must not ingest unbounded chat history. Token overhead from loading full message logs would degrade response latency and increase per-call cost at scale (100+ active clients with daily interactions).

### Rolling Window Pattern

```
PER AGENT INVOCATION:

Context package assembled by the Consumer worker before calling the agent:
{
  client_profile: {
    name, timezone, tracking_status, dpdp_consent_at,
    is_bot_paused, current_plan_id
  },
  client_preferences: [ ...all ALLERGY/DISLIKE/DIET_TYPE rows ],
  recent_turns: [ ...last 10 messages (client + agent alternating) ],
  compressed_history_summary: "<dense string from session_cache>",
  active_meal_slots: [ ...today's meal_slots for this client ],
  latest_biometrics: { weight_kg, tdee, target_weight_kg, projected_reach_date },
}
```

### History Compression

When the rolling window exceeds 10 turns, the oldest turn is removed and the session state is recompressed:

```
Compression trigger: message count for this client in session_cache > 10

Compression prompt (sent to Gemini via geminiCall):
"Summarize the following fitness coaching conversation into a dense 3-sentence
 factual summary. Include: current weight trend, any logged meals, any
 compliance issues, and any outstanding clarifications. Be factual, not
 narrative. Output plain text only."

Result: stored in session_cache.value as { summary: string, last_compressed_at: ISO }
Expiry: session_cache row expires after 48 hours (pg_cron cleans stale entries)
```

### Vellum Integration

Vellum is used for vector search over health state documents (injury history, persistent dislikes, medical notes entered by the trainer). The Consumer worker executes a Vellum query before assembling the context package:

```typescript
// Retrieve semantically relevant health context
const relevantContext = await vellum.search({
  index: `client-health-${client_id}`,
  query: incomingMessageText,
  topK: 3,
});
// Inject results into context package as: health_context: relevantContext.results
```

This keeps injury history and medical notes out of the rolling window while making them available when semantically relevant (e.g., client mentions knee → Vellum retrieves knee injury record from 3 months ago).

---

## 6. Multi-Model Cascading Failover Loop

**File:** `src/lib/gemini/client.ts`

The failover wrapper is the single point of Gemini API access in the entire codebase. No agent tool or workflow may import the Gemini SDK directly.

### Model Priority Chain

| Tier | Model ID | Role | Trigger |
|---|---|---|---|
| **1 — Primary** | `gemini-3.5-flash` | High-fidelity multimodal: vision, audio transcription, Hinglish NL reasoning | Always attempted first |
| **2 — Fallback 1** | `gemini-3.1-flash-lite` | Rapid text classification and structured JSON extraction | `429 Too Many Requests` from Tier 1 |
| **3 — Fallback 2** | `gemini-2.5-flash` | Core JSON schema enforcement, basic text structuring | `429` or `500` from Tier 2 |
| **4 — Hard Failure** | *(no model)* | Silent degradation path | Any error from Tier 3 |

### Implementation

```typescript
// src/lib/gemini/client.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
] as const;

type GeminiTask = {
  type: 'text' | 'vision' | 'audio';
  prompt: string;
  imageBuffer?: Buffer;
  audioBuffer?: Buffer;
  responseSchema?: object;
};

type HardFallbackResult = {
  hardFallback: true;
  rawInput: string;
};

export async function geminiCall<T>(
  task: GeminiTask
): Promise<T | HardFallbackResult> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

  for (const modelId of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelId });
      // ... construct parts array from task type, call generateContent, parse result
      return result as T;
    } catch (err: any) {
      const isRetryable = err?.status === 429 || err?.status === 500;
      if (!isRetryable) throw err; // bubble non-rate-limit errors immediately
      // continue to next model
    }
  }

  // Hard fallback — all 3 models exhausted
  return { hardFallback: true, rawInput: task.prompt };
}
```

### Hard Fallback Behavior

When `geminiCall` returns `{ hardFallback: true }`, the calling tool or workflow must:

1. Set `food_logs.transcription_failed = true` (or equivalent flag on the relevant table row)
2. Write the raw user string or Meta media file ID into the `.notes` column as-is
3. Insert a `FAILED_PARSE` flag entry for dashboard review
4. Send the client a neutral acknowledgement: *"Got it — I'll flag that for your coach to review."*
5. **Never** surface a raw error message or stack trace to the client

The hard fallback must never block the main execution flow — it is a catch, log, and continue pattern.

---

## 7. Medical Liability & Safety Escape Hatch

### Trigger Vocabulary

The agent's reasoning loop evaluates every incoming message against this risk vocabulary **before any other processing**. This check is the highest-priority gate in the entire system.

**English triggers:**
- `chest pain`, `chest tightness`, `chest pressure`
- `can't breathe`, `breathing issue`, `shortness of breath`
- `heart racing`, `heart pounding`, `palpitations`
- `severe joint pop`, `joint locked`, `can't move my`
- `dizzy`, `dizziness`, `dizzy spell`, `fainted`, `blacked out`
- `severe pain`, `unbearable pain`
- `vomiting blood`, `coughing blood`
- `numbness in arm`, `numbness in leg`
- `swelling`, `inflammation` (when paired with injury context)

**Hinglish equivalents (non-exhaustive):**
- `saas nahi aa rahi`, `dil bahut tez dhadak raha hai`
- `ghutna lock ho gaya`, `bahut dard ho raha hai`
- `chakkar aa raha hai`, `behosh ho gaya`

### Escalation Execution (3 Atomic Operations)

These three operations must execute in order, synchronously, before any other agent action:

**Operation 1 — Halt coaching loop**
```
Immediately return from the coaching workflow without calling any other tool.
Do not log the message as a food entry, vital, or workout update.
```

**Operation 2 — Send safety message to client**
```typescript
await sendWhatsApp(client_phone, {
  type: 'text',
  body: "Critical Safety Warning: I have detected a physiological risk factor in your message. " +
        "Your training loop has been temporarily paused, and your coach has been notified to " +
        "review your condition immediately. Please rest and contact a doctor if needed."
});
```

**Operation 3 — Set database flags and trigger trainer alert**
```typescript
await supabase
  .from('clients')
  .update({
    is_bot_paused: true,
    tracking_status: 'ESCALATED',
    trainer_alert_flag: true,
    alert_reason: 'MEDICAL_ESCALATION',
  })
  .eq('id', client_id);

await supabase
  .from('escalation_log')
  .insert({
    client_id,
    trainer_id,
    trigger_phrase: detectedPhrase,
    full_message: rawMessageText,
    escalated_at: new Date().toISOString(),
  });

// Fire Telegram notification to trainer
await sendTelegramAlert(trainer_telegram_chat_id, {
  priority: 'HIGH',
  message: `MEDICAL ESCALATION — Client ${client_name} flagged a health risk. Review immediately.`,
});
```

**Schema addition:** The `clients` table requires two additional columns not in the original migration spec:
- `trainer_alert_flag BOOLEAN DEFAULT false`
- `alert_reason TEXT`

These must be added to migration `03_core_identity.sql` or as a new migration `03b_alert_columns.sql`.

### Resumption

The `is_bot_paused = true` flag means the bot will not respond to any further client messages until the trainer manually clears it from the dashboard. The trainer dashboard's client detail page must include a "Clear Escalation" button that sets `is_bot_paused = false`, `tracking_status = 'ACTIVE'`, `trainer_alert_flag = false`, `alert_reason = null`, and sets `escalation_log.resolved_at = now()`.

---

## 8. Audio Transcription & 16MB Payload Boundaries

### Size Validation

WhatsApp enforces a maximum voice note size of **16MB**. The Consumer worker must validate the file size before downloading.

```
AUDIO INGESTION PIPELINE:

1. Receive media_id from webhook payload (Section 4 of whatsapp_spec.md)
2. Execute Step A of media download (graph.facebook.com/{media_id} — returns metadata)
3. Check file_size from metadata response:
   IF file_size > 16 * 1024 * 1024 (16,777,216 bytes):
     → Log error to security_events: "Oversized audio payload rejected"
     → Set voice_notes.transcription_failed = true
     → Notify trainer dashboard
     → Return early — do NOT attempt download
4. Execute Step B — download binary buffer
5. Verify actual buffer.length matches file_size from Step A (integrity check)
6. Pass buffer to Gemini transcription
```

### Transcription Call

```typescript
// src/mastra/workflows/voice-note.workflow.ts

const result = await geminiCall<{ transcript: string; confidence: number }>({
  type: 'audio',
  prompt: `Transcribe this WhatsApp voice note. The speaker may use Hinglish 
           (Hindi words in Latin script mixed with English). 
           Return JSON: { "transcript": string, "confidence": number between 0 and 1 }`,
  audioBuffer: fileBuffer,
});

if ('hardFallback' in result) {
  // Hard fallback path — store .ogg in failed-voice-notes bucket
  await handleFailedTranscription(wam_id, client_id, trainer_id, fileBuffer);
  return { failed: true };
}

if (result.confidence < 0.75) {
  // Low confidence — treat same as hard fallback
  await handleFailedTranscription(wam_id, client_id, trainer_id, fileBuffer);
  return { failed: true };
}

// Success — pass transcript to fortressCoach for intent parsing
return { failed: false, transcript: result.transcript };
```

### Failed Transcription Handler

```typescript
async function handleFailedTranscription(
  wam_id: string,
  client_id: string,
  trainer_id: string,
  fileBuffer: Buffer
) {
  // 1. Upload .ogg to failed-voice-notes bucket
  const storagePath = `${trainer_id}/${client_id}/${wam_id}.ogg`;
  await supabase.storage
    .from('failed-voice-notes')
    .upload(storagePath, fileBuffer, { contentType: 'audio/ogg' });

  // 2. Insert voice_notes row
  await supabase.from('voice_notes').insert({
    wam_id,
    client_id,
    trainer_id,
    ogg_path: storagePath,
    transcription_failed: true,
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  });

  // 3. Create food_logs placeholder with transcription_failed = true
  await supabase.from('food_logs').insert({
    wam_id,
    client_id,
    trainer_id,
    transcription_failed: true,
    verification_status: 'UNVERIFIED',
    notes: `[TRANSCRIPTION_FAILED: voice note stored at ${storagePath}]`,
  });
  // food_logs insert uses ON CONFLICT (wam_id) DO NOTHING — safe to retry
}
```

### Dashboard Rendering

Failed voice notes appear in `/dashboard/voice-notes` as yellow `UNREAD_VOICE_NOTE` entries. Each entry renders:
- Client name + timestamp
- Expiry countdown (48h from upload)
- HTML5 `<audio>` player with a signed Supabase Storage URL (1h expiry)
- "Manual Entry" text input → writes to `food_logs.notes`, sets `voice_notes.resolved_by`
- "Re-submit to AI" button → retries `geminiCall` with an elevated prompt

---

## Appendix A: Tool File Map

| Tool | File | Trigger |
|---|---|---|
| `parseMealLog` | `src/mastra/tools/parse-meal-log.tool.ts` | Dietary text / poll / voice |
| `extractVitals` | `src/mastra/tools/extract-vitals.tool.ts` | Morning check-in |
| `verifyWorkoutSlot` | `src/mastra/tools/verify-workout-slot.tool.ts` | Workout confirmation / skip |
| `recalibrateMetabolicCorridor` | `src/mastra/tools/recalibrate-metabolic-corridor.tool.ts` | Weight delta ≥ ±0.5kg |
| `requestClarification` | `src/mastra/tools/request-clarification.tool.ts` | Incomplete log data |
| `verifyPaymentOCR` | `src/mastra/tools/verify-payment-ocr.tool.ts` | UPI screenshot image |
| `escalateInjury` | `src/mastra/tools/escalate-injury.tool.ts` | Medical risk phrase detected |

## Appendix B: Shared Utility Dependencies

| Module | File | Used By |
|---|---|---|
| Mifflin-St Jeor formulas | `shared/physical-math.ts` | `recalibrateMetabolicCorridor` |
| Zod base schemas | `shared/zod-schemas.ts` | All tools |
| Status enums | `shared/constants.ts` | All tools, workflows |
| Gemini failover client | `src/lib/gemini/client.ts` | All tools requiring AI calls |
| WhatsApp send router | `src/lib/whatsapp/send.ts` | `requestClarification`, `escalateInjury` |
| Supabase admin client | `src/lib/supabase/admin.ts` | All tool `execute()` functions |

## Appendix C: Schema Additions Required

The following DB columns are required by this spec but were not in the original migration plan. Add to migration `03_core_identity.sql` or create `03b_alert_columns.sql`:

```sql
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS trainer_alert_flag BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_reason TEXT;
```

---

*Last updated: 2026-06-09 — Initial AI agent layer technical specification. No implementation code written yet.*
