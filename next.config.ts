import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/well-known/oauth-protected-resource",
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/well-known/oauth-authorization-server",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/mcp",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://claude.ai" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Authorization, Content-Type, mcp-session-id",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
