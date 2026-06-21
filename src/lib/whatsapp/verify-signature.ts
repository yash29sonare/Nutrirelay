import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies the X-Hub-Signature-256 header sent by Meta on every webhook POST.
 *
 * Security notes:
 * - APP_SECRET is read inside the function body — never at module evaluation time,
 *   so missing env vars do not crash next build or trigger deploy tree-shaking.
 * - Strips the mandatory "sha256=" prefix before comparison.
 * - Hashes both sides to a fixed 32-byte buffer before timingSafeEqual to
 *   guarantee equal lengths — timingSafeEqual throws if lengths differ.
 */
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null | undefined
): boolean {
  const APP_SECRET = process.env.WHATSAPP_APP_SECRET;
  if (!APP_SECRET) {
    throw new Error(
      "[verify-signature] WHATSAPP_APP_SECRET is not set. Cannot verify webhook signature."
    );
  }

  if (!signatureHeader) return false;

  const receivedHex = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  const expectedHex = createHmac("sha256", APP_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");

  if (Buffer.byteLength(receivedHex, "hex") !== Buffer.byteLength(expectedHex, "hex")) {
    return false;
  }

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const receivedBuf = Buffer.from(receivedHex, "hex");

  return timingSafeEqual(expectedBuf, receivedBuf);
}
