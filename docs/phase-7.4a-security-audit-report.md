# FORTRESS FITNESS — PHASE 7.4A SECURITY & ARCHITECTURE AUDIT REPORT

---

## 1. Executive Summary

This audit inspected the entire Fortress Fitness backend — 27 database tables, 14 migration files, 12 API routes, 30+ service files, 4 Mastra workflows, 5 agent tools, auth middleware, and RLS policy layer. The codebase demonstrates a clear understanding of multi-tenant architecture and ownership chains in its design intent. However, **critical gaps in authentication enforcement, cross-tenant isolation, and architectural consistency** mean the system is not production-ready for multi-tenant operation.

**The audit verdict is: REQUIRES CHANGES.**

Two critical cross-tenant data exposure vulnerabilities were found (compliance and report queries accept no `trainer_id` at all). Every `/api/trainer/*` route trusts a caller-supplied `trainer_id` with zero authentication — any attacker who discovers a valid trainer ID can access all that trainer's data. The architecture suffers from a **dual identity path** (`profiles.id` vs `trainers.trainer_id`) that will cause foreign key violations at runtime in the audit log system. No server-side plan or entitlement enforcement exists anywhere.

---

## 2. Authentication Audit

### 2.1 Authentication Flow

The codebase uses Supabase Auth (email/password) via three client patterns:
- **ANON key clients** (`@supabase/ssr`) — cookie-based, for browser/server components requiring session context
- **SERVICE-ROLE key clients** (`@supabase/supabase-js`) — bypasses RLS, used in 30+ backend files
- **Direct `Pool` (pg)** — used in WhatsApp pipeline workflow (bypasses Supabase entirely)

### 2.2 Middleware

| Item | Status | Evidence |
|------|--------|----------|
| Middleware exists | YES — `src/middleware.ts` | Delegates to `src/utils/supabase/middleware.ts` |
| Protects dashboard routes | YES | Redirects unauthenticated from `/dashboard/*` to `/login` |
| Protects login/register | YES | Redirects authenticated away from `/login` and `/register` |
| Uses `getUser()` not `getSession()` | YES | Correct — server-side JWT validation |
| Excludes `/api/*` | YES — **intentional but problematic** | Matcher: `/((?!_next/static|_next/image|favicon.ico|api/).*)` |

### 2.3 Authentication Gaps

**CRITICAL — No auth on any `/api/trainer/*` route:**
Every API route under `/api/trainer/` accepts a caller-supplied `trainer_id` from query parameters or request body with zero session validation. The middleware explicitly excludes API routes. Since these routes also use service-role clients (bypassing RLS), the only authorization is whatever manual ownership checks exist in the service layer — and several critical checks are missing.

**Files affected:**
- `src/app/api/trainer/clients/route.ts`
- `src/app/api/trainer/clients/[clientId]/route.ts`
- `src/app/api/trainer/clients/[clientId]/goals/route.ts`
- `src/app/api/trainer/clients/[clientId]/compliance/route.ts`
- `src/app/api/trainer/clients/[clientId]/timeline/route.ts`
- `src/app/api/trainer/clients/[clientId]/workouts/route.ts`
- `src/app/api/trainer/clients/[clientId]/communications/route.ts`
- `src/app/api/trainer/photos/pending/route.ts`
- `src/app/api/trainer/meals/route.ts`
- `src/app/api/trainer/automations/route.ts`
- `src/app/api/trainer/reports/route.ts`

**CRITICAL — Dashboard page cannot authenticate the user:**
`src/app/dashboard/page.tsx` (lines 9-14, 57-59) creates a service-role `createClient` and calls `supabase.auth.getUser()`. The service-role client does NOT read browser cookies — it does not carry the user's session context. `user` is always `null`, so `trainerId` is always `null`, and the page always shows "Sign in to view your client roster" even when authenticated.

**No auth callback route:**
The register page uses `supabase.auth.signUp()` and displays "check your email", but there is no `/auth/callback` route to handle the Supabase email confirmation redirect. Email confirmation links from Supabase will fail.

### 2.4 Summary

| Metric | Status |
|--------|--------|
| Authentication middleware | Functional for UI routes; disabled for API routes |
| Session validation pattern | Correct (`getUser()` not `getSession()`) |
| Dashboard auth | **BROKEN** — uses service-role key for auth |
| API route auth | **NONE** — no session validation on any `/api/*` route |
| Cron auth | Secure — CRON_SECRET (Bearer or query param) |
| Webhook auth | Secure in production; **bypassed in non-production** |

---

## 3. Authorization Audit

### 3.1 Route-Level Authorization

Every `/api/trainer/*` route has **zero authorization** at the route level. The `trainer_id` parameter is accepted from caller input and used to query data directly. The only authorization comes from manual ownership checks in the underlying service functions — but several critical service functions lack these checks entirely.

### 3.2 Server Action Authorization

