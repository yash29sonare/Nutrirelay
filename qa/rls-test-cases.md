# NutriRelay RLS And Tenant Isolation Test Cases

These cases should run only in a dev or staging Supabase project with disposable users.

## RLS-001: Trainer Reads Own Client Mapping

- Create trainer A, client A, and a `trainer_clients` link.
- Authenticate as trainer A.
- Query own client mapping.
- Expected: trainer A can read only linked client rows.

## RLS-002: Trainer Cannot Read Another Trainer Client

- Create trainer A/client A and trainer B/client B.
- Authenticate as trainer A.
- Attempt to read client B mapping and profile via authenticated Supabase client.
- Expected: no row returned.

## RLS-003: Client Reads Own Profile

- Authenticate as client A.
- Query `profiles` for client A.
- Expected: own profile is visible.

## RLS-004: Client Cannot Read Another Client Profile

- Authenticate as client A.
- Query client B profile.
- Expected: no row returned unless trainer-client policy legitimately links the user.

## RLS-005: Service-Role Path Requires App Ownership Check

- Call a trainer API for a client not linked to the authenticated trainer.
- Expected: 404 or authorization failure from application ownership checks.
- Note: service-role DB access bypasses RLS, so this test must validate route-level checks.

## RLS-006: WhatsApp Credential Not Browser-Readable

- Authenticate as a trainer in browser.
- Attempt direct client-side read of `trainer_waba_credentials`.
- Expected: no secret access. UI may show masked metadata only through server-rendered/API-safe surfaces.

## RLS-007: WhatsApp Inbound Tenant Resolution

- Create two connected WABA credentials with different `phone_number_id` values.
- Send a mock inbound queue envelope for trainer A's receiver ID and client phone.
- Expected: tenant resolver maps only inside trainer A scope.
