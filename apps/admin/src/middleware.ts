import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  // 1. If user is authenticated and visits an auth page, redirect to dashboard
  if (sessionCookie && isAuthRoute) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/";
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  }

  // 2. If user is unauthenticated and visits a protected route, redirect to login
  if (!sessionCookie && !isAuthRoute) {
    const callbackUrl = encodeURIComponent(pathname + search);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets / images (svg, png, jpg, etc.)
     * - api routes
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