Three dashboard server actions exist with correct authorization patterns:
- `src/app/dashboard/roster/actions.ts` — validates session via `getUser()`, then uses service-role for DB
- `src/app/dashboard/queue/actions.ts` — same pattern
- `src/app/dashboard/voice-notes/actions.ts` — same pattern

### 3.3 Service-Level Authorization Gaps

| Function | File | Gap | Severity |
|----------|------|-----|----------|
| `getDailyNutrition` | `src/lib/dashboard-reads.ts` | No `trainer_id` parameter at all | CRITICAL |
| `getWeeklyNutrition` | `src/lib/dashboard-reads.ts` | No `trainer_id` parameter at all | CRITICAL |
| `getMonthlyNutrition` | `src/lib/dashboard-reads.ts` | No `trainer_id` parameter at all | CRITICAL |
| `getClientCompliance` | `src/lib/dashboard-reads.ts` | No `trainer_id` parameter at all | CRITICAL |
| `getClientReports` | `src/lib/dashboard-reads.ts` | No `trainer_id` parameter at all | CRITICAL |
| `viewComplianceHistory` | `src/lib/operations/compliance-override.ts` | No `trainer_id` parameter at all | CRITICAL |
| `calculateCompliance` | `src/lib/compliance-engine.ts` | `trainer_id` accepted but never validated | HIGH |
| `overrideCompliance` | `src/lib/operations/compliance-override.ts` | No ownership check | HIGH |
| `removeOverride` | `src/lib/operations/compliance-override.ts` | No ownership check | HIGH |
| `logCommunication` | `src/lib/communication-logger.ts` | `trainer_id` is nullable, no validation | HIGH |
| `writeAuditLog` | `src/lib/operations/audit.ts` | Accepts any `trainer_id` | HIGH |
| `createGoal` | `src/lib/operations/goal-management.ts` | No trainer-client ownership check | MEDIUM |

### 3.4 Summary

| Metric | Status |
|--------|--------|
| Route-level auth | NONE — all `/api/trainer/*` routes lack auth |
| Data-level authorization | INCONSISTENT — 29 functions check ownership, 11 do not |
| Session validation | Correct in server actions, absent in API routes |
| Plan/entitlement enforcement | NONE — no server-side plan checks exist |

---

## 4. Tenant Isolation Audit

### 4.1 Cross-Tenant Access Vectors

**Vector 1: Compliance data — NO ownership check**
`src/lib/dashboard-reads.ts:getClientCompliance()` queries `client_compliance_snapshots` by `client_id` only. `/api/trainer/clients/[clientId]/compliance` calls this without any `trainer_id` validation. Any caller can read any client's compliance score by guessing or enumerating client IDs.

**Vector 2: Reports data — NO ownership check**
`src/lib/dashboard-reads.ts:getClientReports()` queries `weekly_reports` and `monthly_reports` by `client_id` only. `/api/trainer/reports?client_id=X` exposes any client's full report history.

**Vector 3: Nutrition data — NO ownership check**
`getDailyNutrition()`, `getWeeklyNutrition()`, `getMonthlyNutrition()` in `dashboard-reads.ts` all query `food_logs` by `client_id` only. These functions are not exposed through any API route, but the service functions themselves have no tenant guard.

**Vector 4: Compliance history — NO ownership check**
`src/lib/operations/compliance-override.ts:viewComplianceHistory()` queries `audit_logs` by `entity_id=clientId` with no `trainer_id`. Exposed via `/api/trainer/clients/[clientId]/compliance?history=true`.

**Vector 5: Compliance engine — NO ownership check**
`src/lib/compliance-engine.ts:calculateCompliance()` queries `food_logs` by `clientId` only and accepts a caller-supplied `trainer_id` for the insert target with zero validation. Any caller can calculate and persist compliance scores for any client.

### 4.2 Isolation Mechanisms That DO Work

**Pattern A — `trainer_clients` cross-check (10+ functions):**
Used by `client-timeline.ts`, `workout-management.ts`, `dashboard-reads.ts` (2 functions), and the lifecycle service. Verifies the trainer-client relationship exists before proceeding.

**Pattern B — Row-level `trainer_id` comparison (8+ functions):**
Used by `automation-management.ts`, `goal-management.ts` (3 of 4), `meal-review.ts`, `photo-verification.ts`. Fetches the row, then compares its `trainer_id` against the caller-supplied `trainer_id`.

**Pattern C — Query-scoped filtering (3 functions):**
`getTrainerClientSummaries()`, `getPendingPhotos()`, `getActiveClientCount()` — the query itself filters by `trainer_id`.

### 4.3 Summary

| Vector | Isolation | Exploitable | Severity |
|--------|-----------|-------------|----------|
| Compliance data | NONE | YES — any client_id accessible | CRITICAL |
| Reports data | NONE | YES — any client_id accessible | CRITICAL |
| Nutrition data | NONE | YES (via service function) | CRITICAL |
| Compliance history | NONE | YES (via API) | CRITICAL |
| Compliance engine | NONE | YES — caller-supplied trainer_id trusted | HIGH |
| Client details | QUERY-SCOPED | NO — filters by trainer_id | LOW |
| Goals (via API) | ROW-LEVEL | NO — 3 of 4 check trainer_id | LOW |
| Workouts | TRAINER_CLIENTS | NO — cross-check before ops | LOW |
| Meals/photos | ROW-LEVEL | NO — trainer_id compared | LOW |
| Timeline | TRAINER_CLIENTS | NO — verifyAccess before query | LOW |

