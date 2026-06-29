import { createWorkflow, createStep } from '@mastra/core/workflows'
import { runAI } from '@/ai/aiGateway'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  whatsappMessageId: z.string(),
  senderId:          z.string(),
  selectionKey:      z.string(),
  customInputText:   z.string().optional(),
})

// Shared state schema for Steps 2–5 — identical shape required by spec
const pollStateSchema = z.object({
  whatsappMessageId: z.string(),
  senderId:          z.string(),
  selectionKey:      z.string(),
  customInputText:   z.string().optional(),
  isDuplicate:       z.boolean(),
  skipRemaining:     z.boolean(),
  triggerExtraction: z.boolean(),
  meal_description:  z.string(),
  protein:           z.number(),
  carbohydrates:     z.number(),
  fat:               z.number(),
  calories:          z.number(),
})

// Step 1 output — extends input with isDuplicate
const hydrateOutputSchema = z.object({
  whatsappMessageId: z.string(),
  senderId:          z.string(),
  selectionKey:      z.string(),
  customInputText:   z.string().optional(),
  isDuplicate:       z.boolean(),
})

type HydrateOutput = z.infer<typeof hydrateOutputSchema>
type PollState     = z.infer<typeof pollStateSchema>

// ── Baseline Indian dietary macro presets ─────────────────────────────────────
const INDIAN_PRESETS: Record<string, { meal_description: string; protein: number; carbohydrates: number; fat: number; calories: number }> = {
  POLL_OPTION_A: { meal_description: 'Dal + 2 Roti',   protein: 12, carbohydrates: 45, fat: 6,  calories: 280 },
  POLL_OPTION_B: { meal_description: 'Paneer Sabzi + Rice', protein: 18, carbohydrates: 55, fat: 12, calories: 400 },
  POLL_OPTION_C: { meal_description: 'Curd Rice',       protein: 8,  carbohydrates: 50, fat: 5,  calories: 270 },
  POLL_OPTION_D: { meal_description: 'Chicken + Salad', protein: 30, carbohydrates: 10, fat: 8,  calories: 230 },
}
const SKIP_STATE = { skipRemaining: true, triggerExtraction: false, isDuplicate: true, meal_description: '', protein: 0, carbohydrates: 0, fat: 0, calories: 0 }

// ── Step 1: Concurrency lock & metadata hydration ─────────────────────────────

const hydratePollMetadataStep = createStep({
  id:           'hydratePollMetadataStep',
  description:  'Atomic status transition pending→processing; deduplication guard.',
  inputSchema,
  outputSchema: hydrateOutputSchema,
  execute: async ({ inputData }): Promise<HydrateOutput> => {
    const db  = getDb()
    const { whatsappMessageId, senderId, selectionKey, customInputText } = inputData

    // Atomic claim — only succeeds if status is still 'pending'
    const { data } = await db
      .from('incoming_webhook_logs')
      .update({ status: 'processing', processed_at: new Date().toISOString() })
      .eq('wam_id', whatsappMessageId)
      .eq('status', 'pending')
      .select('wam_id')

    const claimed = Array.isArray(data) && data.length > 0

    return {
      whatsappMessageId,
      senderId,
      selectionKey,
      customInputText,
      isDuplicate: !claimed,
    }
  },
})

// ── Step 2: Selection classification & macro resolution ───────────────────────

const parseSelectionStep = createStep({
  id:           'parseSelectionStep',
  description:  'Routes standard poll selections to preset macros or flags custom-text extraction.',
  inputSchema:  hydrateOutputSchema,
  outputSchema: pollStateSchema,
  execute: async ({ inputData }): Promise<PollState> => {
    const base = {
      whatsappMessageId: inputData.whatsappMessageId,
      senderId:          inputData.senderId,
      selectionKey:      inputData.selectionKey,
      customInputText:   inputData.customInputText,
    }

    if (inputData.isDuplicate) {
      return { ...base, ...SKIP_STATE }
    }

    const key = inputData.selectionKey.toUpperCase()

    if (key === 'POLL_OPTION_SOMETHING_ELSE' || key === 'SOMETHING_ELSE') {
      return {
        ...base,
        isDuplicate:       false,
        skipRemaining:     false,
        triggerExtraction: true,
        meal_description:  '',
        protein:           0,
        carbohydrates:     0,
        fat:               0,
        calories:          0,
      }
    }

    const preset = INDIAN_PRESETS[key]
    if (preset) {
      return {
        ...base,
        isDuplicate:       false,
        skipRemaining:     false,
        triggerExtraction: false,
        ...preset,
      }
    }

    // Unknown key — default to first preset rather than throwing
    return {
      ...base,
      isDuplicate:       false,
      skipRemaining:     false,
      triggerExtraction: false,
      ...INDIAN_PRESETS['POLL_OPTION_A'],
    }
  },
})

// ── Step 3: Hinglish text extraction via Gemini ───────────────────────────────

