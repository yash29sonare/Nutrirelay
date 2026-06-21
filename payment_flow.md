# Technical Specification: Zero-Fee UPI OCR Gate & Ledger Architecture

> **Reference manual for the manual payment ledger mechanism.** All UPI payment ingestion, OCR extraction, fraud prevention, and verification queue implementation must conform to this document.
> Cross-reference `CLAUDE.md` Gate H1, `design.md` Section 2 (`payment_logs` table), and `whatsapp_spec.md` Section 5 (media download pipeline).

---

## 1. Core Financial Workflow Ingress

### End-to-End Payment Submission Flow

```
[Trainer Dashboard]
  │  Displays static UPI QR code (public/upi-qr.png)
  │  QR encodes trainer's UPI VPA stored in trainers.upi_vpa
  ▼

[Client's Banking App]
  │  Scans QR → completes transfer → views success confirmation screen
  │  Manually notes the 12-digit UTR from the success screen
  ▼

[WhatsApp Thread]
  │  Client uploads screenshot of bank confirmation
  │  Client types their UTR: e.g. "UTR: 426198374651"
  │  (Both may arrive as separate messages or combined)
  ▼

[Ingress Producer — /api/webhook/whatsapp]
  │  HMAC-SHA256 verification (whatsapp_spec.md Section 2)
  │  Enqueue raw payload to pgmq
  │  Return HTTP 200 OK < 200ms
  ▼

[worker-orchestrator Consumer]
  │  Dequeue payload
  │  Detect: message type = 'image' + payment context signal
  │  Bind client_id and trainer_id from session_cache immediately
  │  → Preserve RLS boundary before any storage or DB write
  ▼

[verifyPaymentOCR Tool — Mastra]
  │  Execute 4-layer validation pipeline (Section 3)
  ▼

[payment_logs row + dashboard queue]
```

### Session Binding Requirement

Before any storage write or database insert, the consumer worker must resolve `client_id` and `trainer_id` from the session cache (keyed by `wa_phone`). These two values are the RLS anchors — a payment record without them must be rejected, not partially stored.

```typescript
const client = await supabase
  .from('clients')
  .select('id, trainer_id')
  .eq('wa_phone', client_phone)
  .single();

if (!client.data) {
  // Unknown sender — discard, log to security_events
  return;
}

const { id: client_id, trainer_id } = client.data;
// client_id and trainer_id are now bound to this transaction context
```

### Payment Context Detection

The consumer worker classifies an inbound image as a payment submission when either:
- The message caption contains UTR-pattern text (12 consecutive digits, optionally prefixed with "UTR", "Ref", "Transaction ID")
- The client's `tracking_status` context window shows an active renewal prompt was sent in the last 48 hours
- A preceding text message in the session contained a UTR-pattern string (text + image across two messages)

UTR extraction regex: `/\b\d{12}\b/`

---

## 2. Multimodal OCR Processing Pipeline

### Image Ingestion

```typescript
// 1. Download image binary from Meta (whatsapp_spec.md Section 5)
const storagePath = `tmp/${trainer_id}/${wam_id}.jpg`;
await downloadMediaToStorage(media_id, 'payment-screenshots', storagePath);

// 2. Generate signed URL for Gemini Vision (1-hour expiry)
const { data: { signedUrl } } = await supabase.storage
  .from('payment-screenshots')
  .createSignedUrl(storagePath, 3600);

// 3. Download buffer for Gemini inline (Vision API accepts base64 or buffer)
const imageBuffer = Buffer.from(await fetch(signedUrl).then(r => r.arrayBuffer()));
```

### Gemini Vision Dispatch

```typescript
const OCR_PROMPT = `
Analyze this image. Determine if it is a UPI payment success/confirmation screenshot
from an Indian banking app (PhonePe, GPay, Paytm, BHIM, bank app, etc.).

