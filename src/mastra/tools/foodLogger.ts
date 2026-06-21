import { createTool } from '@mastra/core/tools'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Untyped client — food_logs insert does not go through the generated schema here
// because trainer_id resolution requires a secondary lookup
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const logFood = createTool({
  id:          'logFood',
  description: 'Persists a structured meal log entry to the food_logs table for the given client.',
  inputSchema: z.object({
    client_id: z.string(),
    notes:     z.string(),
    calories:  z.number(),
    protein_g: z.number(),
    carbs_g:   z.number(),
    fat_g:     z.number(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    logId:   z.string().optional(),
  }),
  execute: async ({ client_id, notes, calories, protein_g, carbs_g, fat_g }) => {
    const db = getDb()

    // Resolve trainer_id via trainer_clients join
    const { data: tc } = await db
      .from('trainer_clients')
      .select('trainer_id')
      .eq('client_id', client_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    const trainerId = (tc as { trainer_id: string } | null)?.trainer_id
    if (!trainerId) {
      console.error('[logFood] no active trainer for client', client_id)
      return { success: false }
    }

    try {
      const { data, error } = await db
        .from('food_logs')
        .insert({
          client_id:           client_id,
          trainer_id:          trainerId,
          wam_id:              `agent-${randomUUID()}`,
          notes:               notes,
          verification_status: 'UNVERIFIED',
          logged_at:           new Date().toISOString(),
          calories:            calories,
          protein_g:           protein_g,
          carbs_g:             carbs_g,
          fat_g:               fat_g,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[logFood] insert error:', error.message)
        return { success: false }
      }

      return { success: true, logId: (data as { id: string }).id }
    } catch (err) {
      console.error('[logFood] unexpected error:', (err as Error).message)
      return { success: false }
    }
  },
})
