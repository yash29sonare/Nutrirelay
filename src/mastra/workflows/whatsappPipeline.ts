import { createWorkflow, createStep } from '@mastra/core/workflows'
import { runAI } from '@/ai/aiGateway'
import { z } from 'zod'
import { Pool } from 'pg'
import { downloadAndStoreWhatsAppMedia } from '../../services/whatsappMedia'
import { sendWhatsAppTextMessage } from '../../services/whatsappOutbound'
import { estimateMealFromText, looksMealRelatedText } from '../tools/mealParser'
import { getClientAutomationState } from '@/lib/whatsapp/automation-state'
import { classifyImageMessage, type WhatsAppMediaKind } from '@/lib/whatsapp/media-classification'
import { decideNutritionReview } from '@/lib/meals/reviewRules'
import { resolveStructuredReply } from '@/lib/whatsapp/structuredReplies'
import { handleClientOnboardingAnswer } from '@/lib/whatsapp/onboardingService'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export interface WhatsAppPipelinePayload {
  wam_id: string
  client_phone: string
  trainer_id: string
  message_timestamp: number
  message_type: 'text' | 'audio' | 'image' | 'interactive' | 'unknown'
  raw_body: string
}

const messageTypeEnum = z.enum(['text', 'audio', 'image', 'interactive', 'unknown'])

const intentEnum = z.enum([
  'meal_log', 'workout_log', 'payment_screenshot',
  'voice_note', 'poll_response', 'progress_photo', 'other_media', 'unknown', 'skipped',
])

// Shared flat schema propagated across all sequential steps
const pipelineSchema = z.object({
  wam_id: z.string(),
  client_phone: z.string(),
  trainer_id: z.string(),
  message_timestamp: z.number(),
  message_type: messageTypeEnum,
  raw_body: z.string(),
  isDuplicate: z.boolean().optional(),
  isSubscriptionActive: z.boolean().optional(),
  clientId: z.string().nullable().optional(),
  tierType: z.string().nullable().optional(),
  shouldProcess: z.boolean().optional(),
  skipReason: z.string().nullable().optional(),
  intent: intentEnum.optional(),
  extractedContent: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
  food_name: z.string().nullable().optional(),
  estimated_calories: z.coerce.number().nullable().optional(),
  protein_g: z.coerce.number().nullable().optional(),
  carbs_g: z.coerce.number().nullable().optional(),
  fat_g: z.coerce.number().nullable().optional(),
  serving_size: z.string().nullable().optional(),
  mediaKind: z.enum(['food_photo', 'progress_photo', 'other_media']).nullable().optional(),
  relatedMediaWamId: z.string().nullable().optional(),
  success: z.boolean().optional(),
  logId: z.string().nullable().optional(),
})

type PipelineState = z.infer<typeof pipelineSchema>

// Schema for branch step outputs — keyed by step id
const branchOutputSchema = z.object({}).passthrough()
const LOCAL_DEV_AUDIO_PREFIX = 'local-dev:audio:'

function parseRawBody(rawBody: string): {
  message_text?: string | null
  media_id?: string | null
  button_reply_id?: string | null
  reply_kind?: 'button_reply' | 'list_reply' | null
  context_wam_id?: string | null
} {
  try {
    return JSON.parse(rawBody) as {
      message_text?: string | null
      media_id?: string | null
      button_reply_id?: string | null
      reply_kind?: 'button_reply' | 'list_reply' | null
      context_wam_id?: string | null
    }
  } catch {
    return {}
  }
}

function extractLocalDevTranscript(mediaId: string): string | null {
  if (!mediaId.startsWith(LOCAL_DEV_AUDIO_PREFIX)) {
    return null
  }

  const encoded = mediaId.slice(LOCAL_DEV_AUDIO_PREFIX.length)
  return decodeURIComponent(encoded).trim() || null
}

