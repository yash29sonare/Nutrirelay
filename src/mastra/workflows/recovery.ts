import { createWorkflow, createStep } from '@mastra/core/workflows'
import { runAI } from '@/ai/aiGateway'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { downloadAndStoreWhatsAppMedia } from '../../services/whatsappMedia'
import type { Database } from '../../shared/types/supabase'

// ── Supabase service client ────────────────────────────────────────────────────
function getDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  mediaId: z.string(),
  whatsappMessageId: z.string(),
  userContext: z.record(z.string(), z.any()),
})

const downloadOutputSchema = z.object({
  mediaId: z.string(),
  whatsappMessageId: z.string(),
  userContext: z.record(z.string(), z.any()),
  storagePath: z.string(),
  mimeType: z.string(),
  downloadFailed: z.boolean(),
})

const transcribeOutputSchema = z.object({
  mediaId: z.string(),
  whatsappMessageId: z.string(),
  userContext: z.record(z.string(), z.any()),
  storagePath: z.string(),
  mimeType: z.string(),
  downloadFailed: z.boolean(),
  transcript: z.string().nullable(),
  confidenceScore: z.number().min(0).max(1),
  transcribeFailed: z.boolean(),
})

const outputSchema = z.object({
  mediaId: z.string(),
  whatsappMessageId: z.string(),
  userContext: z.record(z.string(), z.any()),
  storagePath: z.string(),
  mimeType: z.string(),
  downloadFailed: z.boolean(),
  transcript: z.string().nullable(),
  confidenceScore: z.number().min(0).max(1),
  transcribeFailed: z.boolean(),
  persisted: z.boolean(),
  voiceNoteId: z.string().nullable(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']),
})

type DownloadOutput = z.infer<typeof downloadOutputSchema>
type TranscribeOutput = z.infer<typeof transcribeOutputSchema>
type RecoveryOutput = z.infer<typeof outputSchema>

// ── Step 1: Download audio from Meta CDN via existing media service ────────────

const downloadVoiceNoteStep = createStep({
  id: 'downloadVoiceNoteStep',
  description: 'Resolves transient Meta CDN URL and stores audio in Supabase Storage.',
  inputSchema,
  outputSchema: downloadOutputSchema,
  execute: async ({ inputData }): Promise<DownloadOutput> => {
    try {
      const trainerId: string | undefined =
        typeof inputData.userContext?.trainerId === 'string'
          ? inputData.userContext.trainerId
          : undefined

      if (!trainerId) {
        throw new Error(
          `[recovery/download] missing trainerId in userContext for wam_id ${inputData.whatsappMessageId}`,
        )
      }

      const { publicUrl, mimeType } = await downloadAndStoreWhatsAppMedia(
        trainerId,
        inputData.mediaId,
        inputData.whatsappMessageId,
      )
      return {
        ...inputData,
        storagePath: publicUrl,
        mimeType,
        downloadFailed: false,
      }
    } catch (err) {
      console.error(
        '[recovery/download] failed for wam_id',
        inputData.whatsappMessageId,
        (err as Error).message,
      )
      return {
        ...inputData,
        storagePath: '',
        mimeType: 'audio/ogg',
        downloadFailed: true,
      }
    }
  },
})

// ── Step 2: Gemini multimodal transcription ────────────────────────────────────

const transcribeAudioStep = createStep({
  id: 'transcribeAudioStep',
  description: 'Sends stored audio to Gemini for transcription with confidence scoring.',
  inputSchema: downloadOutputSchema,
  outputSchema: transcribeOutputSchema,
  execute: async ({ inputData }): Promise<TranscribeOutput> => {
    if (inputData.downloadFailed || !inputData.storagePath) {
      return {
        ...inputData,
        transcript: null,
        confidenceScore: 0,
        transcribeFailed: true,
      }
    }

    try {
      // Fetch the stored binary for inline Gemini multimodal submission
      const mediaRes = await fetch(inputData.storagePath)
      if (!mediaRes.ok) throw new Error(`Storage fetch failed: ${mediaRes.status}`)
      const audioBuffer = await mediaRes.arrayBuffer()

      const mimeType = inputData.mimeType as `audio/${string}`

      // AI-GATEWAY-ENFORCED
      const { text } = await runAI({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'file',
                data: audioBuffer,
                mediaType: mimeType as `audio/${string}`,
              },
              {
                type: 'text',
                text: `Transcribe this audio message exactly as spoken.
Return a JSON object with exactly these fields:
{"transcript": "<verbatim transcription>", "confidenceScore": <float 0.0–1.0>}
If the audio is inaudible or empty, return {"transcript": null, "confidenceScore": 0.0}.
Return only the JSON object. No explanation.`,
              },
            ],
          },
        ],
        feature: 'voice-note',
        workflow: 'voiceNoteRecoveryWorkflow',
      })

      const clean = (text ?? '').replace(/```json|```/g, '').trim()
      const parsed = z.object({
        transcript: z.string().nullable(),
        confidenceScore: z.number().min(0).max(1),
      }).parse(JSON.parse(clean))

      return {
        ...inputData,
        transcript: parsed.transcript,
        confidenceScore: parsed.confidenceScore,
        transcribeFailed: false,
      }
    } catch (err) {
      console.error(
        '[recovery/transcribe] failed for wam_id',
        inputData.whatsappMessageId,
        (err as Error).message,
      )
      return {
        ...inputData,
        transcript: null,
        confidenceScore: 0,
        transcribeFailed: true,
      }
    }
  },
})

