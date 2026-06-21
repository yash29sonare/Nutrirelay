# Technical Specification: WhatsApp Ingress & Gateway Layer

> **Reference manual for the webhook Producer layer, cryptographic security, payload parsing, media downloads, and session window management.**
> All implementation code must conform exactly to this document. Cross-reference `CLAUDE.md` Gate B for the architectural mandate.

---

## 1. Webhook Authentication Handshake

**Endpoint:** `GET /api/webhook/whatsapp`

When Meta registers or re-verifies your webhook URL, it sends a one-time `GET` request to this endpoint with three query parameters. The endpoint must respond correctly or Meta will refuse to deliver any future webhook events.

### Query Parameters

| Parameter | Description |
|---|---|
| `hub.mode` | Always the string `"subscribe"` during verification |
| `hub.verify_token` | A string you set in the Meta App Dashboard — must match `WHATSAPP_VERIFY_TOKEN` in your environment |
| `hub.challenge` | A random string Meta generated — you must echo this back verbatim |

### Validation Logic

```
1. Read hub.mode, hub.verify_token, hub.challenge from the request URL
2. IF hub.mode === "subscribe" AND hub.verify_token === process.env.WHATSAPP_VERIFY_TOKEN:
     → Return HTTP 200 OK
     → Response body: the raw hub.challenge string (plain text, no JSON wrapper)
3. ELSE:
     → Return HTTP 403 Forbidden
     → Response body: "Forbidden"
```

### Critical Implementation Notes

- Return the raw `hub.challenge` string as the response body — **not** `JSON.stringify(hub.challenge)`. Meta validates the exact byte sequence.
- The `WHATSAPP_VERIFY_TOKEN` value is a secret you define (any random string). Store it in `.env.local`. Never hardcode it.
- This route must be publicly accessible — do not place it behind auth middleware.

---

## 2. Cryptographic Security Guard (HMAC-SHA256)

**Endpoint:** `POST /api/webhook/whatsapp`

Every inbound payload from Meta is signed with your app's secret. Validating this signature is the first gate every POST request must pass — before any parsing, queuing, or logging.

### Header Format

```
X-Hub-Signature-256: sha256=<hex_digest>
```

The prefix `sha256=` is always present and must be stripped before comparison.

### Validation Pipeline

```
1. Read the raw request body as a Buffer/Uint8Array BEFORE any JSON parsing
   (JSON.parse destroys the original byte sequence — HMAC must run on the raw stream)

2. Extract the header: request.headers['x-hub-signature-256']
   Strip the "sha256=" prefix to isolate the hex digest string

3. Compute HMAC-SHA256:
   key    = Buffer.from(process.env.WHATSAPP_APP_SECRET, 'utf-8')
   data   = raw body buffer
   result = crypto.createHmac('sha256', key).update(data).digest('hex')

4. Compare using constant-time equality:
   crypto.timingSafeEqual(
     Buffer.from(computed_hex, 'utf-8'),
     Buffer.from(received_hex, 'utf-8')
   )

5. IF signatures match → proceed to enqueue (Section 3)
   IF signatures do not match → return HTTP 401 Unauthorized immediately
                               → log attempt to security_events table
                               → do NOT pass the payload any further
```

### Why Constant-Time Comparison

A standard `===` string comparison leaks timing information — an attacker can craft signatures and measure response times to reverse-engineer the secret. `crypto.timingSafeEqual` eliminates this side-channel by always taking the same amount of time regardless of where the strings first diverge.

### Next.js Implementation Note

In Next.js App Router route handlers, the default body parsing is active and consumes the stream. To read the raw body, use:

```typescript
const rawBody = await request.arrayBuffer();
const rawBuffer = Buffer.from(rawBody);
// Now use rawBuffer for HMAC, then JSON.parse(rawBuffer.toString()) for the payload
```

File: `src/lib/whatsapp/verify-signature.ts`

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

