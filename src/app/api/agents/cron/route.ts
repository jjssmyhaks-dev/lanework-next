/**
 * /api/agents/cron — Vercel Cron endpoint for agent polling.
 *
 * Triggered by Vercel Cron (every 5 minutes) or manually.
 * Runs all registered pollers and returns results.
 */

import { NextRequest, NextResponse } from "next/server";
import { runPollerByName, runAllPollers } from "@/lib/agents/scheduler";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "agent-cron" });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const job = searchParams.get("job");

  log.info({ job }, "Cron triggered");

  try {
    if (job) {
      // Run specific job
      const result = await runPollerByName(job);
      return NextResponse.json(result);
    }

    // Run all pollers
    const results = await runAllPollers();
    const summary = {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalChecked: results.reduce((sum, r) => sum + r.checked, 0),
      totalAlerts: results.reduce((sum, r) => sum + r.alerts, 0),
      results,
    };

    return NextResponse.json(summary);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    log.error({ err: msg }, "Cron execution failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
