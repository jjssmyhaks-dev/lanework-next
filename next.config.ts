import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // MCP SDK is only needed when the standalone MCP servers run (mcp-servers/*);
  // keep it external so the app never bundles or resolves it at build time.
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // Redirect common typos
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/index", destination: "/", permanent: true },
    ];
  },
  // Production-only image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
};

// Sentry build-time options (v10: second argument to withSentryConfig)
const sentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload larger source maps
  widenClientFileUpload: true,

  // Hides source maps from browser devtools in production
  hideSourceMaps: true,

  // Disable Sentry logger (Turbopack-compatible)
  telemetry: false,
};

// Rollback mechanism:
// 1. Vercel Dashboard → Deployments → select desired → "Promote to Production"
// 2. CLI: vercel rollback
// 3. GitHub: revert merge commit and push

export default withSentryConfig(nextConfig, sentryBuildOptions);
