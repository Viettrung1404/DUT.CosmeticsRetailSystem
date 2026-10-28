import { NextRequest, NextResponse } from "next/server";
import { safeReturnTo } from "@/shared/auth/contracts";
import { maintenanceResponse } from "@/shared/ui/maintenance-document";
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const headers = new Headers(request.headers);
  if (process.env.MAINTENANCE_MODE === "true" || pathname === "/maintenance") {
    const retryAfter = /^\d+$/.test(process.env.MAINTENANCE_RETRY_AFTER || "")
      ? process.env.MAINTENANCE_RETRY_AFTER!
      : "300";
    const maintenanceHeaders = {
      "Retry-After": retryAfter,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    };
    if (pathname.startsWith("/api/"))
      return NextResponse.json(
        { code: "MAINTENANCE" },
        { status: 503, headers: maintenanceHeaders },
      );
    return maintenanceResponse(process.env.MAINTENANCE_MESSAGE, retryAfter);
  }
  if (pathname === "/account" || pathname.startsWith("/account/")) {
    const cookie = request.cookies.get(
      process.env.NODE_ENV === "production" ? "__Host-glowup-session" : "glowup-session",
    )?.value;
    if (!cookie || !/^[a-f0-9]{64}$/.test(cookie)) {
      const login = new URL("/login", request.url);
      login.searchParams.set("returnTo", safeReturnTo(pathname + request.nextUrl.search));
      return NextResponse.redirect(login);
    }
  }
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (
    /^\/(account|api|login|register|verify-email|reset-password|forgot-password|oauth)(\/|$)/.test(
      pathname,
    )
  )
    response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|images/stitch/).*)"] };
