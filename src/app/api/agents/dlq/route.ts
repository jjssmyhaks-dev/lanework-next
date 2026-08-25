/**
 * /api/agents/dlq — Dead Letter Queue management.
 * GET  → list dead letters + stats
 * POST → retry or discard a dead letter
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getDeadLetters, getDLQStats, retryDeadLetter, discardDeadLetter } from "@/lib/agents/dlq";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "dlq-api" });

export const GET = withAuth(async (request) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);
    const offset = Number(url.searchParams.get("offset") || "0");

    const [deadLetters, stats] = await Promise.all([
      getDeadLetters({ status, limit, offset }),
      getDLQStats(),
    ]);

    return NextResponse.json({ deadLetters, stats });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  const rl = rateLimit(request, { maxRequests: 10, windowMs: 60_000, group: "dlq" });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { action, id } = body;

    if (action === "retry" && id) {
      const result = await retryDeadLetter(id);
      return NextResponse.json(result);
    }

    if (action === "discard" && id) {
      const success = await discardDeadLetter(id);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: "Invalid action. Use 'retry' or 'discard' with 'id'." }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    log.error({ err: msg }, "DLQ action failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