function buildInboundMetadata(state: PipelineState): Record<string, unknown> {
  const rawBody = parseRawBody(state.raw_body)
  const resolvedReply =
    state.message_type === 'interactive'
      ? resolveStructuredReply({
        replyId: rawBody.button_reply_id ?? null,
        replyLabel: rawBody.message_text ?? null,
      })
      : null

  return {
    source: state.message_type === 'interactive' ? 'whatsapp_interactive_reply' : 'whatsappPipeline',
    original_text: rawBody.message_text ?? null,
    media_id: rawBody.media_id ?? null,
    media_url: state.mediaUrl ?? null,
    media_kind: state.mediaKind ?? null,
    related_media_wam_id: state.relatedMediaWamId ?? null,
    transcript: state.transcript ?? null,
    message_type: state.message_type,
    intent: state.intent ?? null,
    skip_reason: state.skipReason ?? null,
    structured_response:
      state.message_type === 'interactive'
        ? {
          reply_id: rawBody.button_reply_id ?? null,
          reply_label: rawBody.message_text ?? null,
          selected_option: resolvedReply?.selectedOption ?? rawBody.message_text ?? null,
          interactive_type: rawBody.reply_kind ?? null,
          context_wam_id: rawBody.context_wam_id ?? null,
          adherence_status: resolvedReply?.adherenceStatus ?? 'unknown',
          outcome: resolvedReply?.outcome ?? 'unknown',
          needs_review: resolvedReply?.needsReview ?? false,
          follow_up_message: resolvedReply?.followUpMessage ?? null,
        }
        : null,
  }
}

async function findOutboundPromptContext(
  clientId: string,
  trainerId: string,
  contextWamId: string | null | undefined,
): Promise<Record<string, unknown> | null> {
  if (!contextWamId) return null

  const result = await pool.query<{
    message_type: string
    metadata: Record<string, unknown>
  }>(
    `select message_type, metadata
     from public.communication_logs
     where client_id = $1
       and trainer_id = $2
       and direction = 'OUTBOUND'
       and wam_id = $3
     order by message_timestamp desc
     limit 1`,
    [clientId, trainerId, contextWamId],
  )

  const row = result.rows[0]
  if (!row) return null

  return {
    message_type: row.message_type,
    prompt: typeof row.metadata?.prompt === 'string'
      ? row.metadata.prompt
      : typeof row.metadata?.message_preview === 'string'
        ? row.metadata.message_preview
        : null,
    interactive_kind: typeof row.metadata?.interactive_kind === 'string'
      ? row.metadata.interactive_kind
      : null,
  }
}

async function findRecentImageContext(
  clientId: string,
  messageTimestamp: number,
): Promise<{ mediaUrl: string | null; wamId: string | null; mediaKind: WhatsAppMediaKind | null } | null> {
  const result = await pool.query<{
    wam_id: string | null
    metadata: Record<string, unknown>
  }>(
    `select wam_id, metadata
     from public.communication_logs
     where client_id = $1
       and direction = 'INBOUND'
       and message_type = 'IMAGE'
       and message_timestamp between to_timestamp($2) - interval '10 minutes' and to_timestamp($2)
     order by message_timestamp desc
     limit 1`,
    [clientId, messageTimestamp],
  )

  const row = result.rows[0]
  if (!row) return null

  const mediaKind = row.metadata.media_kind
  return {
    mediaUrl: typeof row.metadata.media_url === 'string' ? row.metadata.media_url : null,
    wamId: row.wam_id,
    mediaKind:
      mediaKind === 'food_photo' || mediaKind === 'progress_photo' || mediaKind === 'other_media'
        ? mediaKind
        : null,
  }
}

