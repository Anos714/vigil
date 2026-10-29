import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic redirect only. Real authorization must always be checked against
 * the session on the server before acting on protected data.
 *
 * The sample workspace stays reachable while AUTH_REQUIRED=false so the
 * project can be demonstrated without Google OAuth credentials.
 */
export function proxy(request: NextRequest) {
  if (process.env.AUTH_REQUIRED !== "true") {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
