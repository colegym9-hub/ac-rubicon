import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { createServiceClient } from "@/lib/supabase/server";

export const ISSUER = "https://ac-rubicon-vercel.vercel.app";
export const AUDIENCE = "mcp";

function jwtSecret() {
  const s = process.env.MCP_JWT_SECRET;
  if (!s) throw new Error("MCP_JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

export async function issueAccessToken(subject: string): Promise<string> {
  return new SignJWT({ sub: subject })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(jwtSecret());
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload;
  } catch {
    return null;
  }
}

// Signs the Claude OAuth params so we can pass them as the GitHub `state` param
// and recover them safely in the callback without any server-side storage.
export async function signOAuthState(data: Record<string, unknown>): Promise<string> {
  return new SignJWT({ data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setExpirationTime("10m")
    .sign(jwtSecret());
}

export async function verifyOAuthState(
  token: string
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { issuer: ISSUER });
    return payload.data as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function verifyPKCE(verifier: string, challenge: string): Promise<boolean> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const computed = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return computed === challenge;
}

export async function storeAuthCode(
  code: string,
  redirectUri: string,
  codeChallenge: string,
  originalState: string | null,
  clientId: string | null
) {
  const supabase = createServiceClient();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("mcp_auth_codes").insert({
    code,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    original_state: originalState,
    client_id: clientId,
    expires_at: expiresAt,
  });
}

export async function consumeAuthCode(code: string) {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("mcp_auth_codes")
    .select("*")
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .single();
  if (data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("mcp_auth_codes").delete().eq("code", code);
  }
  return data as {
    redirect_uri: string;
    code_challenge: string;
    original_state: string | null;
    client_id: string | null;
  } | null;
}