async function persistInboundCommunication(state: PipelineState): Promise<void> {
  if (!state.clientId) return
  const rawBody = parseRawBody(state.raw_body)
  const outboundPromptContext =
    state.message_type === 'interactive'
      ? await findOutboundPromptContext(
        state.clientId,
        state.trainer_id,
        rawBody.context_wam_id ?? null,
      )
      : null

  const existing = await pool.query(
    `select id
     from public.communication_logs
     where wam_id = $1 and direction = 'INBOUND'
     limit 1`,
    [state.wam_id],
  )

  if (existing.rows.length > 0) return

  const messageType =
    state.message_type === 'audio'
      ? 'VOICE'
      : state.message_type === 'image'
        ? 'IMAGE'
        : state.message_type === 'interactive'
          ? 'POLL'
          : 'TEXT'

  const automationState = await getClientAutomationState(state.clientId)

  await pool.query(
    `insert into public.communication_logs
      (trainer_id, client_id, direction, message_type, wam_id, message_timestamp, delivery_status, metadata)
     values ($1, $2, 'INBOUND', $3, $4, to_timestamp($5), null, $6::jsonb)`,
    [
      state.trainer_id,
      state.clientId,
      messageType,
      state.wam_id,
      state.message_timestamp,
      JSON.stringify({
        ...buildInboundMetadata(state),
        outbound_prompt: outboundPromptContext,
        automation_state: automationState,
      }),
    ],
  )
}

async function sendStructuredReplyFollowUp(state: PipelineState): Promise<void> {
  if (state.message_type !== 'interactive' || !state.client_phone) return

  const rawBody = parseRawBody(state.raw_body)
  const resolution = resolveStructuredReply({
    replyId: rawBody.button_reply_id ?? null,
    replyLabel: rawBody.message_text ?? null,
  })

  if (!resolution.followUpMessage) {
    return
  }

  await sendWhatsAppTextMessage(
    state.trainer_id,
    state.client_phone,
    resolution.followUpMessage,
  )
}

async function persistVoiceNote(state: PipelineState): Promise<void> {
  if (state.message_type !== 'audio' || !state.clientId) return

  const existing = await pool.query(
    `select id
     from public.voice_notes
     where whatsapp_message_id = $1
     limit 1`,
    [state.wam_id],
  )

  if (existing.rows.length > 0) {
    await pool.query(
      `update public.voice_notes
       set storage_bucket_url = $2,
           transcript = $3,
           processing_status = $4,
           updated_at = now()
       where whatsapp_message_id = $1`,
      [
        state.wam_id,
        state.mediaUrl ?? 'unavailable',
        state.transcript ?? null,
        state.transcript ? 'completed' : 'failed',
      ],
    )
    return
  }

  await pool.query(
    `insert into public.voice_notes
      (client_id, whatsapp_message_id, storage_bucket_url, transcript, processing_status)
     values ($1, $2, $3, $4, $5)`,
    [
      state.clientId,
      state.wam_id,
      state.mediaUrl ?? 'unavailable',
      state.transcript ?? null,
      state.transcript ? 'completed' : 'failed',
    ],
  )
}

function isMeaningfulFoodLog(state: Pick<
  PipelineState,
  'food_name' | 'estimated_calories' | 'protein_g' | 'carbs_g' | 'fat_g'
>): boolean {
  const name = state.food_name?.trim().toLowerCase() ?? ''
  if (!name || name === 'unknown' || name === 'not_food') {
    return false
  }

  const macros = [
    state.estimated_calories,
    state.protein_g,
    state.carbs_g,
    state.fat_g,
  ]

  return macros.some((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
}

async function hasPotentialDuplicateFoodLog(state: PipelineState): Promise<boolean> {
  if (!state.clientId || !state.food_name) return false

  const result = await pool.query(
    `select id
     from public.food_logs
     where client_id = $1
       and logged_at >= now() - interval '20 minutes'
       and lower(split_part(coalesce(notes, ''), '| intent:', 1)) = lower($2)
       and coalesce(calories, 0) = coalesce($3, 0)
       and review_state <> 'rejected'
       and review_state <> 'merged'
     limit 1`,
    [
      state.clientId,
      state.food_name.trim(),
      state.estimated_calories ?? 0,
    ],
  )

  return result.rows.length > 0
}

// ─── Step 1: Idempotency guard ────────────────────────────────────────────────

const validateWebhookStep = createStep({
  id: 'validateWebhook',
  description: 'Checks food_logs for an existing wam_id to prevent duplicate processing.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    const existing = await pool.query(
      `SELECT 1
       WHERE EXISTS (SELECT 1 FROM public.food_logs WHERE wam_id = $1)
          OR EXISTS (SELECT 1 FROM public.communication_logs WHERE wam_id = $1 AND direction = 'INBOUND')`,
      [inputData.wam_id],
    )
    return { ...inputData, isDuplicate: existing.rows.length > 0 }
  },
})

