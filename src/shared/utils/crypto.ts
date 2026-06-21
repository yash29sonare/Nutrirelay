import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies the X-Hub-Signature-256 header from Meta webhooks.
 * Hashes both the expected and received signatures to equal lengths
 * before the timing-safe comparison — prevents crypto.timingSafeEqual
 * from throwing on mismatched buffer sizes.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false

  const received = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader

  const expected = createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')

  // Hash both to fixed 32-byte buffers before comparison
  const expectedBuf = createHmac('sha256', appSecret).update(expected).digest()
  const receivedBuf = createHmac('sha256', appSecret).update(received).digest()

  return timingSafeEqual(expectedBuf, receivedBuf)
}
