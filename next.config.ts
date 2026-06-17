import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
