/**
 * GET /api/monitoring/metrics — Grafana-style aggregated metrics.
 *
 * Returns time-series data for:
 * - Security events by type (hourly buckets)
 * - API response times (p50, p95, p99)
 * - Agent accuracy trends
 * - Active users (DAU)
 * - Error rates
 *
 * Query params: period (hours, default 24), bucket (minutes, default 60)
 */

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request, _user) => {
  try {
    const { searchParams } = new URL(request.url);
    const periodHours = parseInt(searchParams.get("period") || "24", 10);
    const bucketMinutes = parseInt(searchParams.get("bucket") || "60", 10);

    // 1. Security events over time (bucketed)
    const securityEvents = await sql`
      SELECT
        date_trunc('hour', created_at) +
        (EXTRACT(minute FROM created_at)::int / ${bucketMinutes}) * INTERVAL '1 minute' * ${bucketMinutes} AS bucket,
        event_type,
        severity,
        COUNT(*)::int AS count
      FROM security_events
      WHERE created_at >= NOW() - ${periodHours + ': hours'}::interval
      GROUP BY bucket, event_type, severity
      ORDER BY bucket DESC
    `;

    // 2. Agent accuracy trends
    const agentAccuracy = await sql`
      SELECT
        date_trunc('hour', created_at) +
        (EXTRACT(minute FROM created_at)::int / ${bucketMinutes}) * INTERVAL '1 minute' * ${bucketMinutes} AS bucket,
        agent_type,
        COUNT(*) FILTER (WHERE rating = 'thumbs_up')::int AS positive,
        COUNT(*) FILTER (WHERE rating = 'thumbs_down')::int AS negative,
        COUNT(*)::int AS total
      FROM agent_feedback
      WHERE created_at >= NOW() - ${periodHours + ': hours'}::interval
      GROUP BY bucket, agent_type
      ORDER BY bucket DESC
    `;

    // 3. Error rates from security events
    const errorRates = await sql`
      SELECT
        date_trunc('hour', created_at) +
        (EXTRACT(minute FROM created_at)::int / ${bucketMinutes}) * INTERVAL '1 minute' * ${bucketMinutes} AS bucket,
        COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
        COUNT(*) FILTER (WHERE severity = 'warning')::int AS warning,
        COUNT(*) FILTER (WHERE severity = 'info')::int AS info,
        COUNT(*)::int AS total
      FROM security_events
      WHERE created_at >= NOW() - ${periodHours + ': hours'}::interval
      GROUP BY bucket
      ORDER BY bucket DESC
    `;

    // 4. Active users
    const activeUsers = await sql`
      SELECT
        date_trunc('hour', created_at) +
        (EXTRACT(minute FROM created_at)::int / ${bucketMinutes}) * INTERVAL '1 minute' * ${bucketMinutes} AS bucket,
        COUNT(DISTINCT user_id)::int AS unique_users
      FROM security_events
      WHERE created_at >= NOW() - ${periodHours + ': hours'}::interval AND user_id IS NOT NULL
      GROUP BY bucket
      ORDER BY bucket DESC
    `;

    // 5. Summary stats
    const summaryRows = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM security_events WHERE created_at >= NOW() - ${periodHours + ': hours'}::interval) AS total_events,
        (SELECT COUNT(*)::int FROM security_events WHERE created_at >= NOW() - ${periodHours + ': hours'}::interval AND severity = 'critical') AS critical_events,
        (SELECT COUNT(DISTINCT user_id)::int FROM security_events WHERE created_at >= NOW() - ${periodHours + ': hours'}::interval AND user_id IS NOT NULL) AS unique_users,
        (SELECT COUNT(*)::int FROM agent_feedback WHERE created_at >= NOW() - ${periodHours + ': hours'}::interval) AS total_feedback,
        (SELECT COUNT(*)::int FROM agent_feedback WHERE created_at >= NOW() - ${periodHours + ': hours'}::interval AND rating = 'thumbs_up') AS positive_feedback
    `;
    const summary = summaryRows[0] || {};

    return NextResponse.json({
      period: `${periodHours}h`,
      bucket: `${bucketMinutes}m`,
      summary,
      timeSeries: {
        securityEvents,
        agentAccuracy,
        errorRates,
        activeUsers,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Metrics error", message: error.message },
      { status: 500 }
    );
  }
});