// ─── Step 2: Subscription gate ───────────────────────────────────────────────

const subscriptionCheckStep = createStep({
  id: 'subscriptionCheck',
  description: 'Confirms the client has an active subscription before processing.',
  inputSchema: pipelineSchema,
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
      clientId: row.client_id,
      tierType: row.tier_type,
    }
  },
})

// ─── Step 3: Intent classification ───────────────────────────────────────────

const multimodalIngestionStep = createStep({
  id: 'multimodalIngestion',
  description: 'Classifies message type and gates further processing.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (inputData.isDuplicate) {
      return { ...inputData, shouldProcess: false, skipReason: 'duplicate_wam_id', intent: 'skipped', extractedContent: null }
    }

    if (!inputData.isSubscriptionActive || !inputData.clientId) {
      return { ...inputData, shouldProcess: false, skipReason: 'subscription_inactive_or_client_not_found', intent: 'skipped', extractedContent: null }
    }

    const intentMap: Record<string, PipelineState['intent']> = {
      audio: 'voice_note',
      image: 'payment_screenshot',
      interactive: 'poll_response',
      text: 'meal_log',
    }

    return {
      ...inputData,
      shouldProcess: true,
      skipReason: null,
      intent: intentMap[inputData.message_type] ?? 'unknown',
      extractedContent: inputData.raw_body,
    }
  },
})

const onboardingStateMachineStep = createStep({
  id: 'onboardingStateMachine',
  description: 'Intercepts inbound text replies for active WhatsApp onboarding before diet parsing.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess || !inputData.clientId || inputData.message_type !== 'text') {
      return inputData
    }

    const rawBody = parseRawBody(inputData.raw_body)
    const answerText = rawBody.message_text?.trim()
    if (!answerText) return inputData

    const onboarding = await handleClientOnboardingAnswer({
      clientId: inputData.clientId,
      trainerId: inputData.trainer_id,
      clientPhone: inputData.client_phone,
      answerText,
      receivedAt: new Date(inputData.message_timestamp * 1000).toISOString(),
    })

    if (!onboarding.handled) {
      return inputData
    }

    return {
      ...inputData,
      shouldProcess: false,
      skipReason: onboarding.completed ? 'onboarding_completed' : 'onboarding_in_progress',
      intent: 'unknown',
      extractedContent: answerText,
      success: true,
      logId: null,
    }
  },
})

// ─── Branch Step A: Audio transcription via Gemini ───────────────────────────

const audioExtractionStep = createStep({
  id: 'audioExtractionStep',
  description: 'Downloads audio from Meta CDN and transcribes via Gemini multimodal.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess) return inputData

    let transcript: string | null = null
    let publicUrl: string | null = null

    try {
      const rawBody = parseRawBody(inputData.raw_body)
      const mediaId = rawBody.media_id

      if (!mediaId) throw new Error('No media_id in raw_body for audio message')

      const stored = await downloadAndStoreWhatsAppMedia(
        inputData.trainer_id,
        mediaId,
        inputData.wam_id,
      )
      publicUrl = stored.publicUrl

      const localTranscript = extractLocalDevTranscript(mediaId)
      if (localTranscript) {
        transcript = localTranscript
      } else {
        // Fetch stored binary for inline Gemini multimodal call
        const mediaBuffer = await fetch(stored.publicUrl).then((r) => r.arrayBuffer())

        // AI-GATEWAY-ENFORCED
        const { text: transcriptText } = await runAI({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'file',
                  data: mediaBuffer,
                  mediaType: stored.mimeType as `audio/${string}`,
                },
                {
                  type: 'text',
                  text: 'Transcribe this audio message exactly as spoken. Return only the raw transcript text with no formatting.',
                },
              ],
            },
          ],
          feature: 'meal-logging',
          workflow: 'whatsappPipeline',
        })

        transcript = transcriptText ?? null
      }
    } catch (err) {
      console.error('[audioExtractionStep] transcription failed for wam_id', inputData.wam_id, (err as Error).message)
      transcript = null
    }

    return {
      ...inputData,
      mediaUrl: publicUrl,
      transcript,
      extractedContent: transcript ?? '[audio_transcription_failed]',
      intent: transcript && looksMealRelatedText(transcript) ? 'meal_log' : 'voice_note',
    }
  },
})

