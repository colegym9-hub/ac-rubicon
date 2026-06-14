import "server-only";
import { safeEqual } from "@/lib/auth";

/**
 * Bearer-token check for the MCP endpoint. Compares the presented token against
 * MCP_BEARER_TOKEN in constant time (reusing the gate's `safeEqual`).
 *
 * Fails CLOSED: if MCP_BEARER_TOKEN is unset, every request is rejected — there
 * is intentionally no dev fallback for an internet-reachable endpoint. Returning
 * undefined makes `withMcpAuth({ required: true })` emit a spec-compliant 401.
 */
export async function verifyMcpToken(_req: Request, bearerToken?: string) {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected || !bearerToken) return undefined;
  if (!safeEqual(bearerToken, expected)) return undefined;
  return { token: bearerToken, clientId: "rubicon-mcp", scopes: ["rubicon:rw"] };
}
