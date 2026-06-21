import { createTool } from '@mastra/core/tools'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const subscriptionVerifier = createTool({
  id:          'subscription-verifier',
  description: 'Maps real-time user subscription status levels using an incoming phone number. Returns active state and tier type.',
  inputSchema: z.object({
    phoneNumber: z.string().describe('Clean phone string identifier representing incoming user'),
  }),
  outputSchema: z.object({
    isActive: z.boolean(),
    tier:     z.enum(['free', 'premium', 'expired']),
  }),
  execute: async ({ context }: any) => {
    const { phoneNumber } = context as { phoneNumber: string }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } },
    )

    try {
      const last10 = phoneNumber.replace(/\D/g, '').slice(-10)

      const { data: profile } = await db
        .from('profiles')
        .select('id')
        .ilike('phone_number', `%${last10}`)
        .limit(1)
        .single()

      const clientId = (profile as any)?.id
      if (!clientId) return { isActive: false, tier: 'expired' as const }

      const { data: sub } = await db
        .from('subscriptions')
        .select('status, tier_type, end_date')
        .eq('client_id', clientId)
        .neq('status', 'canceled')
        .limit(1)
        .single()

      if (!sub) return { isActive: false, tier: 'expired' as const }

      const row = sub as any
      const isExpired = row.end_date ? new Date(row.end_date) < new Date() : false

      if (row.status === 'canceled' || isExpired) {
        return { isActive: false, tier: 'expired' as const }
      }

      const tier =
        typeof row.tier_type === 'string' && row.tier_type.toLowerCase() === 'premium'
          ? ('premium' as const)
          : ('free' as const)

      return { isActive: true, tier }
    } catch {
      return { isActive: false, tier: 'expired' as const }
    }
  },
})
