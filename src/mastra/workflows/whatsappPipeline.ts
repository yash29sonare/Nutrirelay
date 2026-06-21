import { createWorkflow, createStep } from '@mastra/core/workflows'
import { generateText } from 'ai'
import { z } from 'zod'
import { Pool } from 'pg'
import { geminiModels } from '../config'
import { downloadAndStoreWhatsAppMedia } from '../../services/whatsappMedia'
import { sendWhatsAppTextMessage } from '../../services/whatsappOutbound'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export interface WhatsAppPipelinePayload {
  wam_id:            string
  client_phone:      string
  trainer_id:        string
  message_timestamp: number
  message_type:      'text' | 'audio' | 'image' | 'interactive' | 'unknown'
  raw_body:          string
}

const messageTypeEnum = z.enum(['text', 'audio', 'image', 'interactive', 'unknown'])

const intentEnum = z.enum([
  'meal_log', 'workout_log', 'payment_screenshot',
  'voice_note', 'poll_response', 'unknown', 'skipped',
])

// Shared flat schema propagated across all sequential steps
const pipelineSchema = z.object({
  wam_id:               z.string(),
  client_phone:         z.string(),
  trainer_id:           z.string(),
  message_timestamp:    z.number(),
  message_type:         messageTypeEnum,
  raw_body:             z.string(),
  isDuplicate:          z.boolean().optional(),
  isSubscriptionActive: z.boolean().optional(),
  clientId:             z.string().nullable().optional(),
  tierType:             z.string().nullable().optional(),
  shouldProcess:        z.boolean().optional(),
  skipReason:           z.string().nullable().optional(),
  intent:               intentEnum.optional(),
  extractedContent:     z.string().nullable().optional(),
  mediaUrl:             z.string().nullable().optional(),
  food_name:            z.string().nullable().optional(),
  estimated_calories:   z.coerce.number().nullable().optional(),
  protein_g:            z.coerce.number().nullable().optional(),
  carbs_g:              z.coerce.number().nullable().optional(),
  fat_g:                z.coerce.number().nullable().optional(),
  serving_size:         z.string().nullable().optional(),
  success:              z.boolean().optional(),
  logId:                z.string().nullable().optional(),
})

type PipelineState = z.infer<typeof pipelineSchema>

// Schema for branch step outputs — keyed by step id
const branchOutputSchema = z.object({}).passthrough()

// ─── Step 1: Idempotency guard ────────────────────────────────────────────────

const validateWebhookStep = createStep({
  id:           'validateWebhook',
  description:  'Checks food_logs for an existing wam_id to prevent duplicate processing.',
  inputSchema:  pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    const existing = await pool.query(
      'SELECT id FROM public.food_logs WHERE wam_id = $1 LIMIT 1',
      [inputData.wam_id],
    )
    return { ...inputData, isDuplicate: existing.rows.length > 0 }
  },
})

// ─── Step 2: Subscription gate ───────────────────────────────────────────────

const subscriptionCheckStep = createStep({
  id:           'subscriptionCheck',
  description:  'Confirms the client has an active subscription before processing.',
  inputSchema:  pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (inputData.isDuplicate) {
      return { ...inputData, isSubscriptionActive: false, clientId: null, tierType: null }
    }

    const result = await pool.query<{
      client_id: string; status: string; tier_type: string; end_date: string | null
    }>(
      `SELECT s.client_id, s.status, s.tier_type, s.end_date
       FROM public.subscriptions s
       INNER JOIN public.profiles p ON p.id = s.client_id
       INNER JOIN public.trainer_clients tc ON tc.client_id = s.client_id
       WHERE p.phone_number = $1 AND tc.trainer_id = $2 AND tc.is_active = true
       LIMIT 1`,
      [inputData.client_phone, inputData.trainer_id],
    )

    if (result.rows.length === 0) {
      return { ...inputData, isSubscriptionActive: false, clientId: null, tierType: null }
    }

    const row = result.rows[0]
    const isExpired = row.end_date ? new Date(row.end_date) < new Date() : false

    return {
      ...inputData,
      isSubscriptionActive: row.status !== 'canceled' && !isExpired,
      clientId:             row.client_id,
      tierType:             row.tier_type,
    }
  },
})