// ─── Branch Step B: Vision / OCR via Gemini ──────────────────────────────────

const imageExtractionStep = createStep({
  id: 'imageExtractionStep',
  description: 'Downloads image from Meta CDN and runs Gemini Vision for food macro extraction.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess) return inputData

    let visionResult: string | null = null
    let publicUrl: string | null = null
    const rawBody = parseRawBody(inputData.raw_body)
    const imageCaption = rawBody.message_text?.trim() ?? null

    try {
      const mediaId = rawBody.media_id

      if (!mediaId) throw new Error('No media_id in raw_body for image message')

      const stored = await downloadAndStoreWhatsAppMedia(
        inputData.trainer_id,
        mediaId,
        inputData.wam_id,
      )
      publicUrl = stored.publicUrl

      // AI-GATEWAY-ENFORCED
      const { text: visionText } = await runAI({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
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
        feature: 'meal-logging',
        workflow: 'whatsappPipeline',
      })

      visionResult = visionText ?? null
    } catch (err) {
      console.error('[imageExtractionStep] vision failed for wam_id', inputData.wam_id, (err as Error).message)
      visionResult = null
    }

    const fallbackContent =
      imageCaption && looksMealRelatedText(imageCaption)
        ? imageCaption
        : visionResult

    return {
      ...inputData,
      extractedContent: fallbackContent ?? '[image_analysis_failed]',
      mediaUrl: publicUrl,
      mediaKind: classifyImageMessage({
        caption: imageCaption,
        extractedContent: fallbackContent ?? visionResult,
      }),
      intent:
        fallbackContent && looksMealRelatedText(fallbackContent)
          ? 'meal_log'
          : classifyImageMessage({ caption: imageCaption, extractedContent: fallbackContent ?? visionResult }) === 'progress_photo'
            ? 'progress_photo'
            : 'other_media',
    }
  },
})

// ─── Branch Step C: Text / interactive pass-through ──────────────────────────

const textExtractionStep = createStep({
  id: 'textExtractionStep',
  description: 'Passes text or poll response through for downstream structuring.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess) return inputData

    let textContent: string | null = null

    try {
      const rawBody = parseRawBody(inputData.raw_body)
      textContent = rawBody.message_text ?? rawBody.button_reply_id ?? null
    } catch {
      textContent = inputData.raw_body
    }

    const recentImage =
      inputData.clientId && textContent && looksMealRelatedText(textContent)
        ? await findRecentImageContext(inputData.clientId, inputData.message_timestamp)
        : null

    return {
      ...inputData,
      extractedContent: textContent,
      mediaUrl: recentImage?.mediaUrl ?? inputData.mediaUrl,
      mediaKind: recentImage?.mediaKind ?? inputData.mediaKind,
      relatedMediaWamId: recentImage?.wamId ?? inputData.relatedMediaWamId,
    }
  },
})

// ─── Step 5: Unified macro structuring via Gemini ────────────────────────────

