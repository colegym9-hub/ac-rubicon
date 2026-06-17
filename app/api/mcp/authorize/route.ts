import { type NextRequest, NextResponse } from "next/server";
import { signOAuthState } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const clientId = searchParams.get("client_id") ?? "mcp";

  if (!redirectUri || !codeChallenge) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Pack the Claude OAuth params into a signed JWT — GitHub echoes it back as
  // `state`, so we can recover them in /callback without any server-side storage.
  const githubState = await signOAuthState({ redirectUri, state, codeChallenge, clientId });

  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  githubUrl.searchParams.set("scope", "read:user");
  githubUrl.searchParams.set("state", githubState);

  return NextResponse.redirect(githubUrl.toString());
}
