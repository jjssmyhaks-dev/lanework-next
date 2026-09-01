/**
 * Pattern Analyzer — extracts actionable patterns from historical data.
 *
 * Pattern types:
 * - approval_pattern: User consistently approves/rejects certain actions
 * - frequency: Certain actions are triggered more at specific times
 * - risk_preference: User's actual risk tolerance vs configured
 * - seasonal: Logistics patterns by day of week, month, season
 * - error_cluster: Specific integration/action combinations fail together
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "pattern-analyzer" });

export interface ExtractedPattern {
  type: string;
  agentType: string;
  actionType?: string;
  description: string;
  confidence: number;
  evidence: Record<string, unknown>;
}

// ── Extract all patterns ──

export async function extractPatterns(days: number = 30): Promise<ExtractedPattern[]> {
  const patterns: ExtractedPattern[] = [];

  // 1. Time-of-day patterns (when are actions most triggered?)
  try {
    const hourlyActivity = await sql`
      SELECT
        EXTRACT(HOUR FROM created_at)::int as hour,
        COUNT(*)::int as count,
        agent_type
      FROM agent_audit_log
      WHERE timestamp >= NOW() - (${days} || ' days')::interval
      GROUP BY hour, agent_type
      HAVING COUNT(*) >= 5
      ORDER BY count DESC
    `;

    // Group by agent type, find peak hours
    const byAgent = new Map<string, Array<{ hour: number; count: number }>>();
    for (const row of hourlyActivity) {
      if (!byAgent.has(row.agent_type)) byAgent.set(row.agent_type, []);
      byAgent.get(row.agent_type)!.push({ hour: row.hour, count: row.count });
    }

    for (const [agentType, hours] of byAgent) {
      const total = hours.reduce((s, h) => s + h.count, 0);
      const peakHours = hours.filter((h) => h.count / total > 0.15);
      if (peakHours.length > 0) {
        patterns.push({
          type: "frequency",
          agentType,
          description: `Peak activity hours: ${peakHours.map((h) => `${h.hour}:00`).join(", ")}`,
          confidence: 0.7,
          evidence: { peakHours, totalActivity: total },
        });
      }
    }
  } catch (_e) { /* non-critical, intentionally silent */
    // Best effort
  }

  // 2. Day-of-week patterns
  try {
    const dailyActivity = await sql`
      SELECT
        EXTRACT(DOW FROM created_at)::int as dow,
        COUNT(*)::int as count
      FROM agent_audit_log
      WHERE timestamp >= NOW() - (${days} || ' days')::interval
      GROUP BY dow
      ORDER BY dow
    `;

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const total = dailyActivity.reduce((s, d) => s + d.count, 0);
    const busyDays = dailyActivity.filter((d) => d.count / total > 0.18);
    const quietDays = dailyActivity.filter((d) => d.count / total < 0.1);

    if (busyDays.length > 0 || quietDays.length > 0) {
      patterns.push({
        type: "seasonal",
        agentType: "system",
        description: `Busiest: ${busyDays.map((d) => dayNames[d.dow]).join(", ")} | Quietest: ${quietDays.map((d) => dayNames[d.dow]).join(", ")}`,
        confidence: 0.8,
        evidence: { daily: dailyActivity.map((d) => ({ day: dayNames[d.dow], count: d.count })) },
      });
    }
  } catch (_e) { /* non-critical, intentionally silent */
    // Best effort
  }

  // 3. Approval velocity (how fast does user approve/reject?)
  try {
    const [velocityStats] = await sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM (decided_at - created_at)))::float as avg_decision_seconds,
        COUNT(*)::int as total_decisions
      FROM agent_approvals
      WHERE status IN ('approved', 'rejected')
        AND decided_at IS NOT NULL
        AND created_at >= NOW() - (${days} || ' days')::interval
    `;

    if (velocityStats && velocityStats.total_decisions >= 5) {
      const avgSeconds = velocityStats.avg_decision_seconds;
      patterns.push({
        type: "approval_pattern",
        agentType: "system",
        description: `Average decision time: ${Math.round(avgSeconds)}s across ${velocityStats.total_decisions} decisions`,
        confidence: 0.9,
        evidence: { avgDecisionSeconds: avgSeconds, totalDecisions: velocityStats.total_decisions },
      });
    }
  } catch (_e) { /* non-critical, intentionally silent */
    // Best effort
  }

  // 4. Risk score distribution vs outcomes
  try {
    const riskVsOutcome = await sql`
      SELECT
        CASE
          WHEN risk_score <= 3 THEN 'low'
          WHEN risk_score <= 6 THEN 'medium'
          ELSE 'high'
        END as risk_bucket,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE was_correct = true)::int as correct
      FROM agent_outcomes o
      JOIN agent_audit_log a ON o.agent_type = a.agent_type
      WHERE o.tracked_at >= NOW() - (${days} || ' days')::interval
      GROUP BY risk_bucket
    `;

    for (const row of riskVsOutcome) {
      const accuracy = row.total > 0 ? row.correct / row.total : 0;
      patterns.push({
        type: "risk_preference",
        agentType: "system",
        description: `${row.risk_bucket} risk actions: ${Math.round(accuracy * 100)}% accuracy (${row.correct}/${row.total})`,
        confidence: Math.min(row.total / 10, 1),
        evidence: { riskBucket: row.risk_bucket, accuracy, correct: row.correct, total: row.total },
      });
    }
  } catch (_e) { /* non-critical, intentionally silent */
    // Best effort
  }

  log.info({ count: patterns.length, days }, "Pattern extraction complete");
  return patterns;
}