If it IS a valid payment receipt, extract:
- The 12-digit UTR (Unique Transaction Reference) number
- The exact transfer amount (numeric value only, no currency symbol)
- The transaction date and time (convert to ISO-8601 if possible)
- Your confidence in the extraction accuracy (0.0 to 1.0)

Return ONLY valid JSON matching this exact schema:
{
  "is_valid_receipt": boolean,
  "utr_number": string | null,
  "monetary_value": number | null,
  "date_stamp": string | null,
  "confidence_score": number
}

If is_valid_receipt is false, set all other fields to null.
Do not include any explanation outside the JSON object.
`;

const result = await geminiCall<OCRExtractionResult>({
  type: 'vision',
  prompt: OCR_PROMPT,
  imageBuffer,
  responseSchema: OCR_SCHEMA,
});
```

### Zod Validation Schema

```typescript
// src/lib/whatsapp/payment-ocr.ts

import { z } from 'zod';

export const OCR_SCHEMA = z.object({
  is_valid_receipt: z.boolean(),
  utr_number: z.string().regex(/^\d{12}$/).nullable(),
  monetary_value: z.number().positive().nullable(),
  date_stamp: z.string().datetime({ offset: true }).nullable(),
  confidence_score: z.number().min(0).max(1),
});

export type OCRExtractionResult = z.infer<typeof OCR_SCHEMA>;
```

**Hard Fallback (geminiCall returns `{ hardFallback: true }`):**
- Insert `payment_logs` row with `status = 'MISMATCH_REVIEW'`, `transcription_failed = true`
- Store raw `wam_id` and `media_id` in `notes`
- Flag for trainer manual review
- Send client: *"We received your payment screenshot — your coach will review it shortly."*
- Do NOT delete the temp storage asset

---

## 3. Hardened Anti-Fraud & Cross-Verification Gates

All four gates execute sequentially. A failure at any gate aborts the remaining gates.

```
image received
      │
      ▼
 ┌─────────────────────────────────────────────────────────┐
 │  GATE A — Classification Guard                          │
 │  is_valid_receipt === false?                            │
 │  → Delete temp asset                                    │
 │  → Notify client (invalid receipt)                      │
 │  → ABORT                                                │
 └─────────────────────────┬───────────────────────────────┘
                           │ PASS
                           ▼
 ┌─────────────────────────────────────────────────────────┐
 │  GATE B — String Alignment (Mismatch Gate)              │
 │  user_typed_utr !== extracted_utr?                      │
 │  → Insert with status = 'MISMATCH_REVIEW'               │
 │  → transcription_failed = true                          │
 │  → Dashboard: yellow highlight                          │
 │  → HALT (trainer must manually resolve)                 │
 └─────────────────────────┬───────────────────────────────┘
                           │ PASS (strings match)
                           ▼
 ┌─────────────────────────────────────────────────────────┐
 │  GATE C — Price Tier Validation                         │
 │  monetary_value !== expected_subscription_price?        │
 │  → Insert with status = 'MISMATCH_REVIEW'               │
 │  → error_flag = 'AMOUNT_MISMATCH'                       │
 │  → Dashboard: variance prominently displayed            │
 │  → HALT (trainer must manually resolve)                 │
 └─────────────────────────┬───────────────────────────────┘
                           │ PASS (amount matches)
                           ▼
 ┌─────────────────────────────────────────────────────────┐
 │  GATE D — Unique Constraint Anti-Replay                 │
 │  utr_number EXISTS in payment_logs?                     │
 │  → Flag client as HIGH_RISK_SUSPENDED                   │
 │  → is_bot_paused = true                                 │
 │  → Log to fraud_attempts table                          │
 │  → Push RED ALERT to trainer dashboard                  │
 │  → ABORT                                                │
 └─────────────────────────┬───────────────────────────────┘
                           │ PASS (UTR is unique)
                           ▼
               Insert with status = 'PENDING'
               Add to trainer verification queue
```

### Gate A — Classification Guard

