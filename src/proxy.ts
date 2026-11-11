import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ROUTE_ROOT, adminConfig } from "./lib/admin-config";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const admin = adminConfig();
  const { pathname } = request.nextUrl;

  if (admin && (pathname === `/${admin.path}` || pathname.startsWith(`/${admin.path}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = `${ADMIN_ROUTE_ROOT}${pathname.slice(admin.path.length + 1)}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  // Everything else, including a direct visit to the real admin route, goes through the
  // language routing and ends in the normal "page not found".
  return intl(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
