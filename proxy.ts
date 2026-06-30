import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Next.js 16 renamed `middleware` to `proxy`. Runs on the Edge runtime before
// rendering. Does an optimistic auth check; route handlers re-verify the
// session for any data access.

const PUBLIC_ROUTES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_ROUTES.some((p) => pathname.startsWith(p));

  if (!session && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Guard everything except API routes (which self-verify), Next internals and assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