const unifyExtractionStep = createStep({
  id: 'unifyExtractionStep',
  description: 'Reads branch output (keyed by step id) and uses Gemini to structure food log macros.',
  inputSchema: branchOutputSchema,
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

    if (state.message_type === 'interactive') {
      return {
        ...state,
        food_name: null,
        estimated_calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        serving_size: null,
      }
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
          food_name: parsed.food_name ?? null,
          estimated_calories: parsed.estimated_calories ?? null,
          protein_g: parsed.protein_g ?? null,
          carbs_g: parsed.carbs_g ?? null,
          fat_g: parsed.fat_g ?? null,
          serving_size: parsed.serving_size ?? null,
          mediaKind: classifyImageMessage({
            extractedContent: state.extractedContent,
            foodName: parsed.food_name ?? null,
          }),
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
      // AI-GATEWAY-ENFORCED
      const { text: structuredText } = await runAI({
        system: 'You are a nutritional data extraction engine. Extract macro data from food descriptions. Always return valid JSON. For unknown quantities, use 0.',
        prompt: `Extract nutritional data from this food description and return JSON:
"${state.extractedContent}"

Return exactly:
{"food_name":"string","estimated_calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"serving_size":"string"}`,
        feature: 'meal-logging',
        workflow: 'whatsappPipeline',
      })

      const clean = (structuredText ?? '').replace(/```json|```/g, '').trim()
      structuredJson = JSON.parse(clean)
    } catch (err) {
      console.error('[unifyExtractionStep] structuring failed for wam_id', state.wam_id, (err as Error).message)
    }

    const shouldUseFallback =
      looksMealRelatedText(state.extractedContent) &&
      (
        !structuredJson ||
        !isMeaningfulFoodLog({
          food_name: structuredJson.food_name ?? null,
          estimated_calories: structuredJson.estimated_calories ?? null,
          protein_g: structuredJson.protein_g ?? null,
          carbs_g: structuredJson.carbs_g ?? null,
          fat_g: structuredJson.fat_g ?? null,
        })
      )

    if (shouldUseFallback) {
      const fallback = estimateMealFromText(state.extractedContent)
      if (fallback) {
        structuredJson = fallback
      }
    }

    return {
      ...state,
      food_name: structuredJson?.food_name ?? null,
      estimated_calories: structuredJson?.estimated_calories ?? null,
      protein_g: structuredJson?.protein_g ?? null,
      carbs_g: structuredJson?.carbs_g ?? null,
      fat_g: structuredJson?.fat_g ?? null,
      serving_size: structuredJson?.serving_size ?? null,
      mediaKind:
        state.message_type === 'image'
          ? classifyImageMessage({
            extractedContent: state.extractedContent,
            foodName: structuredJson?.food_name ?? null,
          })
          : state.mediaKind ?? null,
    }
  },
})

const persistInboundArtifactsStep = createStep({
  id: 'persistInboundArtifacts',
  description: 'Persists inbound communication visibility rows and voice-note outcomes.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.clientId) {
      return inputData
    }

    try {
      await persistInboundCommunication(inputData)
      await persistVoiceNote(inputData)
    } catch (err) {
      console.error('[persistInboundArtifacts] failed for wam_id', inputData.wam_id, (err as Error).message)
    }

    return inputData
  },
})

// ─── Step 6: Database write ───────────────────────────────────────────────────

const databaseTransactionStep = createStep({
  id: 'databaseTransaction',
  description: 'Persists structured food log to DB with ON CONFLICT DO NOTHING on wam_id.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess || !inputData.clientId) {
      return { ...inputData, success: false, logId: null }
    }

    if (inputData.message_type === 'interactive') {
      return {
        ...inputData,
        success: true,
        logId: null,
        skipReason: inputData.skipReason ?? 'structured_response_only',
      }
    }

    if (!isMeaningfulFoodLog(inputData)) {
      return {
        ...inputData,
        shouldProcess: false,
        success: false,
        logId: null,
        skipReason: inputData.skipReason ?? 'non_diet_or_unresolved_message',
      }
    }

    const hasDuplicate = await hasPotentialDuplicateFoodLog(inputData)
    const reviewDecision = decideNutritionReview({
      foodName: inputData.food_name,
      extractedContent: inputData.extractedContent,
      messageType: inputData.message_type,
      mediaKind: inputData.mediaKind,
      calories: inputData.estimated_calories,
      proteinG: inputData.protein_g,
      carbsG: inputData.carbs_g,
      fatG: inputData.fat_g,
      isDuplicate: hasDuplicate,
    })

    const result = await pool.query<{ id: string }>(
      `INSERT INTO public.food_logs
         (client_id, trainer_id, wam_id, notes, verification_status, logged_at,
          calories, protein_g, carbs_g, fat_g, image_path, transcription_failed,
          review_state, ai_confidence, review_reason)
       VALUES ($1, $2, $3, $4, 'UNVERIFIED', NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (wam_id) DO NOTHING
       RETURNING id`,
      [
        inputData.clientId,
        inputData.trainer_id,
        inputData.wam_id,
        `${inputData.food_name ?? 'unknown'} | intent:${inputData.intent ?? 'unknown'}`,
        inputData.estimated_calories ?? null,
        inputData.protein_g ?? null,
        inputData.carbs_g ?? null,
        inputData.fat_g ?? null,
        inputData.message_type === 'image' ? inputData.mediaUrl ?? null : null,
        inputData.message_type === 'audio' ? !inputData.transcript : false,
        reviewDecision.reviewState,
        reviewDecision.confidence,
        reviewDecision.reason,
      ],
    )

    return {
      ...inputData,
      success: result.rows.length > 0,
      logId: result.rows[0]?.id ?? null,
      skipReason: result.rows.length === 0 ? 'conflict_on_wam_id' : (inputData.skipReason ?? null),
    }
  },
})

