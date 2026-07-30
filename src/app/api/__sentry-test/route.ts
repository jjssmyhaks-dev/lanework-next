import type { NextRequest } from "next/server";

/**
 * Sentry-compatible smoke test endpoint.
 * GET /api/__sentry-test → throws an intentional error to verify Sentry alerting.
 * Only available when NODE_ENV !== "production" (safety guard).
 */
export async function GET(_request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not available in production", { status: 404 });
  }

  throw new Error("Sentry smoke test: intentional error triggered to verify error tracking pipeline.");
}