export function verifySignature(rawBody: Buffer, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const received = signatureHeader.replace('sha256=', '');
  const computed = createHmac('sha256', process.env.WHATSAPP_APP_SECRET!)
    .update(rawBody)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(computed, 'utf-8'), Buffer.from(received, 'utf-8'));
  } catch {
    // Buffer lengths differ → always invalid
    return false;
  }
}
```

---

## 3. Fast-Producer Ingress Pattern (Fending off Meta's Retry Storm)

### The Problem

Meta enforces a **hard 3-second network timeout** on all webhook deliveries. If your endpoint does not return an HTTP 200 within 3 seconds, Meta marks the delivery as failed and begins an exponential retry sequence — resending the identical payload multiple times. Each retry causes:

- Duplicate food log rows (without idempotency guards)
- Duplicate AI agent invocations (wasted Gemini quota)
- Cascading loop execution in Trigger.dev jobs
- pgmq queue pollution with replicated messages

Any real work — Gemini API calls, Mastra workflow execution, database writes beyond a single enqueue — will routinely exceed 3 seconds under load.

### The Solution: Decouple Producer from Consumer

```
Meta → POST /api/webhook/whatsapp
         │
         ├─ [1] Verify HMAC signature       < 5ms
         ├─ [2] Enqueue raw payload to pgmq < 20ms
         └─ [3] Return HTTP 200 OK          < 200ms total wall-clock

         ↓ (asynchronous, no time constraint)

pgmq queue → Consumer worker (Trigger.dev / Supabase background)
               │
               ├─ Dequeue message
               ├─ Parse payload
               ├─ Run Mastra agent workflows
               ├─ Call Gemini API
               ├─ Write food_logs, voice_notes, etc.
               └─ Update client state
```

### Producer Implementation (`src/app/api/webhook/whatsapp/route.ts`)

```typescript
// POST handler — Producer Layer
export async function POST(request: Request) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-hub-signature-256');

  // Gate 1: Cryptographic verification
  if (!verifySignature(rawBody, signature)) {
    await logSecurityEvent('INVALID_SIGNATURE', request);
    return new Response('Unauthorized', { status: 401 });
  }

  // Gate 2: Enqueue raw payload string — the ONLY work done here
  const supabase = createAdminClient();
  await supabase.rpc('pgmq_send', {
    queue_name: 'whatsapp_message_queue',
    message: rawBody.toString('utf-8'),
  });

  // Gate 3: Acknowledge Meta immediately
  return new Response('OK', { status: 200 });
}
```

### Queue Table

The `whatsapp_message_queue` is managed by the `pgmq` extension (migration `02_queue_system.sql`). The raw payload is stored as a string — no parsing, no transformation, no validation beyond signature check. The consumer owns all interpretation.

### Consumer Entry Point

The consumer worker lives at `src/mastra/workflows/inbound-message.workflow.ts`. It dequeues messages from pgmq, parses the payload, and routes to the appropriate sub-workflow. It runs as a Trigger.dev background job (`trigger/queue-consumer.ts`) polling pgmq on a short interval.

---

## 4. Webhook Payload Data Parsing Map

### Meta Payload Structure (Simplified)

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "<WHATSAPP_BUSINESS_ACCOUNT_ID>",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "...",
          "phone_number_id": "..."
        },
        "contacts": [{ "profile": { "name": "..." }, "wa_id": "..." }],
        "messages": [{
          "id": "<MESSAGE_ID>",
          "from": "<SENDER_PHONE>",
          "timestamp": "<EPOCH_SECONDS>",
          "type": "text | audio | image | interactive",
          ...type-specific fields...
        }]
      },
      "field": "messages"
    }]
  }]
}
```

### Extraction Targets

| Variable | JSON Path | Type | Usage |
|---|---|---|---|
| `wam_id` | `entry[0].changes[0].value.messages[0].id` | `string` | Primary idempotency key for all DB inserts |
| `client_phone` | `entry[0].changes[0].value.messages[0].from` | `string` | Look up `clients` row by `wa_phone` |
| `message_timestamp` | `entry[0].changes[0].value.messages[0].timestamp` | `string` (epoch seconds) | Convert to `Date` — use for compliance window calculation, **not** `Date.now()` |
| `payload_type` | `entry[0].changes[0].value.messages[0].type` | `string` | Branch routing logic |

### Why `message_timestamp` Over Server Clock

Clients in gyms frequently have poor connectivity. A client may tap "Send" on their food log at 1:00 PM, but the message only reaches Meta's servers at 1:04 PM due to network delay, and reaches your webhook at 1:04:03 PM. Using `Date.now()` in your consumer would log the meal at 1:04 PM instead of the actual 1:00 PM eating time. This corrupts compliance windows and adherence calculations. Always parse `messages[0].timestamp` (Unix epoch in seconds, convert with `new Date(parseInt(timestamp) * 1000)`).

### Payload Type Routing

#### `text`

```
messages[0].type === "text"
body = messages[0].text.body   // The raw string the client typed
```

Route to: `fortressCoach` agent for intent parsing (meal log / vitals / general chat / injury flag).

#### `audio`

