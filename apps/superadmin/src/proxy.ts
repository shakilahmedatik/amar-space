import { getSessionCookie } from "@omniheaven/auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const sessionCookie = getSessionCookie(request);

  const isAuthRoute = pathname.startsWith("/login");

  // 1. If user is authenticated and visits /login, redirect to dashboard
  if (sessionCookie && isAuthRoute) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/";
    return NextResponse.redirect(new URL(callbackUrl, request.url));
  }

  // 2. If user is unauthenticated and visits protected console, redirect to login
  if (!sessionCookie && !isAuthRoute) {
    const callbackUrl = encodeURIComponent(pathname + search);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
