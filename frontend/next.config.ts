import type { NextConfig } from "next";

/**
 * Production: static export (`out/`) served by the Cloudflare Worker together with the API.
 * Development: `next dev` proxies /api to the local backend (wrangler dev on :8787).
 */
const isExport = process.env.NODE_ENV === "production";
const API_URL = process.env.API_URL ?? "http://localhost:8787";

const config: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  ...(isExport
    ? { output: "export" as const }
    : {
        async rewrites() {
          return {
            beforeFiles: [
              { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
              // Mirror the production Worker: dynamic pages are exported once as "/<section>/_".
              { source: "/campaigns/:slug", destination: "/campaigns/_" },
              { source: "/organizers/:id", destination: "/organizers/_" },
              { source: "/communities/:slug", destination: "/communities/_" },
            ],
            afterFiles: [],
            fallback: [],
          };
        },
      }),
};

export default config;
