import { google } from '@ai-sdk/google'
import type { ModelWithRetries } from '@mastra/core/agent'

export const geminiModels = {
  primary:   google('gemini-3.1-flash-lite'),
  fallback1: google('gemini-3-flash-preview'),
  fallback2: google('gemini-2.5-flash'),
} as const

// Native Mastra agent fallback array — passed directly to Agent.model.
// Mastra exhausts maxRetries on each tier before advancing to the next entry,
// providing automatic 429-resilient failover without custom wrapper logic.
export const agentModelFallbacks: ModelWithRetries[] = [
  { model: google('gemini-3.1-flash-lite'),   maxRetries: 3 },
  { model: google('gemini-3-flash-preview'),  maxRetries: 2 },
  { model: google('gemini-2.5-flash'),        maxRetries: 2 },
]

export const modelRetryPolicy = {
  maxRetries: 3,
} as const

export type GeminiModelTier = keyof typeof geminiModels