```typescript
if (!ocrResult.is_valid_receipt) {
  // Delete the temp storage asset immediately
  await supabase.storage
    .from('payment-screenshots')
    .remove([`tmp/${trainer_id}/${wam_id}.jpg`]);

  // Notify client
  await sendWhatsApp(client_phone, {
    type: 'text',
    body: "Invalid Asset: The image uploaded does not appear to be a valid payment " +
          "confirmation receipt. Please try uploading your screenshot again.",
  });

  return; // ABORT — no DB write
}
```

### Gate B — String Alignment Check

```typescript
const utrMatch = ocrResult.utr_number === user_typed_utr;

if (!utrMatch) {
  await supabase.from('payment_logs').insert({
    wam_id, client_id, trainer_id,
    utr_number: user_typed_utr,           // Use client-submitted UTR as the row key
    gemini_extracted_utr: ocrResult.utr_number,
    extracted_amount: ocrResult.monetary_value,
    screenshot_path: finalStoragePath,
    submitted_at: new Date().toISOString(),
    status: 'MISMATCH_REVIEW',
    transcription_failed: true,
    error_flag: 'UTR_MISMATCH',
    notes: `Client typed: ${user_typed_utr} | Gemini extracted: ${ocrResult.utr_number}`,
  });
  return; // HALT — trainer resolves manually
}
```

**Note:** Gate B uses the client-submitted UTR as the `utr_number` primary key, not the Gemini-extracted UTR. This is intentional — the client types what they see on their screen; OCR can occasionally misread a digit. The trainer's manual resolution in `MISMATCH_REVIEW` state is the authority.

### Gate C — Price Tier Validation

```typescript
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('package_price')
  .eq('client_id', client_id)
  .eq('is_active', true)
  .single();

const expectedPrice = subscription?.package_price;
const priceTolerance = 1.0; // ±₹1 tolerance for rounding differences

if (expectedPrice && Math.abs(ocrResult.monetary_value! - expectedPrice) > priceTolerance) {
  await supabase.from('payment_logs').insert({
    ...basePaymentRecord,
    status: 'MISMATCH_REVIEW',
    error_flag: 'AMOUNT_MISMATCH',
    notes: `Expected: ₹${expectedPrice} | Extracted: ₹${ocrResult.monetary_value}`,
  });
  return; // HALT
}
```

**Schema addition required:** `subscriptions` table needs a `package_price DECIMAL NOT NULL` column. Add to migration `06_forecasting_logic.sql` or as `06b_subscription_price.sql`.

### Gate D — Unique Constraint Anti-Replay Moat

This gate relies on the database `UNIQUE` constraint on `payment_logs.utr_number` as the hard enforcement layer. The application-level check below is a pre-flight that enables better UX (immediate bot response) before the DB constraint fires.

```typescript
// Application-level pre-flight check
const { data: existingPayment } = await supabase
  .from('payment_logs')
  .select('id, status')
  .eq('utr_number', user_typed_utr)
  .maybeSingle();

if (existingPayment) {
  // Duplicate UTR detected — potential replay fraud

  // Escalate client status
  await supabase
    .from('clients')
    .update({
      tracking_status: 'HIGH_RISK_SUSPENDED',
      is_bot_paused: true,
      trainer_alert_flag: true,
      alert_reason: 'DUPLICATE_UTR_FRAUD_ATTEMPT',
    })
    .eq('id', client_id);

  // Log the fraud attempt
  await supabase.from('fraud_attempts').insert({
    client_id, trainer_id,
    attempted_utr: user_typed_utr,
    existing_payment_log_id: existingPayment.id,
    attempt_wam_id: wam_id,
    logged_at: new Date().toISOString(),
  });

  // Push red alert to trainer dashboard (Telegram + dashboard flag)
  await sendTelegramAlert(trainer_telegram_chat_id, {
    priority: 'HIGH',
    message: `⛔ FRAUD ALERT — Client ${client_name} submitted a duplicate UTR: ${user_typed_utr}. Bot paused.`,
  });

  // DO NOT notify the client — silence is intentional (don't tip off fraudsters)
  return; // ABORT
}
// Database-level UNIQUE constraint is the final backstop:
// INSERT ... ON CONFLICT (utr_number) DO NOTHING
```

