# NutriRelay Bug Report Examples

These are sample formats, not claims that the bugs currently exist.

## Example 1: Protected Route Redirect Fails

- Title: Signed-out user can view dashboard shell.
- Environment: staging.
- Route: `/dashboard`.
- Steps:
  1. Clear cookies.
  2. Open `/dashboard`.
  3. Observe final URL and visible content.
- Expected: redirect to `/login`.
- Actual: dashboard content visible.
- Severity: critical.
- Privacy: no screenshots with real trainer/client data.

## Example 2: WhatsApp Webhook Status Not Correlated

- Title: Delivered status webhook does not update existing communication log.
- Environment: local/staging.
- Route: `/api/webhook/whatsapp`.
- Steps:
  1. Send a mock status webhook with known `wam_id`.
  2. Inspect `whatsapp_message_statuses`.
  3. Inspect related `communication_logs`.
- Expected: status row is inserted and communication log latest status updates.
- Actual: status row inserted but communication log unchanged.
- Severity: medium.
- Privacy: mask `wam_id` except last 6 characters.

## Example 3: Landing Metadata Missing

- Title: Landing page lacks Open Graph image.
- Environment: production.
- Route: `/`.
- Steps:
  1. Open page.
  2. Inspect `meta[property="og:image"]`.
- Expected: Open Graph image points to public brand asset.
- Actual: tag missing.
- Severity: low.
