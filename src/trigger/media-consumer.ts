// ═══════════════════════════════════════════════════════════════════════════════
// DISABLED — DO NOT USE
//
// This Trigger.dev task was a direct audio processing path that bypassed PGMQ.
// It was only ever triggered from the now-deprecated /api/webhooks/whatsapp
// route (now 410 Gone).
//
// RULE: ALL WhatsApp inbound messages MUST go through PGMQ queue.
// Pipeline: webhook → pgmq_send → queueConsumer → whatsappPipeline
//
// Audio messages are handled inside whatsappPipeline via audioExtractionStep
// (Gemini transcription). This file is preserved for reference only.
// Runtime execution logs [CRITICAL VIOLATION] and throws.
// ═══════════════════════════════════════════════════════════════════════════════

import { task } from "@trigger.dev/sdk";

export const mediaConsumerTask = task({
  id: "media-consumer",
  maxDuration: 300,
  run: async (_payload: Record<string, never>): Promise<never> => {
    const err = new Error(
      "DIRECT INGESTION BLOCKED: USE /api/webhook/whatsapp — " +
      "media-consumer task is permanently disabled."
    );
    console.error("[CRITICAL VIOLATION]", err.message);
    console.error("[CRITICAL VIOLATION] stack:", err.stack);
    throw err;
  },
});