---

## 5. RLS Audit

### 5.1 Table Coverage

All 27 tables have `ROW LEVEL SECURITY` enabled. No table is missing RLS.

### 5.2 Policy Quality

| Assessment | Count | Details |
|-----------|-------|---------|
| Tables with RLS | 27/27 | 100% coverage |
| Policies using `auth.uid()` correctly | 11 tables | Owner/tenant checks |
| Policies using subquery traversal | 6 tables | `meal_slots`, `subscriptions`, `upi_payments`, `voice_notes`, `strike_log`, `weekly_reports` — verify via `trainer_clients` join |
| Service-role-only tables | 7 tables | `trainers`, `plans`, `payment_reviews`, `whatsapp_connections`, `audit_logs`, `notifications`, `incoming_webhook_logs`, `client_lifecycle` |
| Deprecated `auth.role()` usage | 0 (in production) | 10 temp policies properly dropped by migration 03 |
| `security_invoker` on views | 1/1 | `dashboard_client_summaries` with `security_invoker = true` |
| UPDATE policies with both USING and WITH CHECK | All | Compliant |

### 5.3 RLS Gaps

**Gap 1 — 7 tables inaccessible to authenticated users via PostgREST API:**
- `public.trainers` — service_role only (trainer cannot read own row)
- `public.plans` — service_role only (plans catalog invisible to API)
- `public.payment_reviews` — service_role only
- `public.whatsapp_connections` — service_role only
- `public.notifications` — service_role only
- `public.client_lifecycle` — service_role only
- `public.incoming_webhook_logs` — service_role only

This may be intentional if all these tables are accessed through service-role middleware. However, it means the PostgREST API cannot serve these tables directly to authenticated users. All access must go through the service-role operations layer — which is the current design, but with the auth gaps noted in Section 2.

**Gap 2 — `subscriptions` naming conflict (CRITICAL):**
Migration `07A` attempts `CREATE TABLE IF NOT EXISTS subscriptions` with a `trainer_id` FK to `public.trainers`, but the table already exists from migration `02` with `client_id` FK to `public.profiles`. The `IF NOT EXISTS` silently skips the 07A schema. The old table retains `client_id`, `tier_type`, `start_date`/`end_date`. Any code expecting the 07A schema (trainer-billed subscriptions with plan references) will fail at runtime. The new `subscriptions` policies from 07A apply to the old table, which is harmless (service-role all) but misleading.

### 5.4 RLS Summary

| Metric | Score |
|--------|-------|
| Tables with RLS | 27/27 (100%) |
| auth.uid() in policies | Used correctly in all authenticated policies |
| auth.role() in production | Not used (temp policies properly dropped) |
| security_invoker | Used on the one view |
| UPDATE policies | All have USING + WITH CHECK |
| Explicit deny policies | audit_logs (UPDATE + DELETE) — append-only enforced |
| Service-role-only tables | 7 (intentional) |
| Subscription schema conflict | 1 (critical — silent schema skip) |

---

## 6. API Audit

### 6.1 Complete Route Table

| Route | Methods | Auth | Ownership Validation | trainer_id Source | Risk |
|-------|---------|------|---------------------|-------------------|------|
| `/api/cron` | GET, POST | CRON_SECRET | N/A (system) | N/A | LOW |
| `/api/webhook/whatsapp` | GET | WHATSAPP_VERIFY_TOKEN | N/A (Meta) | N/A | LOW |
| `/api/webhook/whatsapp` | POST | HMAC (skipped in dev) | N/A (Meta) | N/A | MEDIUM |
| `/api/webhooks/whatsapp` | GET, POST | None (410 Gone) | N/A | N/A | LOW |
| `/api/trainer/clients` | GET | **NONE** | **NONE** | Query param | **CRITICAL** |
| `/api/trainer/clients` | POST | **NONE** | **NONE** | Body | **CRITICAL** |
| `/api/trainer/clients/[id]` | GET | **NONE** | VIA SERVICE | Query param | **CRITICAL** |
| `/api/trainer/clients/[id]` | PATCH | **NONE** | VIA SERVICE | Body | **CRITICAL** |
| `/api/trainer/clients/[id]/goals` | GET | **NONE** | VIA SERVICE | Query param | **CRITICAL** |
| `/api/trainer/clients/[id]/goals` | POST | **NONE** | VIA SERVICE | Body | **CRITICAL** |
| `/api/trainer/clients/[id]/compliance` | GET | **NONE** | **NONE** | Query param | **CRITICAL** |
| `/api/trainer/clients/[id]/compliance` | POST | **NONE** | **NONE** | Body | **CRITICAL** |
| `/api/trainer/clients/[id]/timeline` | GET | **NONE** | VIA SERVICE | Query param | **CRITICAL** |
| `/api/trainer/clients/[id]/workouts` | POST | **NONE** | VIA SERVICE | Body | **CRITICAL** |
| `/api/trainer/clients/[id]/communications` | GET | **NONE** | VIA SERVICE | Query param | **CRITICAL** |
| `/api/trainer/photos/pending` | GET | **NONE** | VIA SERVICE | Query param | **CRITICAL** |
| `/api/trainer/photos/pending` | POST | **NONE** | VIA SERVICE | Body | **CRITICAL** |
| `/api/trainer/meals` | POST | **NONE** | VIA SERVICE | Body | **CRITICAL** |
| `/api/trainer/automations` | GET | **NONE** | VIA SERVICE | Query param | **CRITICAL** |
| `/api/trainer/automations` | POST | **NONE** | VIA SERVICE | Body | **CRITICAL** |
| `/api/trainer/reports` | GET | **NONE** | **NONE** (client_id path) | Query param | **CRITICAL** |

