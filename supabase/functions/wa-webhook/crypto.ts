/**
 * Deno-compatible HMAC-SHA256 webhook signature verifier.
 * Uses the Web Crypto API (crypto.subtle) — no Node.js crypto module.
 */
export async function verifyWebhookSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader) return false

  const received = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader

  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )

  // Convert received hex string to Uint8Array for constant-time verify
  const receivedBytes = new Uint8Array(
    received.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)),
  )

  // Compute expected signature over raw binary body
  const expectedSignature = await crypto.subtle.sign('HMAC', key, rawBody.buffer as ArrayBuffer)
  const expectedBytes = new Uint8Array(expectedSignature)

  if (expectedBytes.length !== receivedBytes.length) return false

  // Constant-time comparison via crypto.subtle.verify
  return crypto.subtle.verify('HMAC', key, receivedBytes.buffer as ArrayBuffer, rawBody.buffer as ArrayBuffer)
}
