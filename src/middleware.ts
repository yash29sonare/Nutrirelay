import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    /*
     * Explicitly exclude:
     * - _next/static and _next/image (framework internals)
     * - favicon.ico
     * - All /api/* routes (webhooks must not be blocked by auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
