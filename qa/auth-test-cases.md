# NutriRelay Auth Test Cases

## AUTH-001: Public Landing Loads

- Preconditions: none.
- Steps: open `/`.
- Expected: page renders NutriRelay landing content and public CTAs.
- Risk covered: public app availability.

## AUTH-002: Login Form Validation

- Preconditions: signed out.
- Steps: open `/login`, submit empty email/password.
- Expected: validation or safe error response; no dashboard access.
- Risk covered: invalid login handling.

## AUTH-003: Invalid Credentials

- Preconditions: signed out.
- Steps: submit a clearly invalid email/password pair.
- Expected: app shows `Invalid email or password.` and stays on login.
- Risk covered: authentication failure is handled without leaking account existence.

## AUTH-004: Protected Dashboard Signed Out

- Preconditions: signed out browser session.
- Steps: open `/dashboard`.
- Expected: redirect to `/login`.
- Risk covered: protected route access.

## AUTH-005: Protected Dashboard Signed In

- Preconditions: safe trainer test account or existing signed-in trainer browser.
- Steps: open `/dashboard`.
- Expected: dashboard shell renders; trainer navigation is visible.
- Risk covered: session cookie handling and trainer access.

## AUTH-006: Admin Route Non-Admin

- Preconditions: signed-in non-admin trainer.
- Steps: open `/admin`.
- Expected: redirect to `/dashboard`.
- Risk covered: role-gated admin access.

## AUTH-007: Logout

- Preconditions: signed in.
- Steps: trigger logout from account controls.
- Expected: session ends; `/dashboard` redirects to `/login`.
- Risk covered: session termination.
