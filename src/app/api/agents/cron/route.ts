/**
 * /api/agents/cron — Vercel Cron endpoint for agent polling.
 *
 * Triggered by Vercel Cron (every 5 minutes) or manually.
 * Runs all registered pollers and returns results.
 */

import { NextRequest, NextResponse } from "next/server";
import { runPollerByName, runAllPollers } from "@/lib/agents/scheduler";
import { processPendingApprovals } from "@/lib/agents/approval-escalation";
import { cleanupDeadLetters } from "@/lib/agents/dlq";
import { cleanupMemory } from "@/lib/agents/memory";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "agent-cron" });

export async function GET(request: NextRequest) {
  // Authenticate: Vercel Cron sends x-vercel-cron header, or use Bearer token
  const vercelCron = request.headers.get("x-vercel-cron");
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isVercelCron = !!vercelCron;
  const isBearerAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isDev = process.env.NODE_ENV === "development";

  if (!isVercelCron && !isBearerAuth && !isDev) {
    log.warn({ ip: request.headers.get("x-forwarded-for") }, "Unauthorized cron access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const job = searchParams.get("job");

  log.info({ job, isVercelCron, isBearerAuth }, "Cron triggered");

  try {
    if (job) {
      // Run specific job
      const result = await runPollerByName(job);
      return NextResponse.json(result);
    }

    // Run all pollers
    const results = await runAllPollers();

    // Run approval escalation (every cron cycle)
    let escalationResult;
    try {
      escalationResult = await processPendingApprovals();
    } catch (e: unknown) {
      log.warn({ err: e instanceof Error ? e.message : "unknown" }, "Approval escalation failed");
    }

    // Cleanup DLQ and memory (once per hour, only on the :00 minute)
    const now = new Date();
    if (now.getMinutes() === 0) {
      try {
        await cleanupDeadLetters(30);
        await cleanupMemory(90);
      } catch {
        // Best effort cleanup
      }
    }

    const summary = {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalChecked: results.reduce((sum, r) => sum + r.checked, 0),
      totalAlerts: results.reduce((sum, r) => sum + r.alerts, 0),
      escalation: escalationResult,
      results,
    };

    return NextResponse.json(summary);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    log.error({ err: msg }, "Cron execution failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