**Schema addition required:** `fraud_attempts` table — add to migration `06_forecasting_logic.sql` or as `06c_fraud_log.sql`:
```sql
CREATE TABLE fraud_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  attempted_utr TEXT NOT NULL,
  existing_payment_log_id UUID REFERENCES payment_logs(id),
  attempt_wam_id TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE fraud_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_isolation" ON fraud_attempts FOR ALL USING (auth.uid() = trainer_id);
```

---

## 4. Admin Command Center State Machine

### Status Transition Diagram

```
                    ┌──────────────────┐
                    │     PENDING      │  ← Non-duplicate, all gates passed
                    │  (needs review)  │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
   ┌──────────────────┐         ┌────────────────────┐
   │    VERIFIED      │         │     REJECTED       │
   │ (trainer approved)│        │ (trainer rejected) │
   └──────────────────┘         └────────────────────┘

   ┌──────────────────┐
   │ MISMATCH_REVIEW  │  ← UTR mismatch, amount mismatch, or OCR hard fallback
   │ (needs override) │
   └────────┬─────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
 VERIFIED         REJECTED
```

### State Definitions

#### `PENDING`

Rendered in the trainer dashboard at `/dashboard/payments`.

```
┌──────────────────────────────────────────────────────────┐
│  Client: Priya Sharma              Submitted: 09 Jun 14:32│
│  ────────────────────────────────────────────────────────│
│  [HIGH-RES SCREENSHOT]     UTR (client): 426198374651     │
│                            UTR (OCR):    426198374651  ✓  │
│                            Amount (OCR): ₹3,499            │
│                            Expected:     ₹3,499        ✓  │
│                            Confidence:   0.94              │
│                                                           │
│              [✓ Approve]              [✗ Reject]          │
└──────────────────────────────────────────────────────────┘
```

- High-resolution screenshot rendered via signed Supabase Storage URL (1-hour expiry)
- Both UTR values shown side-by-side with a match indicator (✓ / ✗)
- Extracted amount vs expected subscription price shown with match indicator
- Gemini confidence score displayed as context for the trainer

#### `MISMATCH_REVIEW`

Rendered with a yellow highlight border. The `error_flag` column determines which mismatch type is shown:

| `error_flag` | Dashboard Label | Trainer Action Available |
|---|---|---|
| `UTR_MISMATCH` | "UTR Mismatch — verify manually" | Manual UTR input field |
| `AMOUNT_MISMATCH` | "Amount Variance — ₹X expected, ₹Y received" | Override amount field + approve |
| `OCR_FAILED` | "OCR failed — manual entry required" | Full manual entry form |

The trainer can override and input the true values. On manual override + approval:
```typescript
await supabase.from('payment_logs').update({
  status: 'VERIFIED',
  utr_number: trainer_verified_utr,           // Trainer's manually entered UTR
  extracted_amount: trainer_verified_amount,
  verified_by_trainer: true,
  verified_at: new Date().toISOString(),
  manually_overridden: true,
}).eq('id', payment_log_id);
```

#### `VERIFIED`

Triggered when the trainer taps [Approve] on a `PENDING` or `MISMATCH_REVIEW` record.

```typescript
async function approvePayment(paymentLogId: string) {
  // 1. Update payment record
  await supabase.from('payment_logs').update({
    status: 'VERIFIED',
    verified_by_trainer: true,
    verified_at: new Date().toISOString(),
  }).eq('id', paymentLogId);

  // 2. Extend client subscription +30 days
  await supabase.from('subscriptions').update({
    expires_at: supabase.rpc('add_days_to_expiry', { client_id, days: 30 }),
    is_active: true,
    renewal_notified_d28: false,
    renewal_notified_d30: false,
  }).eq('client_id', clientId).eq('is_active', true);

  // 3. Reactivate client if they were PAUSED for renewal
  await supabase.from('clients').update({
    tracking_status: 'ACTIVE',
  }).eq('id', clientId).eq('tracking_status', 'PAUSED');

  // 4. Send congratulations WhatsApp message to client
  await sendWhatsApp(client_phone, {
    type: 'text',
    body: "Payment confirmed! ✓ Your plan has been extended for another 30 days. " +
          "Let's get back to it — your next meal check-in is coming up.",
  });

  // 5. Re-schedule all Trigger.dev meal and workout jobs for this client
  await triggerClient.sendEvent({ name: 'client.reactivate', payload: { client_id } });
}
```