// ─── Step 3: Intent classification ───────────────────────────────────────────

const multimodalIngestionStep = createStep({
  id:           'multimodalIngestion',
  description:  'Classifies message type and gates further processing.',
  inputSchema:  pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (inputData.isDuplicate) {
      return { ...inputData, shouldProcess: false, skipReason: 'duplicate_wam_id', intent: 'skipped', extractedContent: null }
    }

    if (!inputData.isSubscriptionActive || !inputData.clientId) {
      return { ...inputData, shouldProcess: false, skipReason: 'subscription_inactive_or_client_not_found', intent: 'skipped', extractedContent: null }
    }

    const intentMap: Record<string, PipelineState['intent']> = {
      audio:       'voice_note',
      image:       'payment_screenshot',
      interactive: 'poll_response',
      text:        'meal_log',
    }

    return {
      ...inputData,
      shouldProcess:    true,
      skipReason:       null,
      intent:           intentMap[inputData.message_type] ?? 'unknown',
      extractedContent: inputData.raw_body,
    }
  },
})

// ─── Branch Step A: Audio transcription via Gemini ───────────────────────────

const audioExtractionStep = createStep({
  id:           'audioExtractionStep',
  description:  'Downloads audio from Meta CDN and transcribes via Gemini multimodal.',
  inputSchema:  pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess) return inputData

    let transcript: string | null = null

    try {
      const rawBody = JSON.parse(inputData.raw_body) as { media_id?: string }
      const mediaId = rawBody.media_id

      if (!mediaId) throw new Error('No media_id in raw_body for audio message')

      const { publicUrl, mimeType } = await downloadAndStoreWhatsAppMedia(mediaId, inputData.wam_id)

      // Fetch stored binary for inline Gemini multimodal call
      const mediaBuffer = await fetch(publicUrl).then((r) => r.arrayBuffer())

      const { text } = await generateText({
        model: geminiModels.primary,
        messages: [
          {
            role:    'user',
            content: [
              {
                type:      'file',
                data:      mediaBuffer,
                mediaType: mimeType as `audio/${string}`,
              },
              {
                type: 'text',
                text: 'Transcribe this audio message exactly as spoken. Return only the raw transcript text with no formatting.',
              },
            ],
          },
        ],
      })

      transcript = text ?? null
    } catch (err) {
      console.error('[audioExtractionStep] transcription failed for wam_id', inputData.wam_id, (err as Error).message)
      transcript = null
    }

    return {
      ...inputData,
      extractedContent: transcript ?? '[audio_transcription_failed]',
      intent:           transcript ? 'meal_log' : 'voice_note',
    }
  },
})

// ─── Branch Step B: Vision / OCR via Gemini ──────────────────────────────────

const imageExtractionStep = createStep({
  id:           'imageExtractionStep',
  description:  'Downloads image from Meta CDN and runs Gemini Vision for food macro extraction.',
  inputSchema:  pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess) return inputData

    let visionResult: string | null = null
    let publicUrl: string | null = null

    try {
      const rawBody = JSON.parse(inputData.raw_body) as { media_id?: string }
      const mediaId = rawBody.media_id

      if (!mediaId) throw new Error('No media_id in raw_body for image message')

      const stored = await downloadAndStoreWhatsAppMedia(mediaId, inputData.wam_id)
      publicUrl = stored.publicUrl

      const { text } = await generateText({
        model: geminiModels.primary,
        messages: [
          {
            role:    'user',
            content: [
              {
                type:  'image',
                image: publicUrl,
              },
              {
                type: 'text',
                text: `Analyze this food image and return a JSON object with these exact fields:
{
  "food_name": "brief description of the meal",
  "estimated_calories": <number>,
  "protein_g": <number>,
  "carbs_g": <number>,
  "fat_g": <number>,
  "serving_size": "estimated portion size"
}
If this is not a food image, return {"food_name":"not_food","estimated_calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"serving_size":"N/A"}.
Return only the JSON object. No explanation.`,
              },
            ],
          },
        ],
      })

      visionResult = text ?? null
    } catch (err) {
      console.error('[imageExtractionStep] vision failed for wam_id', inputData.wam_id, (err as Error).message)
      visionResult = null
    }

    return {
      ...inputData,
      extractedContent: visionResult ?? '[image_analysis_failed]',
      mediaUrl:         publicUrl,
      intent:           'meal_log',
    }
  },
})

