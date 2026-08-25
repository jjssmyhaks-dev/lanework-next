/**
 * /api/agents/eval-autogen — Auto-generated eval cases from production data.
 * GET → list generated eval cases
 * POST → trigger eval case generation
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { generateAndStoreEvalCases, getGeneratedEvalCases } from "@/lib/agents/eval-autogen";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "eval-autogen-api" });

export const GET = withAuth(async (request) => {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);

    const cases = await getGeneratedEvalCases(limit);
    return NextResponse.json({ cases, count: cases.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  const rl = rateLimit(request, { maxRequests: 5, windowMs: 3_600_000, group: "eval-autogen" });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded. Max 5 per hour." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const days = Math.min(Number(body.days) || 7, 30);
    const limit = Math.min(Number(body.limit) || 10, 50);

    log.info({ days, limit }, "Manual eval case generation triggered");
    const result = await generateAndStoreEvalCases(days, limit);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    log.error({ err: msg }, "Eval generation failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
