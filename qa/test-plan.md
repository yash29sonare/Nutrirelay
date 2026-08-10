# NutriRelay QA Test Plan

This plan covers verified NutriRelay flows from the current codebase and public deployment. It does not include real secrets, real client data, or destructive production actions.

## Scope

- Public landing page at `https://nutrirelay.in` and `https://www.nutrirelay.in`.
- Supabase email/password authentication for trainer access.
- Protected dashboard routes.
- Trainer-owned client, meal, report, communication, and WhatsApp surfaces.
- Meta WhatsApp webhook ingestion and internal queue processing.
- Meta Embedded Signup readiness and callback handling.

## Out Of Scope

- Creating or deleting production client data without explicit approval.
- Sending live WhatsApp messages without operator approval.
- Supabase `db push` or remote migration application.
- Testing with real secrets in screenshots, logs, docs, or Postman collections.

## Smoke Tests

| Area | Test | Expected Result | Evidence |
| --- | --- | --- | --- |
| Domain | Open `https://nutrirelay.in` | Redirects or resolves to the live NutriRelay app | Browser URL and page title |
| Domain | Open `https://www.nutrirelay.in` | Loads the same production app | Browser URL and page title |
| Landing | Check H1 and CTA | H1 describes nutrition review workflow; login/trial CTAs are visible | DOM text |
| Metadata | Inspect title, description, Open Graph tags | Title, description, OG title, and OG image exist | DOM head |
| Auth | Open `/dashboard` when signed out | Redirects to `/login` | Final URL |
| Auth | Open `/dashboard` when signed in | Shows dashboard shell and trainer navigation | DOM text |
| API | Call trainer API without auth | Returns unauthorized response | API response |
| WhatsApp | Call deprecated plural webhook route | Returns 410 with active endpoint hint | API response |

## Regression Commands

```bash
npx tsc --noEmit --pretty false --incremental false
npm run lint
npm test
npm run build
```

## Manual Evidence Rules

- Mask email addresses, phone numbers, access tokens, service-role keys, and real client names.
- Record pass/fail with exact route, environment, date, and tester initials.
- Keep Meta WhatsApp proof to metadata only unless the operator explicitly approves a live send.
