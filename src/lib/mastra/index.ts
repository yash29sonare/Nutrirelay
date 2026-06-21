/**
 * src/lib/mastra/index.ts
 *
 * Facade over the core Mastra singleton (src/mastra/index.ts).
 * All application code outside the mastra/ directory should import from here.
 * Adds globalThis type safety, log-level resolution, and stub hooks for
 * storage / telemetry wiring that will be completed in Tasks 5.2–5.4.
 */

import { type Mastra } from "@mastra/core";

// ── Re-export the production singleton factory ─────────────────────────────────
export { getMastra } from "@/mastra/index";

// ── GlobalThis type augmentation ───────────────────────────────────────────────
// Prevents TypeScript static-analysis failures when accessing globalThis.mastra
// in server components, route handlers, and workers.
declare global {
  // eslint-disable-next-line no-var
  var mastra: Mastra | undefined;
  // eslint-disable-next-line no-var
  var queueWorkerActive: boolean | undefined;
}

// ── Log-level resolver ─────────────────────────────────────────────────────────
// Reads LOG_LEVEL from env; falls back to "info" to protect serverless log buffers.
export type LogLevel = "debug" | "info" | "warn" | "error";

export function resolveLogLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  const allowed: LogLevel[] = ["debug", "info", "warn", "error"];
  return (allowed.includes(raw as LogLevel) ? raw : "info") as LogLevel;
}

// ── Storage / telemetry stub ───────────────────────────────────────────────────
// Placeholder for Task 5.2 — thread memory and distributed tracing config.
// Exported so future tasks can import and extend without touching this file.
export interface MastraStorageConfig {
  connectionString: string;
}

export interface MastraTelemetryConfig {
  /** OpenTelemetry-compatible exporter endpoint (optional) */
  exporterEndpoint?: string;
  serviceName?: string;
}

/**
 * Builds a storage config object from environment variables.
 * Throws at call-time if DATABASE_URL is absent — never at module load.
 */
export function buildStorageConfig(): MastraStorageConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("[mastra] DATABASE_URL is not set — cannot build storage config");
  }
  return { connectionString };
}

/**
 * Builds an optional telemetry config from environment variables.
 * Returns undefined when no exporter endpoint is configured — telemetry is opt-in.
 */
export function buildTelemetryConfig(): MastraTelemetryConfig | undefined {
  const exporterEndpoint = process.env.OTEL_EXPORTER_ENDPOINT;
  if (!exporterEndpoint) return undefined;
  return {
    exporterEndpoint,
    serviceName: process.env.OTEL_SERVICE_NAME ?? "fortress-fitness",
  };
}
