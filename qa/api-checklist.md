# NutriRelay API Checklist

Use the sanitized Postman collection in `qa/postman/nutrirelay-api.postman_collection.json` as a starting point. Replace environment variables with disposable dev/staging values only.

## Required Checks

- Unauthenticated trainer API request returns `401`.
- Authenticated trainer API request resolves trainer identity from session, not caller-supplied `trainer_id`.
- Client detail request returns `404` for unowned client IDs.
- Compliance route requires authenticated trainer context and trainer-client ownership.
- Reports route filters report data to active client IDs owned by the authenticated trainer.
- WhatsApp active webhook verifies Meta challenge token on `GET`.
- WhatsApp active webhook rejects invalid signatures in production.
- Deprecated `/api/webhooks/whatsapp` returns `410`.
- Embedded Signup callback returns `501` when required server env vars are missing.
- Embedded Signup callback requires an authenticated trainer session for writes.

## Environment Variables

- `baseUrl`
- `trainerSessionCookie`
- `ownedClientId`
- `unownedClientId`
- `whatsappVerifyToken`

Do not put Supabase service-role keys, Meta app secrets, WhatsApp access tokens, or real client phone numbers in Postman environments.
