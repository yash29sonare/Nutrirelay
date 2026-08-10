/**
 * Offline webhook simulation script for local development testing.
 *
 * Usage:
 *   npx tsx scripts/simulate-webhook.ts --handshake
 *   npx tsx scripts/simulate-webhook.ts --payload
 *   bun run scripts/simulate-webhook.ts --handshake
 *
 * WHATSAPP_VERIFY_TOKEN must be set in .env.local.
 * WHATSAPP_APP_SECRET is optional — falls back to a dev constant so payloads can be
 * simulated offline. Set WHATSAPP_APP_SECRET to the same constant in .env.local so
 * the dev server's signature check accepts the simulated requests.
 */

import { createHmac } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Minimal .env.local loader (no dotenv dependency required) ─────────────────
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local')
  let raw: string
  try {
    raw = readFileSync(envPath, 'utf8')
  } catch {
    // .env.local may not exist in CI — fall through to process.env as-is
    return
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key   = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvLocal()

// ── Config ────────────────────────────────────────────────────────────────────
// When APP_SECRET is absent, fall back to this dev constant so payload simulation
// works offline. Set WHATSAPP_APP_SECRET=dev-local-secret-2026 in .env.local so the
// dev server's verifySignature() accepts the same HMAC.
const DEV_SECRET_FALLBACK = 'dev-local-secret-2026'

const BASE_URL     = `http://localhost:${process.env.PORT ?? 3000}/api/webhook/whatsapp`
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? ''
const APP_SECRET   = process.env.WHATSAPP_APP_SECRET || DEV_SECRET_FALLBACK

if (!APP_SECRET || APP_SECRET === DEV_SECRET_FALLBACK) {
  console.warn(
    '[simulate-webhook] WHATSAPP_APP_SECRET not set — using dev fallback. ' +
    'Add WHATSAPP_APP_SECRET=dev-local-secret-2026 to .env.local for HMAC to verify correctly.',
  )
}

if (!VERIFY_TOKEN) {
  console.error('[simulate-webhook] ERROR: WHATSAPP_VERIFY_TOKEN must be set in .env.local')
  process.exit(1)
}

// ── HMAC-SHA256 signature helper ──────────────────────────────────────────────
function computeSignature(body: string): string {
  return 'sha256=' + createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex')
}

// ── GET handshake simulation ──────────────────────────────────────────────────
async function simulateHandshake(): Promise<void> {
  const challenge   = 'test_challenge_' + Date.now()
  const searchParams = new URLSearchParams({
    'hub.mode':         'subscribe',
    'hub.verify_token': VERIFY_TOKEN,
    'hub.challenge':    challenge,
  })

  const url = `${BASE_URL}?${searchParams.toString()}`
  console.log(`[simulate-webhook] GET ${url}`)

  const res  = await fetch(url, { method: 'GET' })
  const body = await res.text()

  console.log(`[simulate-webhook] Response status : ${res.status}`)
  console.log(`[simulate-webhook] Response body   : ${body}`)

  if (res.status === 200 && body === challenge) {
    console.log('[simulate-webhook] ✓ Handshake successful — challenge echoed correctly')
  } else {
    console.error('[simulate-webhook] ✗ Handshake failed — expected challenge:', challenge)
    process.exit(1)
  }
}

// ── POST audio message payload simulation ─────────────────────────────────────
async function simulatePayload(): Promise<void> {
  // Meta-exact webhook payload structure for a text message
  const mockPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1234567890',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '910000000000',
                phone_number_id:      'PHONE_NUMBER_ID_PLACEHOLDER',
              },
              contacts: [
                {
                  profile: { name: 'Test Client' },
                  wa_id:   '910000000001',
                },
              ],
              messages: [
                {
                  id:        'wamid.simulate_' + Date.now(),
                  from:      '910000000001',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type:      'text',
                  text: {
                    body: 'Log an apple for breakfast',
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  }

  const bodyString = JSON.stringify(mockPayload)
  const signature  = computeSignature(bodyString)

  console.log(`[simulate-webhook] POST ${BASE_URL}`)
  console.log(`[simulate-webhook] Signature: ${signature}`)
  console.log(`[simulate-webhook] Payload wam_id: ${mockPayload.entry[0].changes[0].value.messages[0].id}`)

  const res  = await fetch(BASE_URL, {
    method:  'POST',
    headers: {
      'Content-Type':       'application/json',
      'X-Hub-Signature-256': signature,
    },
    body: bodyString,
  })

  const resBody = await res.text()

  console.log(`[simulate-webhook] Response status : ${res.status}`)
  console.log(`[simulate-webhook] Response body   : ${resBody}`)

  if (res.status === 200) {
    console.log('[simulate-webhook] ✓ Payload accepted — background processing scheduled')
  } else {
    console.error('[simulate-webhook] ✗ Unexpected status', res.status)
    process.exit(1)
  }
}

// ── Status update (delivery receipt) simulation ───────────────────────────────
async function simulateStatusUpdate(): Promise<void> {
  const mockPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1234567890',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '910000000000',
                phone_number_id:      'PHONE_NUMBER_ID_PLACEHOLDER',
              },
              statuses: [
                {
                  id:          'wamid.status_' + Date.now(),
                  status:      'delivered',
                  timestamp:   String(Math.floor(Date.now() / 1000)),
                  recipient_id: '910000000001',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  }

  const bodyString = JSON.stringify(mockPayload)
  const signature  = computeSignature(bodyString)

  console.log(`[simulate-webhook] POST ${BASE_URL} (status update / delivery receipt)`)

  const res     = await fetch(BASE_URL, {
    method:  'POST',
    headers: {
      'Content-Type':        'application/json',
      'X-Hub-Signature-256': signature,
    },
    body: bodyString,
  })
  const resBody = await res.text()

  console.log(`[simulate-webhook] Response status : ${res.status}`)
  console.log(`[simulate-webhook] Response body   : ${resBody}`)

  if (res.status === 200) {
    console.log('[simulate-webhook] ✓ Status update accepted — logged as skipped')
  } else {
    console.error('[simulate-webhook] ✗ Unexpected status', res.status)
    process.exit(1)
  }
}

// ── CLI entrypoint ─────────────────────────────────────────────────────────────
const flag = process.argv[2]

switch (flag) {
  case '--handshake':
    simulateHandshake().catch((err) => { console.error(err); process.exit(1) })
    break
  case '--payload':
    simulatePayload().catch((err) => { console.error(err); process.exit(1) })
    break
  case '--status':
    simulateStatusUpdate().catch((err) => { console.error(err); process.exit(1) })
    break
  default:
    console.log('Usage:')
    console.log('  npx tsx scripts/simulate-webhook.ts --handshake   GET verification challenge')
    console.log('  npx tsx scripts/simulate-webhook.ts --payload     POST audio message')
    console.log('  npx tsx scripts/simulate-webhook.ts --status      POST delivery receipt')
    process.exit(0)
}
