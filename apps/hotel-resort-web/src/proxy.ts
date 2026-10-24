import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") || "";
  const searchParamHotel = url.searchParams.get("hotel");

  let slug = "grand-haven";

  if (searchParamHotel) {
    slug = searchParamHotel;
  } else if (host) {
    const cleanHost = host.split(":")[0] || "";

    if (cleanHost.endsWith(".omniheaven.com")) {
      slug = cleanHost.replace(".omniheaven.com", "");
    } else if (cleanHost.endsWith(".localhost")) {
      slug = cleanHost.replace(".localhost", "");
    } else if (cleanHost && cleanHost !== "localhost" && cleanHost !== "omniheaven.com") {
      // Custom domain mapped to tenant
      slug = cleanHost;
    }
  }

  // Clone request headers and add tenant slug
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", slug);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