// ─── Branch Step C: Text / interactive pass-through ──────────────────────────

const textExtractionStep = createStep({
  id:           'textExtractionStep',
  description:  'Passes text or poll response through for downstream structuring.',
  inputSchema:  pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess) return inputData

    let textContent: string | null = null

    try {
      const rawBody = JSON.parse(inputData.raw_body) as {
        message_text?: string | null
        button_reply_id?: string | null
      }
      textContent = rawBody.message_text ?? rawBody.button_reply_id ?? null
    } catch {
      textContent = inputData.raw_body
    }

    return { ...inputData, extractedContent: textContent }
  },
})

// ─── Step 5: Unified macro structuring via Gemini ────────────────────────────

const unifyExtractionStep = createStep({
  id:           'unifyExtractionStep',
  description:  'Reads branch output (keyed by step id) and uses Gemini to structure food log macros.',
  inputSchema:  branchOutputSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    // Branch outputs are keyed by step id — read whichever ran
    const branchData = inputData as Record<string, PipelineState>
    const state: PipelineState =
      branchData.audioExtractionStep ??
      branchData.imageExtractionStep ??
      branchData.textExtractionStep ??
      ({} as PipelineState)

    if (!state.shouldProcess || !state.extractedContent) {
      return { ...state, food_name: null, estimated_calories: null, protein_g: null, carbs_g: null, fat_g: null, serving_size: null }
    }

    // If the image step already returned structured JSON, parse it directly
    if (state.intent === 'meal_log' && state.mediaUrl && state.extractedContent.startsWith('{')) {
      try {
        const parsed = JSON.parse(state.extractedContent) as {
          food_name?: string
          estimated_calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          serving_size?: string
        }
        return {
          ...state,
          food_name:          parsed.food_name ?? null,
          estimated_calories: parsed.estimated_calories ?? null,
          protein_g:          parsed.protein_g ?? null,
          carbs_g:            parsed.carbs_g ?? null,
          fat_g:              parsed.fat_g ?? null,
          serving_size:       parsed.serving_size ?? null,
        }
      } catch {
        // Fall through to Gemini parsing below
      }
    }

    // For text/transcript content — ask Gemini to structure it
    let structuredJson: {
      food_name: string
      estimated_calories: number
      protein_g: number
      carbs_g: number
      fat_g: number
      serving_size: string
    } | null = null

    try {
      const { text } = await generateText({
        model: geminiModels.primary,
        messages: [
          {
            role:    'system',
            content: 'You are a nutritional data extraction engine. Extract macro data from food descriptions. Always return valid JSON. For unknown quantities, use 0.',
          },
          {
            role:    'user',
            content: `Extract nutritional data from this food description and return JSON:
"${state.extractedContent}"

Return exactly:
{"food_name":"string","estimated_calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"serving_size":"string"}`,
          },
        ],
      })

      const clean = (text ?? '').replace(/```json|```/g, '').trim()
      structuredJson = JSON.parse(clean)
    } catch (err) {
      console.error('[unifyExtractionStep] structuring failed for wam_id', state.wam_id, (err as Error).message)
    }

    return {
      ...state,
      food_name:          structuredJson?.food_name ?? null,
      estimated_calories: structuredJson?.estimated_calories ?? null,
      protein_g:          structuredJson?.protein_g ?? null,
      carbs_g:            structuredJson?.carbs_g ?? null,
      fat_g:              structuredJson?.fat_g ?? null,
      serving_size:       structuredJson?.serving_size ?? null,
    }
  },
})