const extractCustomMealStep = createStep({
  id:           'extractCustomMealStep',
  description:  'Parses Hinglish freeform meal text into structured macro data.',
  inputSchema:  pollStateSchema,
  outputSchema: pollStateSchema,
  execute: async ({ inputData }): Promise<PollState> => {
    if (inputData.skipRemaining || !inputData.triggerExtraction) {
      return inputData
    }

    const text = inputData.customInputText?.trim()
    if (!text) {
      return {
        ...inputData,
        meal_description: 'Custom Meal Request',
        protein:          10,
        carbohydrates:    30,
        fat:              5,
        calories:         200,
      }
    }

    try {
      // AI-GATEWAY-ENFORCED
      const { text: raw } = await runAI({
        system: 'You are a nutritional data extraction engine. Parse Hinglish (Hindi-English code-switched) food descriptions into macros. Return only valid JSON.',
        prompt: `Parse this Hinglish meal description and return JSON:
"${text}"

Return exactly:
{"meal_description":"<English summary>","protein":<grams>,"carbohydrates":<grams>,"fat":<grams>,"calories":<kcal>}
If amounts are unclear, use typical Indian serving estimates.`,
        feature: 'meal-logging',
        workflow: 'postMealPollWorkflow',
      })

      const clean  = (raw ?? '').replace(/```json|```/g, '').trim()
      const parsed = z.object({
        meal_description: z.string(),
        protein:          z.number(),
        carbohydrates:    z.number(),
        fat:              z.number(),
        calories:         z.number(),
      }).parse(JSON.parse(clean))

      return { ...inputData, ...parsed }
    } catch (err) {
      console.error('[poll/extract] Gemini parse failed:', (err as Error).message)
      return {
        ...inputData,
        meal_description: text.slice(0, 100),
        protein:          10,
        carbohydrates:    30,
        fat:              5,
        calories:         200,
      }
    }
  },
})

// ── Step 4: Food log persistence & strike purge ───────────────────────────────

const persistFoodLogStep = createStep({
  id:           'persistFoodLogStep',
  description:  'Writes food_logs row and clears strike_log for the client.',
  inputSchema:  pollStateSchema,
  outputSchema: pollStateSchema,
  execute: async ({ inputData }): Promise<PollState> => {
    if (inputData.skipRemaining || inputData.isDuplicate) return inputData

    const db = getDb()

    // Resolve clientId from senderId (phone number)
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('phone_number', inputData.senderId)
      .limit(1)
      .single()

    const clientId = (profile as { id: string } | null)?.id
    if (!clientId) {
      console.error('[poll/persist] no profile for senderId', inputData.senderId)
      return inputData
    }

    // Resolve trainerId via trainer_clients
    const { data: tc } = await db
      .from('trainer_clients')
      .select('trainer_id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .limit(1)
      .single()

    const trainerId = (tc as { trainer_id: string } | null)?.trainer_id
    if (!trainerId) {
      console.error('[poll/persist] no active trainer for client', clientId)
      return inputData
    }

    try {
      await db.from('food_logs').insert({
        client_id:           clientId,
        trainer_id:          trainerId,
        wam_id:              inputData.whatsappMessageId,
        notes:               inputData.meal_description,
        verification_status: 'UNVERIFIED',
        logged_at:           new Date().toISOString(),
        calories:            inputData.calories,
        protein_g:           inputData.protein,
        carbs_g:             inputData.carbohydrates,
        fat_g:               inputData.fat,
      })

      // Reset ghost lock — delete open strike_log entries for this client
      await db.from('strike_log').delete().eq('profile_id', clientId)
    } catch (err) {
      console.error('[poll/persist] transaction failed:', (err as Error).message)
      // Mark webhook as failed to prevent processing limbo
      await db
        .from('incoming_webhook_logs')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('wam_id', inputData.whatsappMessageId)
      throw err
    }

    return inputData
  },
})

// ── Step 5: Poll state finalization ───────────────────────────────────────────

const updatePollStateStep = createStep({
  id:           'updatePollStateStep',
  description:  'Transitions incoming_webhook_logs to completed.',
  inputSchema:  pollStateSchema,
  outputSchema: pollStateSchema,
  execute: async ({ inputData }): Promise<PollState> => {
    if (inputData.skipRemaining || inputData.isDuplicate) return inputData

    const db = getDb()
    await db
      .from('incoming_webhook_logs')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('wam_id', inputData.whatsappMessageId)

    return inputData
  },
})

// ── Workflow assembly ──────────────────────────────────────────────────────────

export const postMealPollWorkflow = createWorkflow({
  id:           'postMealPollWorkflow',
  inputSchema,
  outputSchema: pollStateSchema,
})
  .then(hydratePollMetadataStep as any)
  .then(parseSelectionStep      as any)
  .then(extractCustomMealStep   as any)
  .then(persistFoodLogStep      as any)
  .then(updatePollStateStep     as any)
  .commit()
