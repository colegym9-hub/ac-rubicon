import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTools } from "@/lib/mcp/tools";
import { verifyMcpToken } from "@/lib/mcp/auth";

// Tools call the server-only Supabase service client → must run on Node, not Edge.
export const runtime = "nodejs";
// convert_source can hit Supadata for a few seconds — give the function headroom.
export const maxDuration = 60;

// Streamable-HTTP MCP server. basePath "/api" + the [transport] segment serves
// the endpoint at /api/mcp (and legacy /api/sse).
const handler = createMcpHandler(
  (server) => registerTools(server),
  {},
  { basePath: "/api", maxDuration: 60, verboseLogs: false },
);

// Bearer-token gate (constant-time). `required: true` → spec-compliant 401 when
// the token is missing or wrong. This route is intentionally OUTSIDE the
// password-cookie gate (see middleware.ts) so a headless routine can reach it.
const authedHandler = withMcpAuth(handler, verifyMcpToken, { required: true });

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
