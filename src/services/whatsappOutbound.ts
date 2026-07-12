import { getTrainerWaba } from "@/lib/waba/getTrainerWaba";
import { logCommunication } from "@/lib/communication-logger";
import { getWhatsAppServiceDb, normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db";

export async function sendWhatsAppTextMessage(
  trainerId: string,
  to:        string,
  text:      string,
): Promise<boolean> {
  const { phoneNumberId: phoneId, accessToken: token } = await getTrainerWaba(trainerId)

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type:              'text',
    text:              { body: text },
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    )

    if (!res.ok) {
      const errBody = await res.text()
      console.error(`[whatsappOutbound] Meta API error ${res.status}:`, errBody)
      return false
    }

    const json = (await res.json()) as { messages?: Array<{ id?: string }> }
    const wamid = json.messages?.[0]?.id ?? null
    const clientPhone = normalizeWhatsAppPhone(to)

    if (clientPhone) {
      const db = getWhatsAppServiceDb()
      const { data: profile } = await db
        .from("profiles")
        .select("id")
        .eq("phone_number", clientPhone)
        .limit(1)
        .maybeSingle()

      const clientId = (profile as { id: string } | null)?.id ?? null
      if (clientId) {
        await logCommunication({
          trainer_id: trainerId,
          client_id: clientId,
          direction: "OUTBOUND",
          message_type: "TEXT",
          wam_id: wamid,
          delivery_status: "sent",
          metadata: { source: "whatsappPipeline", message_preview: text.slice(0, 280) },
        })
      }
    }

    return true
  } catch (err) {
    console.error('[whatsappOutbound] fetch failed:', (err as Error).message)
    return false
  }
}