#### `REJECTED`

Triggered when the trainer taps [Reject].

```typescript
async function rejectPayment(paymentLogId: string, reason: string) {
  // 1. Mark record as rejected
  await supabase.from('payment_logs').update({
    status: 'REJECTED',
    rejection_reason: reason,
    verified_by_trainer: false,
    verified_at: new Date().toISOString(),
  }).eq('id', paymentLogId);

  // 2. Clear screenshot from dashboard visibility
  //    (asset remains in storage until nightly pruner — see Section 5)

  // 3. Notify client
  await sendWhatsApp(client_phone, {
    type: 'text',
    body: "Payment Rejected: We were unable to verify your transaction reference. " +
          "Please double-check your UTR number and upload a clear screenshot of your " +
          "bank confirmation screen. Contact your coach if you need help.",
  });
}
```

### Payment Log Schema (Full)

```sql
-- In migration 06_forecasting_logic.sql

CREATE TABLE payment_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id            UUID NOT NULL REFERENCES trainers(id),
  client_id             UUID NOT NULL REFERENCES clients(id),
  wam_id                TEXT NOT NULL,
  utr_number            TEXT NOT NULL UNIQUE,          -- Anti-replay moat
  gemini_extracted_utr  TEXT,
  extracted_amount      DECIMAL(10, 2),
  date_stamp            TIMESTAMPTZ,
  screenshot_path       TEXT,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  status                TEXT NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING','MISMATCH_REVIEW','VERIFIED','REJECTED')),
  error_flag            TEXT
                          CHECK (error_flag IN ('UTR_MISMATCH','AMOUNT_MISMATCH','OCR_FAILED')),
  transcription_failed  BOOLEAN NOT NULL DEFAULT false,
  manually_overridden   BOOLEAN NOT NULL DEFAULT false,
  rejection_reason      TEXT,
  verified_by_trainer   BOOLEAN NOT NULL DEFAULT false,
  verified_at           TIMESTAMPTZ,
  notes                 TEXT
);

ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_isolation" ON payment_logs
  FOR ALL USING (auth.uid() = trainer_id);

CREATE INDEX idx_payment_logs_client ON payment_logs (client_id);
CREATE INDEX idx_payment_logs_status ON payment_logs (status);
```

---

## 5. Storage Pruning & Asset Downsampling Rules

### Retention Policy by Status

| Status | Retention | Action at Prune Time |
|---|---|---|
| `PENDING` | Indefinite | No pruning — active review item |
| `MISMATCH_REVIEW` | Indefinite | No pruning — active review item |
| `VERIFIED` | 7 days post-verification | Downsampled to 5KB WebP; original deleted |
| `REJECTED` | 24 hours post-rejection | Original deleted immediately |
| `tmp/` (unprocessed) | 2 hours | Deleted if no corresponding payment_log row exists |

### `storage-pruner` Payment Assets Execution

**File:** `trigger/storage-pruner.ts` (payment section)
**Schedule:** Daily at 02:00 IST (20:30 UTC) — same job as the full storage pruner in `design.md`

