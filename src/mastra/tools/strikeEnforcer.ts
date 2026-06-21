import { createTool } from '@mastra/core/tools'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const strikeEnforcer = createTool({
  id:          'strike-enforcer',
  description: 'Logs user compliance tracking behaviors by incrementing the strike count for a given user ID.',
  inputSchema: z.object({
    userId: z.string().describe('Target user database identifier key'),
  }),
  outputSchema: z.object({
    successfullyLogged:  z.boolean(),
    updatedStrikeCount:  z.number(),
  }),
  execute: async ({ context }: any) => {
    const { userId } = context as { userId: string }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } },
    )

    try {
      // Count existing strikes for this user
      const { data: existing } = await db
        .from('strike_log')
        .select('id')
        .eq('profile_id', userId) as any

      const currentCount: number = Array.isArray(existing) ? existing.length : 0

      // Insert new strike entry
      const { error } = await db.from('strike_log').insert({
        profile_id: userId,
        reason:     'Compliance strike logged by strike-enforcer tool',
      }) as any

      if (error) {
        console.error('[strike-enforcer] insert error:', (error as any).message)
        return { successfullyLogged: false, updatedStrikeCount: currentCount }
      }

      return { successfullyLogged: true, updatedStrikeCount: currentCount + 1 }
    } catch (err) {
      console.error('[strike-enforcer] unexpected error:', (err as Error).message)
      return { successfullyLogged: false, updatedStrikeCount: 0 }
    }
  },
})