```
messages[0].type === "audio"
media_id = messages[0].audio.id     // Temporary Meta media ID
mime_type = "audio/ogg; codecs=opus"
```

Route to: `voice-note.workflow.ts`. Media must be downloaded via the two-step pipeline (Section 5) before transcription. Voice note files are `.ogg` with Opus codec.

#### `image`

```
messages[0].type === "image"
media_id = messages[0].image.id     // Temporary Meta media ID
caption  = messages[0].image.caption  // Optional — may contain user text (e.g. "aaj ka lunch")
```

Route to: image classifier to determine intent — food log proof-of-plate vs. UPI payment screenshot. Run Gemini Vision on the downloaded binary to classify and extract data.

#### `interactive`

```
messages[0].type === "interactive"
interactive_type = messages[0].interactive.type   // "button_reply" or "list_reply"

// For button_reply (Quick Reply buttons):
button_id    = messages[0].interactive.button_reply.id
button_title = messages[0].interactive.button_reply.title

// For list_reply (WhatsApp List messages):
list_id    = messages[0].interactive.list_reply.id
list_title = messages[0].interactive.list_reply.title
```

Route to: `post-meal-poll.workflow.ts`. The `button_id` encodes the poll option — set this as a structured string on send (e.g. `"poll_meal_SAME"`, `"poll_meal_MORE"`, `"poll_meal_LESS"`, `"poll_meal_OTHER"`) for deterministic parsing on receipt.

### Status Update Filtering

Meta also sends non-message events (delivery receipts, read receipts) on the same webhook. These do **not** have a `messages` array — they appear under `statuses`. The consumer must check for the presence of `messages[0]` before processing and silently discard `statuses`-only payloads.

```typescript
const messages = payload?.entry?.[0]?.changes?.[0]?.value?.messages;
if (!messages || messages.length === 0) {
  // Status update or other non-message event — discard silently
  return;
}
```

---

## 5. Meta Media Download Binary Pipeline

Meta does **not** attach binary file data to webhook payloads. Instead it provides a temporary `media_id` string. The consumer worker must execute a two-step authenticated download sequence to retrieve the file.

### Step A — Resolve Media URL

```
GET https://graph.facebook.com/v20.0/{media_id}
Headers:
  Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
```

**Response:**

```json
{
  "url": "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=...",
  "mime_type": "audio/ogg; codecs=opus",
  "sha256": "<file_hash>",
  "file_size": 12345,
  "id": "<media_id>"
}
```

Extract the `url` field. This URL is temporary — it expires in approximately 5 minutes. The download must happen immediately in the same consumer job execution.

### Step B — Download Binary Stream

```
GET {url_from_step_a}
Headers:
  Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
```

The response body is the raw binary file. Stream it directly into Supabase Storage — do not buffer the entire file in memory, especially for large audio or image files.

### Supabase Storage Routing

| Media Type | MIME Type | Storage Bucket | Path Pattern |
|---|---|---|---|
| Voice note (successful) | `audio/ogg` | *(transcribe inline, do not persist)* | — |
| Voice note (failed transcription) | `audio/ogg` | `failed-voice-notes` | `{trainer_id}/{client_id}/{wam_id}.ogg` |
| Food log image (proof of plate) | `image/jpeg` or `image/png` | `proof-of-plate` | `{trainer_id}/{client_id}/{date}/{wam_id}.jpg` |
| UPI payment screenshot | `image/jpeg` or `image/png` | `payment-screenshots` | `{trainer_id}/{wam_id}.jpg` |

### Implementation (`src/lib/whatsapp/media.ts`)

```typescript
export async function downloadMediaToStorage(
  mediaId: string,
  bucket: string,
  storagePath: string
): Promise<string> {
  // Step A: Resolve URL
  const metaRes = await fetch(
    `https://graph.facebook.com/v20.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } }
  );
  const { url } = await metaRes.json();

  // Step B: Download binary
  const fileRes = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
  });
  const fileBuffer = Buffer.from(await fileRes.arrayBuffer());

  // Upload to Supabase Storage
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, { upsert: false });

  if (error) throw error;
  return storagePath;
}
```

### SHA256 Integrity Check (Optional but Recommended)

Meta provides a `sha256` hash of the file in the Step A response. After downloading, compute the SHA256 of the file buffer and compare against Meta's value to detect corrupted downloads before writing to storage.

---

## 6. Meta 24-Hour Service Window Geometry

### Background

WhatsApp Business API pricing distinguishes between two message categories:

| Category | Cost | Condition |
|---|---|---|
| **Free-form messages** | $0.00 | Sent within 24 hours of the client's last inbound message |
| **Template messages** | Paid (Meta Utility rate) | Required when the 24-hour window has lapsed |

The 24-hour window resets every time the client sends any inbound message — text, audio, image, or interactive reply. The goal is to architect every outbound flow so that routine coaching messages are delivered while the window is open, and templates are only used as re-engagement triggers when clients go silent.

### Window State Evaluation

```typescript
// src/lib/whatsapp/window.ts

