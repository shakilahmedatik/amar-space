import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get('better-auth.session_token')
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/buildings/:path*',
    '/flats/:path*',
    '/renters/:path*',
    '/bills/:path*',
    '/payments/:path*',
    '/maintenance/:path*',
    '/issues/:path*',
    '/notices/:path*',
    '/staff/:path*',
    '/audit/:path*',
    '/settings/:path*',
  ],
}
