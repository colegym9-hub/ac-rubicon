import { NextResponse } from "next/server";
import { ISSUER } from "@/lib/mcp/oauth";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600",
};

export function GET() {
  return NextResponse.json(
    { resource: ISSUER, authorization_servers: [ISSUER] },
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
