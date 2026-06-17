import "server-only";
import { verifyAccessToken } from "@/lib/mcp/oauth";

export async function verifyMcpToken(_req: Request, bearerToken?: string) {
  if (!bearerToken) return undefined;
  const payload = await verifyAccessToken(bearerToken);
  if (!payload) return undefined;
  return {
    token: bearerToken,
    clientId: String(payload.sub ?? "claude"),
    scopes: ["rubicon:rw"],
  };
}