```
STEP A — Prune rejected screenshots (24h after rejection):
  SELECT * FROM payment_logs
    WHERE status = 'REJECTED'
    AND verified_at < now() - interval '24 hours'
    AND screenshot_path IS NOT NULL
  For each row:
    → supabase.storage.from('payment-screenshots').remove([screenshot_path])
    → UPDATE payment_logs SET screenshot_path = NULL WHERE id = $1

STEP B — Downsample verified screenshots (7 days after verification):
  SELECT * FROM payment_logs
    WHERE status = 'VERIFIED'
    AND verified_at < now() - interval '7 days'
    AND screenshot_path IS NOT NULL
    AND manually_overridden = false  -- keep overridden records at full res for audit
  For each row:
    → Download original from Supabase Storage
    → Sharp: resize to max 400px width, convert to WebP, quality: 20 (target ≤5KB)
    → Verify compressed size ≤ 8KB (allow small overage for complex screenshots)
    → Re-upload as {trainer_id}/{utr_number}_compressed.webp (upsert: true)
    → UPDATE payment_logs SET screenshot_path = new_webp_path WHERE id = $1
    → Remove original heavy file from storage
    → Log: { original_bytes, compressed_bytes, ratio } to storage_audit_log

STEP C — Clean orphaned tmp/ assets:
  List all objects under payment-screenshots/tmp/{trainer_id}/
  For each object older than 2 hours:
    Extract wam_id from filename
    IF no payment_logs row with wam_id exists:
      → supabase.storage.from('payment-screenshots').remove([path])
```

### Storage Budget Projection

A typical mobile bank success screenshot is 200KB–600KB. With 100 active clients paying monthly:
- Raw: 100 × 400KB average = 40MB/month
- After 7-day compression: ~100 × 5KB = 0.5MB retained/month
- Net monthly footprint: < 1MB rolling (verified + compressed)
- `failed-voice-notes`: < 5MB rolling (48h TTL, ~5 voice notes/day at 200KB each)
- `proof-of-plate`: < 10MB rolling (14-day TTL with daily entries)
- **Total projected storage:** < 20MB at 100 active clients — well within 1GB free tier

---

## Appendix A: New Schema Additions Required

Items identified in this spec that are not yet in the migration plan:

| Table | Column/Change | Migration File |
|---|---|---|
| `subscriptions` | `package_price DECIMAL(10,2) NOT NULL` | Add to `06_forecasting_logic.sql` |
| `payment_logs` | `error_flag TEXT`, `manually_overridden BOOLEAN`, `rejection_reason TEXT` | Already included in Section 4 schema above |
| `fraud_attempts` | New table (full schema in Gate D above) | New migration `06c_fraud_log.sql` |

`clients.tracking_status` CHECK constraint must include `'HIGH_RISK_SUSPENDED'` as a valid value. Update migration `03_core_identity.sql`:
```sql
-- Add HIGH_RISK_SUSPENDED to existing tracking_status constraint
ALTER TABLE clients DROP CONSTRAINT clients_tracking_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_tracking_status_check
  CHECK (tracking_status IN (
    'PENDING_CONSENT','ACTIVE','GHOST_MODE','ESCALATED','PAUSED','HIGH_RISK_SUSPENDED'
  ));
```

---

## Appendix B: File Map

| Spec Section | Implementation File |
|---|---|
| Section 1 (context binding) | `src/mastra/workflows/inbound-message.workflow.ts` |
| Section 2 (OCR pipeline) | `src/mastra/tools/verify-payment-ocr.tool.ts` |
| Section 2 (Zod schema) | `src/lib/whatsapp/payment-ocr.ts` |
| Section 3 (all 4 gates) | `src/mastra/tools/verify-payment-ocr.tool.ts` |
| Section 4 (approve action) | `src/app/(dashboard)/payments/actions.ts` |
| Section 4 (dashboard UI) | `src/app/(dashboard)/payments/page.tsx` |
| Section 5 (pruner) | `trigger/storage-pruner.ts` |
| DB schema | `supabase/migrations/06_forecasting_logic.sql` + `06c_fraud_log.sql` |

---

*Last updated: 2026-06-09 — Initial zero-fee UPI OCR gate and ledger technical specification. No implementation code written yet.*
