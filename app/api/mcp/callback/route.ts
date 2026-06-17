import { type NextRequest, NextResponse } from "next/server";
import { verifyOAuthState, storeAuthCode } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

function randomCode(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const githubCode = searchParams.get("code");
  const githubState = searchParams.get("state");

  if (!githubCode || !githubState) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Recover and verify the original Claude OAuth params from the signed state JWT
  const params = await verifyOAuthState(githubState);
  if (!params) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }
  const { redirectUri, state, codeChallenge, clientId } = params as {
    redirectUri: string;
    state: string | null;
    codeChallenge: string;
    clientId: string;
  };

  // Exchange the GitHub code for a GitHub access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: githubCode,
    }),
  });
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenData.access_token) {
    return NextResponse.json({ error: "github_exchange_failed" }, { status: 400 });
  }

  // Look up the GitHub user to verify identity
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "ac-rubicon",
    },
  });
  const user = (await userRes.json()) as { login?: string };

  if (user.login !== process.env.MCP_ALLOWED_GITHUB_USER) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  // Generate a one-time auth code and store it (expires in 5 min)
  const authCode = randomCode();
  await storeAuthCode(authCode, redirectUri, codeChallenge, state ?? null, clientId ?? null);

  // Redirect back to Claude with the auth code
  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", authCode);
  if (state) redirect.searchParams.set("state", state);

  return NextResponse.redirect(redirect.toString());
}