// ─── Step 6: Database write ───────────────────────────────────────────────────

const databaseTransactionStep = createStep({
  id:           'databaseTransaction',
  description:  'Persists structured food log to DB with ON CONFLICT DO NOTHING on wam_id.',
  inputSchema:  pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess || !inputData.clientId) {
      return { ...inputData, success: false, logId: null }
    }

    const result = await pool.query<{ id: string }>(
      `INSERT INTO public.food_logs
         (client_id, trainer_id, wam_id, notes, verification_status, logged_at,
          calories, protein_g, carbs_g, fat_g)
       VALUES ($1, $2, $3, $4, 'UNVERIFIED', NOW(), $5, $6, $7, $8)
       ON CONFLICT (wam_id) DO NOTHING
       RETURNING id`,
      [
        inputData.clientId,
        inputData.trainer_id,
        inputData.wam_id,
        `${inputData.food_name ?? 'unknown'} | intent:${inputData.intent ?? 'unknown'}`,
        inputData.estimated_calories ?? null,
        inputData.protein_g          ?? null,
        inputData.carbs_g            ?? null,
        inputData.fat_g              ?? null,
      ],
    )

    return {
      ...inputData,
      success:    result.rows.length > 0,
      logId:      result.rows[0]?.id ?? null,
      skipReason: result.rows.length === 0 ? 'conflict_on_wam_id' : (inputData.skipReason ?? null),
    }
  },
})

// ─── Step 7: Outbound confirmation message ───────────────────────────────────

const sendOutboundNotificationStep = createStep({
  id:           'sendOutboundNotification',
  description:  'Sends a WhatsApp confirmation or clarification message back to the client.',
  inputSchema:  pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess || !inputData.client_phone) return inputData

    try {
      let message: string

      const hasMacros =
        inputData.food_name !== null &&
        inputData.food_name !== 'unknown' &&
        inputData.estimated_calories !== null &&
        inputData.estimated_calories !== undefined

      if (inputData.success && hasMacros) {
        const cal  = Math.round(inputData.estimated_calories ?? 0)
        const prot = (inputData.protein_g  ?? 0).toFixed(1)
        const carb = (inputData.carbs_g    ?? 0).toFixed(1)
        const fat  = (inputData.fat_g      ?? 0).toFixed(1)
        const name = inputData.food_name ?? 'Meal'

        message = `Logged: ${name} (Estimated: ${cal} kcal • P: ${prot}g • C: ${carb}g • F: ${fat}g). Keep up the great work!`
      } else if (inputData.success && !hasMacros) {
        message = `Hmm, I couldn't quite extract the specific calorie metrics from that description. Could you share the estimated portion size or list the main ingredients?`
      } else {
        return inputData
      }

      await sendWhatsAppTextMessage(inputData.client_phone, message)
    } catch (err) {
      console.error('[sendOutboundNotification] failed for wam_id', inputData.wam_id, (err as Error).message)
    }

    return inputData
  },
})

// ─── Pipeline assembly ────────────────────────────────────────────────────────

export const whatsappPipeline = createWorkflow({
  id:           'whatsappPipeline',
  inputSchema:  pipelineSchema,
  outputSchema: pipelineSchema,
})
  .then(validateWebhookStep          as any)
  .then(subscriptionCheckStep        as any)
  .then(multimodalIngestionStep      as any)
  .branch([
    [async (params: any) => params.inputData?.message_type === 'audio', audioExtractionStep as any],
    [async (params: any) => params.inputData?.message_type === 'image', imageExtractionStep as any],
    [async (params: any) => params.inputData?.message_type !== 'audio' && params.inputData?.message_type !== 'image', textExtractionStep as any],
  ])
  .then(unifyExtractionStep          as any)
  .then(databaseTransactionStep      as any)
  .then(sendOutboundNotificationStep as any)
  .commit()
