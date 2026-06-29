import { generateText } from "ai";
import { buildPrompt, enforcePromptSchema } from "./promptBuilder";
import { resolveSkills, type ResolverContext } from "@/skills/resolver";
import { geminiModels } from "@/mastra/config";

type AIGenerateText = typeof generateText;
type AIModel = Parameters<AIGenerateText>[0]["model"];

/**
 * Hard contract for all AI requests.
 * Every AI call in the system MUST pass through this interface.
 */
export interface AIGatewayRequest {
  /** The user-facing prompt text */
  prompt: string;
  /** Optional system-level instruction */
  system?: string;
  /** Feature identifier for skill resolution (e.g. "meal-logging") */
  feature?: string;
  /** Workflow identifier (e.g. "whatsappPipeline") */
  workflow?: string;
  /** Explicit model override */
  model?: AIModel;
  /** Model fallback cascade */
  modelTiers?: AIModel[];
}

/**
 * Strict request for multimodal AI requests (audio, images).
 * Uses raw messages array instead of prompt string.
 */
export interface AIGatewayMultimodalRequest {
  messages: {
    role: "user" | "assistant";
    content:
      | string
      | (
          | { type: "text"; text: string }
          | { type: "file"; data: ArrayBuffer; mediaType: string }
          | { type: "image"; image: string }
        )[];
  }[];
  /** System-level instruction injected as first message */
  system?: string;
  /** Feature identifier for skill resolution */
  feature?: string;
  /** Workflow identifier */
  workflow?: string;
  /** Model fallback cascade */
  modelTiers?: AIModel[];
}

export interface AIResponse {
  text: string;
  usage?: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
  };
}

function buildResolverContext(
  feature?: string,
  workflow?: string
): ResolverContext {
  return {
    feature: feature ?? "unknown",
    workflowType: workflow,
  };
}

function validateRequest(
  request: AIGatewayRequest | AIGatewayMultimodalRequest
): void {
  const hasPrompt = "prompt" in request && !!request.prompt;
  const hasMessages =
    "messages" in request &&
    Array.isArray(request.messages) &&
    request.messages.length > 0;

  if (!hasPrompt && !hasMessages) {
    throw new Error(
      "[aiGateway] Rejected: request must contain either 'prompt' or 'messages'"
    );
  }

  if (hasPrompt && typeof request.prompt !== "string") {
    throw new Error("[aiGateway] Rejected: 'prompt' must be a string");
  }
}

/**
 * Run an AI text generation request through the gateway.
 *
 * This is the ONLY valid entry point for AI calls in the codebase.
 * All skill context + design system constraints are automatically injected.
 *
 * @throws If the request is malformed or all model tiers are exhausted.
 */
export async function runAI(
  request: AIGatewayRequest | AIGatewayMultimodalRequest
): Promise<AIResponse> {
  validateRequest(request);

  const context = buildResolverContext(request.feature, request.workflow);
  const activeSkills = resolveSkills(context);

  if (activeSkills.length === 0) {
    console.warn(
      `[aiGateway] No active skills resolved for feature="${request.feature}" workflow="${request.workflow}"`
    );
  }

  const composedSystem = buildPrompt({
    systemPrompt: request.system ?? "",
    activeSkills,
    feature: request.feature ?? "unknown",
  });

  const schemaCheck = enforcePromptSchema(composedSystem);
  if (!schemaCheck.valid) {
    console.error("[aiGateway] Prompt schema violations:", schemaCheck.errors);
  }

  const tiers =
    "modelTiers" in request && request.modelTiers
      ? request.modelTiers
      : "model" in request && request.model
        ? [request.model]
        : [geminiModels.primary as AIModel];

  let lastError: Error | null = null;

  for (const model of tiers) {
    try {
      let result;
      if ("messages" in request && request.messages) {
        result = await (generateText as unknown as (
          args: Record<string, unknown>
        ) => ReturnType<AIGenerateText>)({
          model,
          messages: [
            { role: "system", content: composedSystem },
            ...request.messages,
          ],
        });
      } else {
        result = await (generateText as unknown as (
          args: Record<string, unknown>
        ) => ReturnType<AIGenerateText>)({
          model,
          system: composedSystem,
          prompt: (request as AIGatewayRequest).prompt ?? "",
        });
      }

      return {
        text: result.text,
        usage: result.usage
          ? {
              inputTokens: result.usage.inputTokens,
              outputTokens: result.usage.outputTokens,
            }
          : undefined,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[aiGateway] Model tier failed, trying next: ${lastError.message}`
      );
    }
  }

  throw lastError ?? new Error("[aiGateway] All model tiers exhausted");
}