// ── Step 3: Confidence gate ────────────────────────────────────────────────────

const evaluateConfidenceStep = createStep({
  id: 'evaluateConfidenceStep',
  description: 'Gates downstream persistence — routes low-confidence results to failed status.',
  inputSchema: transcribeOutputSchema,
  outputSchema: transcribeOutputSchema,
  execute: async ({ inputData }): Promise<TranscribeOutput> => {
    const CONFIDENCE_THRESHOLD = 0.75

    if (inputData.transcribeFailed || inputData.confidenceScore < CONFIDENCE_THRESHOLD) {
      console.warn(
        '[recovery/confidence] below threshold for wam_id',
        inputData.whatsappMessageId,
        `score=${inputData.confidenceScore}`,
      )
    }

    return inputData
  },
})

// ── Step 4: Persist voice note record ─────────────────────────────────────────

const persistVoiceNoteStep = createStep({
  id: 'persistVoiceNoteStep',
  description: 'Inserts voice_notes row — status=completed if confident, failed otherwise.',
  inputSchema: transcribeOutputSchema,
  outputSchema,
  execute: async ({ inputData }): Promise<RecoveryOutput> => {
    const CONFIDENCE_THRESHOLD = 0.75
    const db = getDb()

    const clientId: string | undefined =
      typeof inputData.userContext?.clientId === 'string'
        ? inputData.userContext.clientId
        : undefined

    if (!clientId) {
      console.error(
        '[recovery/persist] missing clientId in userContext for wam_id',
        inputData.whatsappMessageId,
      )
      return {
        ...inputData,
        persisted: false,
        voiceNoteId: null,
        processingStatus: 'failed',
      }
    }

    const isHighConfidence =
      !inputData.transcribeFailed &&
      inputData.confidenceScore >= CONFIDENCE_THRESHOLD &&
      !!inputData.transcript

    const processingStatus = isHighConfidence ? 'completed' : 'failed'

    const { data, error } = await db
      .from('voice_notes')
      .insert({
        client_id: clientId,
        whatsapp_message_id: inputData.whatsappMessageId,
        storage_bucket_url: inputData.storagePath || 'unavailable',
        transcript: inputData.transcript ?? null,
        processing_status: processingStatus,
      })
      .select('id')
      .single()

    if (error) {
      console.error(
        '[recovery/persist] DB insert error for wam_id',
        inputData.whatsappMessageId,
        error.message,
      )
      return {
        ...inputData,
        persisted: false,
        voiceNoteId: null,
        processingStatus: 'failed',
      }
    }

    return {
      ...inputData,
      persisted: true,
      voiceNoteId: data.id,
      processingStatus,
    }
  },
})

// ── Workflow assembly ──────────────────────────────────────────────────────────

export const voiceNoteRecoveryWorkflow = createWorkflow({
  id: 'voiceNoteRecoveryWorkflow',
  inputSchema,
  outputSchema,
})
  .then(downloadVoiceNoteStep as any)
  .then(transcribeAudioStep as any)
  .then(evaluateConfidenceStep as any)
  .then(persistVoiceNoteStep as any)
  .commit()
