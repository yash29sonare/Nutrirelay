// Subset of Meta webhook payload shapes used by the ingress pipeline

export interface WhatsAppTextMessage {
  type: 'text'
  whatsapp_message_id: string
  from: string          // client phone number e.g. "919876543210"
  timestamp: number
  text: string
}

export interface WhatsAppAudioMessage {
  type: 'audio'
  whatsapp_message_id: string
  from: string
  timestamp: number
  media_id: string      // Meta CDN media object ID for .ogg download
}

export interface WhatsAppImageMessage {
  type: 'image'
  whatsapp_message_id: string
  from: string
  timestamp: number
  media_id: string
  caption?: string
}

export interface WhatsAppInteractiveReply {
  type: 'interactive'
  whatsapp_message_id: string
  from: string
  timestamp: number
  button_reply_id: string
  button_reply_title: string
}

export type ParsedWhatsAppMessage =
  | WhatsAppTextMessage
  | WhatsAppAudioMessage
  | WhatsAppImageMessage
  | WhatsAppInteractiveReply

/**
 * Handles the Meta webhook verification GET handshake.
 * Compares hub.verify_token against process.env.WHATSAPP_VERIFY_TOKEN.
 * Returns the hub.challenge string on success, null on failure.
 */
export function handleVerificationChallenge(
  searchParams: URLSearchParams,
): string | null {
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (
    mode === 'subscribe' &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return challenge
  }
  return null
}

/**
 * Parses a raw Meta webhook POST body into a typed message shape.
 * Returns null if the payload does not contain a recognisable message.
 */
export function parseInboundMessage(body: unknown): ParsedWhatsAppMessage | null {
  try {
    const entry   = (body as any)?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value   = changes?.value
    const msg     = value?.messages?.[0]

    if (!msg) return null

    const base = {
      whatsapp_message_id: msg.id as string,
      from:                msg.from as string,
      timestamp:           Number(msg.timestamp),
    }

    switch (msg.type) {
      case 'text':
        return { ...base, type: 'text', text: msg.text?.body ?? '' }

      case 'audio':
        return { ...base, type: 'audio', media_id: msg.audio?.id ?? '' }

      case 'image':
        return {
          ...base,
          type:     'image',
          media_id: msg.image?.id ?? '',
          caption:  msg.image?.caption,
        }

      case 'interactive': {
        const reply = msg.interactive?.button_reply
        return {
          ...base,
          type:                'interactive',
          button_reply_id:     reply?.id ?? '',
          button_reply_title:  reply?.title ?? '',
        }
      }

      default:
        return null
    }
  } catch {
    return null
  }
}
