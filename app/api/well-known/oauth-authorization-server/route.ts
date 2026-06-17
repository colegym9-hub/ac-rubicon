import { NextResponse } from "next/server";
import { ISSUER } from "@/lib/mcp/oauth";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600",
};

export function GET() {
  return NextResponse.json(
    {
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/api/mcp/authorize`,
      token_endpoint: `${ISSUER}/api/mcp/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
    },
    { headers: CORS }
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
