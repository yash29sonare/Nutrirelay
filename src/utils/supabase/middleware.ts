import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Initialise a mutable response so cookie mutations can be applied before returning
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write to the request so downstream server components see fresh cookies
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild response with the mutated request, then attach Set-Cookie headers
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // MUST use getUser() not getSession() — getSession() reads from the local cookie only
  // and can be forged. getUser() validates the JWT against the Supabase auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname === '/login' || pathname === '/register'
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isOnboardingRoute = pathname.startsWith('/onboarding')

  // ── Rule 1: No auth → redirect /login ─────────────────────────────
  if (!user) {
    if (isDashboardRoute || isOnboardingRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // ── Rule 2: Auth on login/register → redirect /dashboard ────────────
  if (isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Only check onboarding for routes that need it
  if (!isDashboardRoute && !isOnboardingRoute) {
    return response
  }

  // ── Rule 3: Fetch trainer row (safe query, fail-open) ──────────────
  let trainer: { onboarding_status: string } | null = null
  try {
    const { data } = await supabase
      .from('trainers')
      .select('onboarding_status')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    trainer = data as { onboarding_status: string } | null
  } catch {
    // DB unavailable — fail-open, trainer stays null
  }

  const onboardingStatus = trainer?.onboarding_status ?? null

  // ── Rules 4-7: Decision matrix ─────────────────────────────────────
  if (isDashboardRoute) {
    // Rule 4: No trainers row → redirect to onboarding (recovery path)
    if (!trainer) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    // Rule 5: Not active → redirect to onboarding
    if (onboardingStatus !== 'active') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    // Rule 7: Active → allow dashboard (fall through)
  }

  if (isOnboardingRoute) {
    // Rule 4: No trainers row → allow (recovery page must be reachable)
    if (!trainer) {
      return response
    }
    // Rule 7: Already active → redirect to dashboard
    if (onboardingStatus === 'active') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Rule 6: Otherwise (invited, onboarding) → allow onboarding
  }

  return response
}
