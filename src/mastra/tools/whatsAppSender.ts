import { createTool } from '@mastra/core/tools'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getTrainerWaba } from '@/lib/waba/getTrainerWaba'
import { logCommunication } from '@/lib/communication-logger'
import type { ToolExecutionContext } from '@mastra/core/tools'

async function resolveTrainerId(clientId: string): Promise<string | null> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data } = await db
    .from('trainer_clients')
    .select('trainer_id')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .limit(1)
    .single()
  return (data as { trainer_id: string } | null)?.trainer_id ?? null
}

export const sendWhatsApp = createTool({
  id: 'sendWhatsApp',
  description: 'Sends a free-form text message to a WhatsApp phone number via the trainer\'s own WABA credentials.',
  inputSchema: z.object({
    clientId: z.string().describe('The client UUID — used to resolve the owning trainer\'s WABA credentials'),
    recipientPhone: z.string(),
    messageText: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    wamid: z.string().optional(),
  }),
  execute: async (
    inputData: {
      clientId: string
      recipientPhone: string
      messageText: string
    },
    context: ToolExecutionContext<any, any, any>,
  ) => {
    const { clientId, recipientPhone, messageText } = inputData

    const trainerId = await resolveTrainerId(clientId)
    if (!trainerId) {
      console.error('[sendWhatsApp] could not resolve trainer_id for client', clientId)
      return { success: false }
    }

    const { phoneNumberId, accessToken } = await getTrainerWaba(trainerId)

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: { body: messageText, preview_url: false },
    }

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch (err) {
      console.error('[sendWhatsApp] fetch error:', (err as Error).message)
      return { success: false }
    }

    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const errBody = await res.json()
        const safeDetail = (errBody as { error?: { code?: number; message?: string } })?.error
        detail = safeDetail ? `code=${safeDetail.code} msg=${safeDetail.message}` : detail
      } catch {
        // use status string only
      }
      console.error('[sendWhatsApp] Meta API error:', detail)
      return { success: false }
    }

    const json = (await res.json()) as { messages?: Array<{ id: string }> }
    const wamid = json.messages?.[0]?.id

    await logCommunication({
      trainer_id: trainerId,
      client_id: clientId,
      direction: "OUTBOUND",
      message_type: "TEXT",
      wam_id: wamid,
      delivery_status: "sent",
      metadata: { tool: "sendWhatsApp" },
    })

    return {
      success: true,
      wamid,
    }
  },
})
