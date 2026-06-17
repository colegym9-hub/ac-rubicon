import { NextResponse } from "next/server";
import { verifyPKCE, consumeAuthCode, issueAccessToken } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

const CORS = { "Access-Control-Allow-Origin": "https://claude.ai" };

export async function POST(req: Request) {
  let params: Record<string, string> = {};
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    params = Object.fromEntries(new URLSearchParams(await req.text()));
  } else {
    params = await req.json();
  }

  const { grant_type, code, redirect_uri, code_verifier } = params;

  if (grant_type !== "authorization_code" || !code || !redirect_uri || !code_verifier) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: CORS });
  }

  const row = await consumeAuthCode(code);
  if (!row) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: CORS });
  }

  if (row.redirect_uri !== redirect_uri) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: CORS });
  }

  if (!(await verifyPKCE(code_verifier, row.code_challenge))) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: CORS });
  }

  const accessToken = await issueAccessToken("cole");
  return NextResponse.json(
    { access_token: accessToken, token_type: "bearer", expires_in: 2592000 },
    { headers: CORS }
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://claude.ai",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
