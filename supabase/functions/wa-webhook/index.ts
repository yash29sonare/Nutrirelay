import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyWebhookSignature } from './crypto.ts'

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url)

  // -----------------------------------------------------------------------
  // GET — Meta webhook verification handshake
  // -----------------------------------------------------------------------
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode')
    const token     = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (
      mode === 'subscribe' &&
      token === Deno.env.get('WHATSAPP_VERIFY_TOKEN') &&
      challenge
    ) {
      return new Response(challenge, { status: 200 })
    }

    return new Response('Forbidden', { status: 403 })
  }

  // -----------------------------------------------------------------------
  // POST — Inbound message ingress
  // -----------------------------------------------------------------------
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Read raw binary body for HMAC verification before any parsing
  const rawBytes  = new Uint8Array(await req.arrayBuffer())
  const appSecret = Deno.env.get('WHATSAPP_APP_SECRET') ?? ''
  const sigHeader = req.headers.get('x-hub-signature-256')

  const isValid = await verifyWebhookSignature(rawBytes, sigHeader, appSecret)
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Parse verified JSON payload
  let body: unknown
  try {
    body = JSON.parse(new TextDecoder().decode(rawBytes))
  } catch {
    return new Response('OK', { status: 200 })
  }

  // Deep defensive array traversal — Meta's payload structure
  const entry   = (body as any)?.entry?.[0]
  const changes = entry?.changes?.[0]
  const value   = changes?.value
  const msg     = value?.messages?.[0]

  // Status/delivery receipts have no messages array — ack and exit
  if (!msg) {
    return new Response('OK', { status: 200 })
  }

  const wam_id           = msg.id          as string
  const client_phone     = msg.from         as string
  const message_timestamp = Number(msg.timestamp)
  const message_type     = (msg.type ?? 'unknown') as string

  // Extract text and media based on message type
  let message_text:   string | null = null
  let media_id:       string | null = null
  let button_reply_id: string | null = null

  switch (msg.type) {
    case 'text':
      message_text = msg.text?.body ?? null
      break
    case 'audio':
      media_id = msg.audio?.id ?? null
      break
    case 'image':
      media_id = msg.image?.id ?? null
      message_text = msg.image?.caption ?? null
      break
    case 'interactive':
      button_reply_id = msg.interactive?.button_reply?.id ?? null
      message_text    = msg.interactive?.button_reply?.title ?? null
      break
  }

  // Enqueue verified payload via PostgREST pgmq_public RPC abstraction
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')         ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const queuePayload = {
    wam_id,
    client_phone,
    message_timestamp,
    message_type,
    message_text,
    media_id,
    button_reply_id,
    raw_entry: entry,
  }

  const { error } = await supabase
    .schema('pgmq_public')
    .rpc('send', {
      queue_name: 'whatsapp_incoming_queue',
      message:    queuePayload,
    })

  if (error) {
    console.error('[wa-webhook] pgmq enqueue error:', error.message)
    // Still return 200 to Meta — logging the error internally
    // Returning non-200 would cause Meta to retry and flood the queue
  }

  // Sub-second acknowledgement to Meta — must be < 200ms total
  return new Response('OK', { status: 200 })
})
