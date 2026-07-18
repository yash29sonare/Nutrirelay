# NutriRelay First Trainer Manual WABA Pilot Runbook

This runbook is for the first external trainer pilot before self-serve WhatsApp connection, live billing, or Embedded Signup are enabled.

## Current Boundary

- NutriRelay is ready for an operator-assisted manual trainer WABA pilot.
- The trainer owns the WhatsApp/WABA relationship.
- Clients receive messages from the trainer's WhatsApp Business number once the trainer credential is connected.
- Self-serve Embedded Signup is not enabled yet.
- Self-serve reconnect is not enabled yet.
- Billing is not enabled for the manual pilot.
- Do not ask trainers to paste access tokens into browser UI.

## Trainer Prerequisites

- [ ] Trainer account exists in NutriRelay.
- [ ] Trainer profile exists.
- [ ] Trainer understands that WhatsApp setup is operator-assisted for the pilot.
- [ ] Trainer has client consent to process nutrition, health, and WhatsApp message data.
- [ ] Trainer has permission to message each pilot client on WhatsApp.

## WABA Details To Collect Later

Collect these details through an operator-secured channel only.

- [ ] Trainer-owned WABA or business account ID.
- [ ] Trainer-owned phone_number_id.
- [ ] WhatsApp Business display phone number, for operator verification.
- [ ] Approved or testable template name and language.
- [ ] Webhook callback confirmation for the active `/api/webhook/whatsapp` route.
- [ ] Messages webhook field subscription confirmation.
- [ ] Credential permission/token handled only by the operator on the server side.

Do not put access tokens into public pages, dashboard forms, screenshots, tickets, or frontend environment variables.

## Client Mapping Requirements

- [ ] Each pilot client is linked to the trainer in `trainer_clients`.
- [ ] Each pilot client has a WhatsApp phone number saved in a normalized format.
- [ ] The trainer confirms consent from each client before testing.
- [ ] Same phone under different trainers is treated as trainer-scoped: inbound routing resolves receiver `phone_number_id` first, then sender phone inside that trainer.
- [ ] Unknown inbound sender behavior is treated as safe failure/no incorrect client mapping.

## Manual Pilot Live Test Checklist

Run this only after the trainer credential is connected and the operator intentionally starts the live pilot.

- [ ] Send exactly one approved outbound template.
- [ ] Confirm the outbound `communication_logs` row has the correct trainer and client.
- [ ] Capture the provider message ID/wamid without exposing tokens.
- [ ] Confirm Meta status webhook updates `whatsapp_message_statuses`.
- [ ] Confirm `communication_logs` delivery/read status updates.
- [ ] Ask the client to send a non-food greeting.
- [ ] Confirm the greeting creates an inbound communication log and no food log.
- [ ] Ask the client to send a food message.
- [ ] Confirm the food message creates a food log under the correct trainer/client.
- [ ] Confirm calories/macros/parser result are stored when parsed.
- [ ] Confirm trainer review page and client profile show the new food log.
- [ ] Confirm no access token appears in browser, API response, logs, or screenshots.

## Evidence To Save

- [ ] Credential metadata only: trainer ID, phone_number_id, WABA/business ID, saved status, updated timestamp.
- [ ] Outbound communication log ID and wamid.
- [ ] Latest status rows for sent/delivered/read or failed with non-secret error metadata.
- [ ] Inbound greeting communication log ID.
- [ ] Food inbound communication log ID.
- [ ] Food log ID and nutrition summary.
- [ ] Dashboard/client profile/review visibility screenshots with no secrets.
- [ ] Any failure reason, without token values.

## Pass Criteria

- [ ] Trainer can sign in and see the dashboard.
- [ ] Settings shows manual WABA readiness and saved credential status without claiming live Meta validation.
- [ ] Trainer/client mapping is correct.
- [ ] Outbound template sends once and is logged.
- [ ] Status webhook correlates by wamid.
- [ ] Greeting is logged without creating a food log.
- [ ] Food message creates the correct food log.
- [ ] Trainer sees conversation, status, food log, and review state in the dashboard.
- [ ] No token is printed, exposed, committed, or returned to the browser.

## Block Criteria

- [ ] Missing trainer profile or active trainer-client link.
- [ ] Missing or disconnected WABA credential.
- [ ] Invalid phone_number_id or WABA/business ID.
- [ ] Missing approved/testable template.
- [ ] Webhook callback not configured for `/api/webhook/whatsapp`.
- [ ] Messages field not subscribed.
- [ ] Unknown or incorrectly mapped client phone.
- [ ] Any access token appears in browser/API/log output.
- [ ] Dashboard cannot show the saved WhatsApp-created data.

## Failure Handling

- Expired credential: stop live testing and use operator-assisted credential refresh.
- Missing credential: do not send; complete manual credential setup first.
- Webhook not firing: verify callback route and messages subscription before another send.
- Status not updating: inspect saved status rows and webhook logs before retrying.
- Food parser failure: confirm communication log exists, then handle the food log/review failure without retry loops.
- Unknown sender: do not create a wrong client mapping.
- Dashboard visibility issue: use saved DB rows to identify whether data was persisted or only hidden by UI.

## No-Token QA Status

The saved-data QA pass can be run without a valid Meta token. It should verify public messaging, dashboard readiness, client profile visibility, conversation/status visibility, report states, and token exposure boundaries. It must not call Meta APIs or send WhatsApp messages.