// ─── Step 7: Outbound confirmation message ───────────────────────────────────

const sendOutboundNotificationStep = createStep({
  id: 'sendOutboundNotification',
  description: 'Sends a WhatsApp confirmation or clarification message back to the client.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess || !inputData.client_phone) return inputData
    if (inputData.message_type === 'interactive') return inputData

    try {
      let message: string

      const hasMacros =
        inputData.food_name !== null &&
        inputData.food_name !== 'unknown' &&
        inputData.estimated_calories !== null &&
        inputData.estimated_calories !== undefined

      if (inputData.success && hasMacros) {
        const cal = Math.round(inputData.estimated_calories ?? 0)
        const prot = (inputData.protein_g ?? 0).toFixed(1)
        const carb = (inputData.carbs_g ?? 0).toFixed(1)
        const fat = (inputData.fat_g ?? 0).toFixed(1)
        const name = inputData.food_name ?? 'Meal'

        message = `Logged: ${name} (Estimated: ${cal} kcal • P: ${prot}g • C: ${carb}g • F: ${fat}g). Keep up the great work!`
      } else if (inputData.success && !hasMacros) {
        message = `Hmm, I couldn't quite extract the specific calorie metrics from that description. Could you share the estimated portion size or list the main ingredients?`
      } else {
        return inputData
      }

      await sendWhatsAppTextMessage(inputData.trainer_id, inputData.client_phone, message)
    } catch (err) {
      console.error('[sendOutboundNotification] failed for wam_id', inputData.wam_id, (err as Error).message)
    }

    return inputData
  },
})

const structuredReplyFollowUpStep = createStep({
  id: 'structuredReplyFollowUp',
  description: 'Sends the smallest safe follow-up after structured meal selections like outside food or alternative meals.',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
  execute: async ({ inputData }): Promise<PipelineState> => {
    if (!inputData.shouldProcess || inputData.message_type !== 'interactive') {
      return inputData
    }

    try {
      await sendStructuredReplyFollowUp(inputData)
    } catch (err) {
      console.error('[structuredReplyFollowUp] failed for wam_id', inputData.wam_id, (err as Error).message)
    }

    return inputData
  },
})

// ─── Pipeline assembly ────────────────────────────────────────────────────────

export const whatsappPipeline = createWorkflow({
  id: 'whatsappPipeline',
  inputSchema: pipelineSchema,
  outputSchema: pipelineSchema,
})
  .then(validateWebhookStep as any)
  .then(subscriptionCheckStep as any)
  .then(multimodalIngestionStep as any)
  .then(onboardingStateMachineStep as any)
  .branch([
    [async (params: any) => params.inputData?.message_type === 'audio', audioExtractionStep as any],
    [async (params: any) => params.inputData?.message_type === 'image', imageExtractionStep as any],
    [async (params: any) => params.inputData?.message_type !== 'audio' && params.inputData?.message_type !== 'image', textExtractionStep as any],
  ])
  .then(unifyExtractionStep as any)
  .then(persistInboundArtifactsStep as any)
  .then(databaseTransactionStep as any)
  .then(structuredReplyFollowUpStep as any)
  .then(sendOutboundNotificationStep as any)
  .commit()