### 6.2 Key Findings

**Finding 6.2.1 — No API authentication (ALL /api/trainer/* routes):**
Every trainer API route accepts `trainer_id` from caller input with zero session validation. The middleware explicitly excludes `/api/*`. Service-role clients bypass RLS. This means:
- An attacker who discovers one valid `trainer_id` has full access to all that trainer's data
- `trainer_id` values could be enumerated via timing attacks, data leaks, or social engineering
- There is no proof the caller IS the trainer they claim to be

**Finding 6.2.2 — Compliance route has zero ownership validation:**
`/api/trainer/clients/[clientId]/compliance` calls `getClientCompliance(clientId)` and `viewComplianceHistory(clientId)` — neither accepts or validates a `trainer_id`. Any caller can access any client's compliance data and history.

**Finding 6.2.3 — Reports route with client_id has zero ownership validation:**
`/api/trainer/reports?client_id=X` calls `getClientReports(clientId)` with no ownership cross-check.

---

## 7. Repository Audit

### 7.1 Service Files — Ownership Validation Table

All findings from the deep inspection of `src/lib/` and `src/lib/operations/`:

| File | Accepts trainer_id? | Validates? | Risk |
|------|---------------------|------------|------|
| `communication-logger.ts` | YES (nullable) | NO | HIGH |
| `client-context.ts` | NO (resolves internally) | N/A | LOW |
| `dashboard-reads.ts` (2 of 7 fns) | YES | YES | LOW |
| `dashboard-reads.ts` (5 of 7 fns) | NO | NO | **CRITICAL** |
| `compliance-engine.ts` | YES | NO | HIGH |
| `operations/audit.ts` | YES | NO | HIGH |
| `operations/client-lifecycle.ts` (5 fns) | YES | YES | LOW |
| `operations/automation-management.ts` (5 fns) | YES | YES | LOW |
| `operations/goal-management.ts` (3 of 4 fns) | YES | YES | LOW |
| `operations/goal-management.ts` (createGoal) | YES | NO | MEDIUM |
| `operations/compliance-override.ts` (2 fns) | YES | NO | HIGH |
| `operations/compliance-override.ts` (viewHistory) | NO | NO | **CRITICAL** |
| `operations/client-timeline.ts` | YES | YES | LOW |
| `operations/meal-review.ts` (5 fns) | YES | YES | LOW |
| `operations/photo-verification.ts` (3 fns) | YES | YES | LOW |
| `operations/workout-management.ts` (4 fns) | YES | YES | LOW |

### 7.2 Key Findings

**Finding 7.2.1 — 6 functions with no `trainer_id` parameter:**
Five functions in `dashboard-reads.ts` (`getDailyNutrition`, `getWeeklyNutrition`, `getMonthlyNutrition`, `getClientCompliance`, `getClientReports`) and one in `compliance-override.ts` (`viewComplianceHistory`) simply accept a `clientId` and return data for that client. No caller needs to prove ownership of the client. This makes these functions impossible to use securely in a multi-tenant context.

**Finding 7.2.2 — `logCommunication` accepts nullable `trainer_id`:**
`src/lib/communication-logger.ts:logCommunication()` accepts `trainer_id: string | null`. Not only is there no ownership validation, the trainer ID is optional — allowing orphaned communication records.

**Finding 7.2.3 — `writeAuditLog` has no authorization:**
`src/lib/operations/audit.ts:writeAuditLog()` inserts whatever `trainer_id` the caller provides. The audit log is a trust-based system — it records what happened but cannot verify who authorized it.

---

## 8. Dashboard Audit

### 8.1 Route-Level Findings

The dashboard pages (`/dashboard/*`) are protected by middleware (redirects unauthenticated users to `/login`). Server actions use the correct session-validation pattern.

However, the dashboard RSC page at `src/app/dashboard/page.tsx` is **broken** — it uses a service-role client to call `auth.getUser()`, which always returns `null` on service-role clients. The page cannot authenticate the user and always shows an empty state.

### 8.2 Data Exposure

Dashboard pages render data fetched through service-role clients. The data is assembled server-side and sent to the client as rendered HTML/JSON. An authenticated user's browser receives only the data they are authorized to see (because the server validates ownership before fetching). However, if the ownership checks fail (as documented in Section 4), a malicious authenticated user could craft requests to the underlying API or server actions to access another trainer's data.

### 8.3 Existing Dashboard APIs

The `/api/trainer/*` routes provide programmatic access to dashboard data. Without auth, these are direct cross-tenant exposure vectors.

---

## 9. Entitlement Audit

### 9.1 Current State

| Entitlement Mechanism | Status | Evidence |
|----------------------|--------|----------|
| `plans` table seeded | EXISTS (dead code) | STARTER (10 clients), PRO (50), ELITE (250) |
| `trainers.max_clients` column | EXISTS (never read) | Never checked before client operations |
| `trainers.subscription_plan` column | EXISTS (never read) | Never queried in any .ts file |
| `plans.feature_flags` | EXISTS (never queried) | Never read in any .ts file |
| Plan enforcement in `inviteClient` | **NONE** | `getActiveClientCount()` runs but result is unused |
| Plan enforcement in `createAutomation` | **NONE** | All operations proceed regardless |
| Plan enforcement in `createGoal` | **NONE** | No plan check |
| Feature gating | **NONE** | No feature_flag check anywhere |

### 9.2 Critical Finding — No Server-Side Enforcement

Despite a complete `plans` catalog seeded with tier names, max client limits, and JSONB `feature_flags`, **no TypeScript code anywhere reads these values for enforcement.**

The closest is `client-lifecycle.ts:getActiveClientCount()` which counts active clients but **never compares the count against any limit**:

```typescript
// src/lib/operations/client-lifecycle.ts:20-28
async function getActiveClientCount(trainerId: string): Promise<number> {
  const db = getDb()
  const { count } = await db
    .from("client_lifecycle")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", trainerId)
    .in("status", ["ACTIVE", "INVITED"])
  return count ?? 0
}
```

This function is called by `inviteClient` (line 44) but the return value is never compared against any cap. Similarly, no plan check exists anywhere for automation, goal, or report features.

---

## 10. Service Role Audit

### 10.1 Scope of Service-Role Usage

The service-role key is used in **41 files** across the codebase. Every file in `src/lib/`, `src/lib/operations/`, `src/lib/automation/`, `src/lib/whatsapp/`, `src/mastra/tools/`, `src/mastra/workflows/`, `src/app/dashboard/` (pages and actions), `src/app/api/` (all routes), `src/workers/`, `src/services/`, and `src/trigger/` uses the service-role key.

### 10.2 Appropriate Usage

| Context | Appropriate? | Reason |
|---------|-------------|--------|
| Background cron jobs | YES | No user session available; runs on schedule |
| Queue workers | YES | Processes PGMQ messages; no user context |
| Mastra workflows | YES | AI processing pipeline; needs broad access |
| Mastra agent tools | YES | AI tool execution; needs DB access |
| `src/lib/operations/*` | **DEBATABLE** | These implement the authorization layer themselves. If ownership checks are correct, service-role is fine. But if a check is missing, there is no RLS safety net. |
| `/api/trainer/*` routes | **PROBLEMATIC** | User-facing API with no session validation + service-role = any caller can do anything with any trainer's data |
| Dashboard server actions | **DEBATABLE** | Session is validated, then service-role is used for DB. Pattern is secure IF session validation is correct. |
| Dashboard page | **BUG** | Uses service-role client just to call `auth.getUser()` — which always returns null on service-role |

### 10.3 Key Risk

The codebase relies entirely on manual application-layer ownership checks for tenant isolation. RLS is effectively bypassed by the pervasive use of service-role clients. This means:
- Every ownership check must be correct — there is no database safety net
- Any missed check (and there are 11 documented above) creates a cross-tenant data exposure
- The service-role key, if leaked, gives full database access

---

## 11. Security Findings

### 11.1 Critical Issues

1. **No authentication on any /api/trainer/* route** (Files: all 11 route files under `src/app/api/trainer/`)
   - What: All trainer API routes accept `trainer_id` from user input without session validation
   - Why: Any caller can impersonate any trainer by providing their ID
   - Exploitable: YES — trivially
   - Cross-tenant: YES — complete cross-tenant access
   - Production readiness: blocker

2. **Compliance and report queries have no `trainer_id` parameter** (Files: `src/lib/dashboard-reads.ts` lines 164-315, `src/lib/operations/compliance-override.ts` lines 82-99)
   - What: `getClientCompliance(clientId)`, `getClientReports(clientId)`, `viewComplianceHistory(clientId)` accept only `clientId` with no ownership context
   - Why: Any valid client UUID can be used to read that client's compliance and report data
   - Exploitable: YES — enumerate client IDs
   - Cross-tenant: YES — any client across any trainer
   - Production readiness: blocker

3. **Dual identity path — `profiles.id` vs `trainers.trainer_id`** (All Phase 7.1A migrations + all operations files)
   - What: The `audit_logs` table FK references `trainers.trainer_id`, but every `writeAuditLog()` call passes `profiles.id` (auth UID). The same pattern affects `subscriptions`, `payment_reviews`, `whatsapp_connections`, and `notifications` tables
   - Why: Foreign key violations at runtime; broken data model; trainer records cannot be properly linked
   - Exploitable: N/A (runtime failure, not security bypass)
   - Cross-tenant: N/A
   - Production readiness: blocker

### 11.2 Medium Issues

4. **Webhook signature verification skipped in non-production** (File: `src/app/api/webhook/whatsapp/route.ts`)
   - What: `if (process.env.NODE_ENV !== "production")` skips HMAC check
   - Why: Any staging/preview deployment accepts unauthenticated webhook payloads
   - Exploitable: YES — in non-production environments
   - Cross-tenant: Indirect (can inject messages into the queue)

5. **Phone numbers logged to console** (Files: `renewal-engine.ts`, `meal-nudges.ts`, `ghosting-daemon.ts`)
   - What: `console.log("[...] sent to ${phone}")` — phone numbers are PII
   - Why: GDPR/DPDP Act compliance risk; production log exposure
   - Exploitable: Through log aggregation systems
   - Cross-tenant: YES — logs contain trainer-client phone pairs

6. **`subscriptions` naming conflict (migration 02 vs 07A)** (File: `20260625102000_07A_subscriptions_payment_reviews.sql`)
   - What: `CREATE TABLE IF NOT EXISTS subscriptions` silently fails; 07A schema never created
   - Why: The intended trainer-billed subscription model cannot work; code expects old schema
   - Exploitable: N/A
   - Cross-tenant: N/A

7. **Two WABA credential tables with different FK targets** (Files: `trainer_waba_credentials` vs `whatsapp_connections`)
   - What: Old table references `profiles.id`; new table references `trainers.trainer_id`
   - Why: Same purpose, different identity paths — migration required
   - Exploitable: N/A
   - Cross-tenant: N/A

8. **Audit logging missing for 10+ sensitive operations** (Files: `roster/actions.ts`, `queue/actions.ts`, `voice-notes/actions.ts`, `renewal-engine.ts`, `ghosting-daemon.ts`, `compliance-batch.ts`)
   - What: `toggleActiveStatus()`, `unlinkClientFromRoster()`, `approvePayment()`, `rejectPayment()`, `renewSubscriptionAfterPayment()`, strike creation, compliance batch runs have no audit trail
   - Why: Missing accountability for trainer-sensitive actions
   - Exploitable: N/A (compliance gap, not security bypass)
   - Cross-tenant: N/A

### 11.3 Low Issues

9. **Deprecated webhook route exists** (File: `src/app/api/webhooks/whatsapp/route.ts`)
   - What: Returns 410 Gone, but the route still exists and could be confused with the active one
   - Why: Potential confusion during deployment; undocumented duplicate

10. **39+ `as any` casts in Mastra workflows** (Files: `whatsappPipeline.ts`, `recovery.ts`, `poll.ts`, `message.ts`, `subscriptionVerifier.ts`, `strikeEnforcer.ts`, `queueConsumer.ts`)
    - What: Complete type-safety bypass in all workflow chain calls
    - Why: Runtime errors that could have been caught at compile time
    - Exploitable: N/A (internal code quality)

11. **Dashboard page cannot authenticate** (File: `src/app/dashboard/page.tsx`)
    - What: Uses service-role client for `auth.getUser()` — always null
    - Why: Dashboard always shows empty state even when authenticated
    - Exploitable: N/A (functional bug, not security bypass)

---

## 12. Critical Issues

### Issue C1: No authentication on any /api/trainer/* route
- **Severity:** Critical
- **File:** All 11 files under `src/app/api/trainer/`
- **What is wrong:** Zero session validation. Middleware excludes `/api/*`. Service-role client bypasses RLS. `trainer_id` accepted from caller input.
- **Why it matters:** Any attacker who discovers a trainer ID can access all that trainer's data — clients, goals, workouts, meals, photos, compliance, reports, automations, communications.
- **Tenant boundary affected:** Complete cross-tenant access.
- **Exploitable:** Yes — trivially. Pass `?trainer_id=<valid-uuid>` to any endpoint.
- **Production readiness:** Blocker.

### Issue C2: Compliance and report queries lack tenant isolation
- **Severity:** Critical
- **Files:** `src/lib/dashboard-reads.ts` (lines 164-315): `getClientCompliance()`, `getClientReports()` — also `src/lib/operations/compliance-override.ts` (lines 82-99): `viewComplianceHistory()`
- **What is wrong:** These functions accept only `client_id` with no `trainer_id` parameter. Any caller can read any client's compliance scores, report history, and compliance override history.
- **Why it matters:** Compliance data includes risk scores and trainer adjustments — it is sensitive business data.
- **Tenant boundary affected:** Complete cross-tenant data access.
- **Exploitable:** Yes — via the API routes that expose these functions.
- **Production readiness:** Blocker.

### Issue C3: Dual identity path — profiles.id vs trainers.trainer_id
- **Severity:** Critical
- **Files:** `20260625103000_07A_whatsapp_connections_audit_notify.sql` (audit_logs FK), `20260625102000_07A_subscriptions_payment_reviews.sql`, `20260625101000_07A_trainers_plans_base.sql`, and all `src/lib/operations/*.ts` files that call `writeAuditLog()` with `profiles.id`
- **What is wrong:** The `audit_logs` table FK references `trainers.trainer_id`, but all code passes `profiles.id` (auth UID). These are different UUIDs. The FK was added with `NOT VALID` which prevents runtime crashes, but the relationship is logically broken. The same split affects `subscriptions`, `payment_reviews`, `whatsapp_connections`, and `notifications`.
- **Why it matters:** The audit log cannot be reliably joined to trainer records. The trainer billing model (Phase 7.1A tables) is disconnected from the operational tables (Phase 1-7.3 tables). A future migration that validates the FK will break all existing audit records.
- **Tenant boundary affected:** Architectural — the trainer identity model is fractured.
- **Exploitable:** No — but it causes silent data integrity loss.
- **Production readiness:** Blocker.

### Issue C4: No server-side plan/entitlement enforcement
- **Severity:** Critical
- **Files:** `src/lib/operations/client-lifecycle.ts` (getActiveClientCount returns but result unused), entire codebase (no plan checks exist anywhere)
- **What is wrong:** Despite a complete `plans` catalog (STARTER=10 clients, PRO=50, ELITE=250) with `feature_flags`, `trainers.max_clients`, and `trainers.subscription_plan`, zero code enforces these limits. A STARTER trainer can invite unlimited clients.
- **Why it matters:** The business model cannot be enforced. Any paying trainer is treated identically to a free-tier trainer. Features cannot be gated.
- **Tenant boundary affected:** Business logic — the plan tier is meaningless.
- **Exploitable:** Yes — any trainer can exceed plan limits.
- **Production readiness:** Blocker.

---

## 13. Medium Issues

### Issue M1: Webhook HMAC verification skipped outside production
- **Severity:** Medium
- **File:** `src/app/api/webhook/whatsapp/route.ts` (lines 51-63)
- **Tenant boundary:** WhatsApp pipeline — unauthorized webhook injection possible in non-prod

### Issue M2: Phone numbers logged to console
- **Severity:** Medium
- **Files:** `renewal-engine.ts:124,173`, `meal-nudges.ts:135`, `ghosting-daemon.ts:113`
- **Tenant boundary:** PII exposure — trainer-client relationships exposed in logs

### Issue M3: `subscriptions` naming conflict (migration 02 vs 07A)
- **Severity:** Medium
- **File:** `20260625102000_07A_subscriptions_payment_reviews.sql`
- **Tenant boundary:** Schema drift — new subscription model cannot be realized

### Issue M4: Two WABA credential tables, different FK targets
- **Severity:** Medium
- **Files:** `trainer_waba_credentials` (FK → profiles.id), `whatsapp_connections` (FK → trainers.trainer_id)
- **Tenant boundary:** WhatsApp identity duplicated across incompatible tables

### Issue M5: Audit logging missing for 10+ sensitive operations
- **Severity:** Medium
- **Files:** `roster/actions.ts`, `queue/actions.ts`, `voice-notes/actions.ts`, `renewal-engine.ts`, `ghosting-daemon.ts`, `compliance-batch.ts`
- **Tenant boundary:** Non-repudiation gap — trainer actions lack audit trail

### Issue M6: `logCommunication` accepts nullable `trainer_id`
- **Severity:** Medium
- **File:** `src/lib/communication-logger.ts` (line 7)
- **Tenant boundary:** Communication records may lack ownership — orphaned rows possible

### Issue M7: `calculateCompliance` does not validate trainer-client relationship
- **Severity:** Medium
- **File:** `src/lib/compliance-engine.ts` (lines 36-71)
- **Tenant boundary:** Any caller can compute compliance for any client with any trainer_id

---

## 14. Low Issues

### Issue L1: Deprecated webhook route at /api/webhooks/whatsapp (plural)
- **File:** `src/app/api/webhooks/whatsapp/route.ts`

### Issue L2: 39+ `as any` casts in workflows and tools
- **Files:** `whatsappPipeline.ts`, `recovery.ts`, `poll.ts`, `message.ts`, `subscriptionVerifier.ts`, `strikeEnforcer.ts`, `queueConsumer.ts`

### Issue L3: Dashboard page uses service-role for auth.getUser()
- **File:** `src/app/dashboard/page.tsx` (lines 9-13, 57-59)

### Issue L4: Dashboard view/type schema misalignment
- **File:** `src/types/dashboard.ts` vs view definition

### Issue L5: Meta API error responses logged without sanitization
- **File:** `src/lib/whatsapp/send.ts` (line 153-154), `src/services/whatsappOutbound.ts` (line 33)

---

## 15. Recommended Improvements

1. **Add session validation middleware to `/api/*` routes:** Create a shared auth helper for API routes that reads and validates the Supabase session cookie/JWT before processing. Do NOT accept `trainer_id` from caller input — resolve the trainer identity from the authenticated session.

2. **Add `trainer_id` parameter + ownership check to 6 tenant-blind functions:** Fix `getClientCompliance()`, `getClientReports()`, `viewComplianceHistory()`, `getDailyNutrition()`, `getWeeklyNutrition()`, `getMonthlyNutrition()` to require and validate `trainer_id`.

3. **Resolve the dual identity path:** Either migrate all tables to reference `profiles.id` (and drop the `trainers` table as redundant), or migrate all early tables to reference `trainers.trainer_id`. The `audit_logs` table must use the same identity system as the calling code.

4. **Implement plan enforcement:** In `inviteClient()`, compare active client count against the trainer's plan's `max_clients`. In automation and feature-gated operations, check `feature_flags`.

5. **Add audit logging to all missing operations:** Roster changes, payment actions, voice note operations, subscription renewals, ghost strikes, and compliance batch runs should all produce audit events.

6. **Remove webhook signature bypass for non-production:** Use a staging-specific webhook secret rather than skipping verification entirely. Or require at minimum a shared secret in all environments.

7. **Add a `trainer_id` parameter to `logCommunication` and make it required:** Remove the nullable union type and validate the trainer-client relationship before inserting.

8. **Add `trainer_id` validation to `calculateCompliance`:** Verify the client belongs to the trainer before computing compliance.

---

## 16. Overall Security Score

**Score: 52/100**

Deductions:
- -20 for no API authentication (all /api/trainer/* routes exposed)
- -10 for compliance/report tenant-blind functions
- -8 for dual identity path (architectural fracture)
- -5 for no plan entitlement enforcement
- -3 for webhook bypass in non-production
- -2 for phone number logging (PII exposure)

---

## 17. Multi-Tenant Architecture Score

**Score: 55/100**

Deductions:
- -15 for dual identity path (trainers.trainer_id vs profiles.id)
- -10 for 6 tenant-blind service functions
- -10 for subscription schema conflict
- -5 for two WABA credential tables with different FK targets
- -5 for no plan/entitlement enforcement

The codebase correctly models trainer-owned resources in its table design and RLS policies. The application-layer operations layer implements ownership checks for most functions. However, the dual identity path fractures the tenant model at the architectural level, and the missed ownership checks create exploitable cross-tenant data access paths.

---

## 18. Production Readiness Score

**Score: 45/100**

Key blockers:
1. `audit_logs` FK references `trainers.trainer_id` but all code passes `profiles.id` — will fail if FK validated
2. No API authentication — any discovery of a single `trainer_id` gives full system access
3. Compliance/report client data can be read by anyone who knows a client ID
4. No plan enforcement — business model cannot function
5. Dashboard page cannot render (auth bug)
6. Subscription schema conflict means the Phase 7.1A billing model is stillborn

---

## 19. Final Verdict

**REQUIRES CHANGES**

The codebase demonstrates sound architectural intent but has multiple critical security and architecture gaps that prevent production deployment in a multi-tenant environment. The two most critical issues — no API authentication and tenant-blind compliance/report functions — create direct cross-tenant data exposure vulnerabilities. The dual identity path is an architectural blocker that prevents proper trainer identity management.

Phase 7.4A is **incomplete** — Phase 7 cannot be marked complete until:
1. API authentication is added to all `/api/trainer/*` routes (session validation)
2. 6 tenant-blind functions are fixed (trainer_id parameter + ownership check)
3. The dual identity path is resolved (audit_logs FK vs code behavior)
4. Plan entitlement enforcement is implemented

---

## 20. Phase 7 Completion Status

**Phase 7.4A incomplete; Phase 7 is not yet complete.**

Required Phase 7 completion criteria:
| Criteria | Status |
|----------|--------|
| Task 0-11 implementation (Phase 7.4) | **COMPLETE** — all service code exists |
| API routes created | **COMPLETE** — all endpoints exist |
| RLS policies correct | **COMPLETE** — all tables have proper RLS |
| No auth on API routes | **FAIL** — must add session validation |
| Tenant isolation complete | **FAIL** — 6 functions lack tenant isolation |
| Identity path resolved | **FAIL** — dual identity path breaks audit_logs |
| Plan enforcement | **FAIL** — no server-side enforcement |
| Dashboard functional | **FAIL** — auth bug prevents rendering |
| Production testing | **NOT STARTED** |