export function isWindowOpen(lastClientMessageAt: Date | null): boolean {
  if (!lastClientMessageAt) return false;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  return Date.now() - lastClientMessageAt.getTime() < TWENTY_FOUR_HOURS_MS;
}
```

### Outbound Message Routing Logic

Every function that sends a WhatsApp message must call `isWindowOpen()` and branch accordingly. This logic lives in `src/lib/whatsapp/send.ts` — no other module should call the Meta send API directly.

```
BEFORE SENDING ANY MESSAGE:
  1. Query clients.last_client_message_at for this client
  2. IF isWindowOpen(last_client_message_at):
       → sendFreeMessage(phoneNumber, textContent)
         Uses: POST https://graph.facebook.com/v20.0/{phone_number_id}/messages
         Body: { type: "text", text: { body: textContent } }
         Cost: $0.00
  3. ELSE (window is CLOSED):
       → sendTemplateMessage(phoneNumber, templateId, templateParams)
         Uses: POST https://graph.facebook.com/v20.0/{phone_number_id}/messages
         Body: { type: "template", template: { name: templateId, ... } }
         Cost: Paid Meta Utility rate
         Effect: Client receives the template; if they reply, window reopens
```

### Window Clock Update Rule

`clients.last_client_message_at` must be updated **every time** the consumer processes an inbound message from the client — regardless of message type (text, audio, image, interactive). This update must happen atomically with message processing, not deferred.

```typescript
await supabase
  .from('clients')
  .update({ last_client_message_at: new Date(parseInt(message_timestamp) * 1000) })
  .eq('wa_phone', client_phone)
  .eq('trainer_id', trainer_id);
```

Note: use `message_timestamp` (from the Meta payload — see Section 4) not `Date.now()`, for the same accuracy reasons described in Section 4.

### Template Registry

All approved template IDs and their parameter schemas are defined in `src/lib/whatsapp/templates.ts`. Template names must never be hardcoded inline — always reference the typed registry.

| Template Key | Use Case | Paid |
|---|---|---|
| `CHECK_IN_24H` | Strike 1 ghosting check-in | Yes |
| `STREAK_WARNING_48H` | Strike 2 streak warning | Yes |
| `RENEWAL_REMINDER_D28` | Day 28 soft renewal | Yes |
| `RENEWAL_FINAL_D30` | Day 30 final renewal | Yes |
| `DPDP_CONSENT` | First-contact consent gate | Yes |
| `RE_ENGAGEMENT` | Generic window-closed re-engagement | Yes |

### Cost Architecture Summary

By combining the 24-hour window check with the ghosting daemon (which freezes messaging at Strike 3), the system eliminates all outbound API spend on non-responsive clients while keeping active clients in a zero-cost free-form messaging loop.

---

## Appendix A: Environment Variables Required for This Layer

| Variable | Purpose |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification handshake token (you define this value) |
| `WHATSAPP_APP_SECRET` | HMAC-SHA256 signing secret (from Meta App Dashboard → App Secret) |
| `WHATSAPP_ACCESS_TOKEN` | Permanent system user token for all Graph API calls |
| `WHATSAPP_PHONE_NUMBER_ID` | The sending phone number ID for outbound message API calls |

---

## Appendix B: File Map for This Specification

| Spec Section | Implementation File |
|---|---|
| Section 1 + 2 | `src/app/api/webhook/whatsapp/route.ts` |
| Section 2 (HMAC util) | `src/lib/whatsapp/verify-signature.ts` |
| Section 3 (consumer entry) | `src/mastra/workflows/inbound-message.workflow.ts` |
| Section 4 (parser) | `src/lib/whatsapp/parse-payload.ts` |
| Section 5 (media download) | `src/lib/whatsapp/media.ts` |
| Section 6 (window logic) | `src/lib/whatsapp/window.ts` |
| Section 6 (send router) | `src/lib/whatsapp/send.ts` |
| Section 6 (template registry) | `src/lib/whatsapp/templates.ts` |

---

*Last updated: 2026-06-09 — Initial ingress layer technical specification. No implementation code written yet.*
