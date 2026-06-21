import { getTrainerWaba } from "@/lib/waba/getTrainerWaba";

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

    return true
  } catch (err) {
    console.error('[whatsappOutbound] fetch failed:', (err as Error).message)
    return false
  }
}
