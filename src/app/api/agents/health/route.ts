/**
 * /api/agents/health — Agent system health check.
 * Returns overall system status, DB connectivity, MCP integration health.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { getAllCircuitStatuses } from "@/lib/agents/circuit-breaker";
import { getDLQStats } from "@/lib/agents/dlq";
import { getAgentLimitStatus } from "@/lib/agents/agent-limiter";
import { getPollerStatus } from "@/lib/agents/scheduler";

export const GET = withAuth(async () => {
  const start = Date.now();
  const checks: Record<string, { status: string; latencyMs: number; details?: string }> = {};

  // 1. Database check
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`SELECT 1`;
    checks.database = { status: "healthy", latencyMs: Date.now() - start };
  } catch (e: unknown) {
    checks.database = { status: "unhealthy", latencyMs: Date.now() - start, details: e instanceof Error ? e.message : "unknown" };
  }

  // 2. Circuit breakers
  try {
    const circuits = getAllCircuitStatuses();
    const openCount = circuits.filter((c) => c.state === "open").length;
    checks.circuitBreakers = {
      status: openCount === 0 ? "healthy" : "degraded",
      latencyMs: Date.now() - start,
      details: `${circuits.length} integrations, ${openCount} open`,
    };
  } catch (e: unknown) {
    checks.circuitBreakers = { status: "error", latencyMs: Date.now() - start, details: e instanceof Error ? e.message : "unknown" };
  }

  // 3. DLQ health
  try {
    const stats = await getDLQStats();
    checks.deadLetterQueue = {
      status: stats.pending < 50 ? "healthy" : "warning",
      latencyMs: Date.now() - start,
      details: `${stats.pending} pending, ${stats.recovered} recovered`,
    };
  } catch (e: unknown) {
    checks.deadLetterQueue = { status: "error", latencyMs: Date.now() - start };
  }

  // 4. Rate limiter
  try {
    const limits = getAgentLimitStatus();
    const healthy = limits.every((l) => l.tokens > 0);
    checks.rateLimiter = {
      status: healthy ? "healthy" : "throttled",
      latencyMs: Date.now() - start,
      details: `${limits.length} agents tracked`,
    };
  } catch {
    checks.rateLimiter = { status: "error", latencyMs: Date.now() - start };
  }

  // 5. Pollers
  try {
    const pollers = await getPollerStatus();
    const runningCount = pollers.filter((p) => p.lastStatus === "running").length;
    const errorCount = pollers.filter((p) => p.lastStatus === "error").length;
    checks.pollers = {
      status: errorCount === 0 ? "healthy" : "degraded",
      latencyMs: Date.now() - start,
      details: `${pollers.length} pollers, ${runningCount} running, ${errorCount} errors`,
    };
  } catch {
    checks.pollers = { status: "error", latencyMs: Date.now() - start };
  }

  const overallStatus = Object.values(checks).every((c) => c.status === "healthy")
    ? "healthy"
    : Object.values(checks).some((c) => c.status === "unhealthy" || c.status === "error")
      ? "unhealthy"
      : "degraded";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
    checks,
  });
});
