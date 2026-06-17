import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { issueAccessToken } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

// Protected by app session — only Cole (already logged in) can hit this.
export async function GET() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 365-day service JWT for headless routines (can't do OAuth browser flow)
  const jwt = await issueAccessToken("cole-service");
  return NextResponse.json({ token: jwt, expires_in_days: 365 });
}
