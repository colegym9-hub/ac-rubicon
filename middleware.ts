import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /login is always reachable (so you can sign in).
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.next();
  }

  // OAuth metadata and flow endpoints must be reachable without a session cookie.
  if (pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  // The MCP endpoints do their own bearer-token auth (lib/mcp/auth.ts) and a
  // headless routine never carries the session cookie — let them past the gate.
  // Exact-path checks (not a loose prefix) so /api/mcp-anything stays gated.
  if (
    pathname === "/api/mcp" ||
    pathname.startsWith("/api/mcp/") ||
    pathname === "/api/sse" ||
    pathname.startsWith("/api/sse/")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and public assets. The MCP routes
  // ARE matched here but short-circuit in the middleware body (exact-path), so
  // their own bearer auth applies while /api/mcp-lookalikes stay gated.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
