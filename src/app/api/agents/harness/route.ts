/**
 * /api/agents/harness — Agentic harness API.
 *
 * GET  → harness status (last run, score, trend)
 * POST → trigger a harness cycle (eval + tuning + learning)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { runHarnessCycle, getHarnessStatus } from "@/lib/agents/harness";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "harness-api" });

export const GET = withAuth(async () => {
  try {
    const status = await getHarnessStatus();
    return NextResponse.json(status);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  // Rate limit: 5 harness runs per hour (expensive operation)
  const rl = rateLimit(request, { maxRequests: 5, windowMs: 3_600_000, group: "harness" });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Harness rate limit exceeded. Max 5 runs per hour." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    log.info("Manual harness cycle triggered");
    const result = await runHarnessCycle();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    log.error({ err: msg }, "Harness cycle failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
