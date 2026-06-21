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

  // Authenticated users visiting login/register → send to dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Unauthenticated users attempting to access dashboard → send to login
  // Guard prevents redirect loop: only redirect if not already on an auth route
  if (!user && isDashboardRoute && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
