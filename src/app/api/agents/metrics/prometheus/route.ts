/**
 * /api/agents/metrics/prometheus — Prometheus-format metrics.
 * Returns metrics in Prometheus text format for scraping.
 */

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getAllCircuitStatuses } from "@/lib/agents/circuit-breaker";
import { getDLQStats } from "@/lib/agents/dlq";
import { getAgentLimitStatus } from "@/lib/agents/agent-limiter";

export const GET = async () => {
  const lines: string[] = [];
  const ts = Date.now();

  // 1. Circuit breaker metrics
  try {
    const circuits = getAllCircuitStatuses();
    for (const c of circuits) {
      lines.push(`# HELP lanework_circuit_breaker_state Circuit breaker state (0=closed, 1=open, 2=half_open)`);
      lines.push(`# TYPE lanework_circuit_breaker_state gauge`);
      lines.push(`lanework_circuit_breaker_state{integration="${c.integration}"} ${c.state === "closed" ? 0 : c.state === "open" ? 1 : 2} ${ts}`);

      lines.push(`# HELP lanework_circuit_breaker_failures Total failure count`);
      lines.push(`# TYPE lanework_circuit_breaker_failures gauge`);
      lines.push(`lanework_circuit_breaker_failures{integration="${c.integration}"} ${c.failureCount} ${ts}`);
    }
  } catch { /* best effort */ }

  // 2. DLQ metrics
  try {
    const stats = await getDLQStats();
    lines.push(`# HELP lanework_dlq_pending Dead letters pending retry`);
    lines.push(`# TYPE lanework_dlq_pending gauge`);
    lines.push(`lanework_dlq_pending ${stats.pending} ${ts}`);

    lines.push(`# HELP lanework_dlq_total Total dead letters`);
    lines.push(`# TYPE lanework_dlq_total counter`);
    lines.push(`lanework_dlq_total ${stats.total} ${ts}`);

    lines.push(`# HELP lanework_dlq_recovered Recovered dead letters`);
    lines.push(`# TYPE lanework_dlq_recovered counter`);
    lines.push(`lanework_dlq_recovered ${stats.recovered} ${ts}`);
  } catch { /* best effort */ }

  // 3. Rate limiter metrics
  try {
    const limits = getAgentLimitStatus();
    for (const l of limits) {
      lines.push(`# HELP lanework_rate_limit_tokens Available tokens`);
      lines.push(`# TYPE lanework_rate_limit_tokens gauge`);
      lines.push(`lanework_rate_limit_tokens{agent="${l.agentType}"} ${l.tokens} ${ts}`);

      lines.push(`# HELP lanework_rate_limit_concurrent Current concurrent executions`);
      lines.push(`# TYPE lanework_rate_limit_concurrent gauge`);
      lines.push(`lanework_rate_limit_concurrent{agent="${l.agentType}"} ${l.concurrent} ${ts}`);
    }
  } catch { /* best effort */ }

  // 4. DB metrics
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const [row] = await sql`SELECT COUNT(*)::int as count FROM agent_events WHERE created_at >= NOW() - INTERVAL '1 hour'`;
    lines.push(`# HELP lanework_events_per_hour Events emitted in the last hour`);
    lines.push(`# TYPE lanework_events_per_hour gauge`);
    lines.push(`lanework_events_per_hour ${row?.count || 0} ${ts}`);

    const [alerts] = await sql`SELECT COUNT(*)::int as count FROM agent_alerts WHERE created_at >= NOW() - INTERVAL '1 hour'`;
    lines.push(`# HELP lanework_alerts_per_hour Alerts generated in the last hour`);
    lines.push(`# TYPE lanework_alerts_per_hour gauge`);
    lines.push(`lanework_alerts_per_hour ${alerts?.count || 0} ${ts}`);
  } catch { /* best effort */ }

  return new Response(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
};
