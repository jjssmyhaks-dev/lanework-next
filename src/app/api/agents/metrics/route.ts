/**
 * /api/agents/metrics — Agent performance metrics for the dashboard.
 *
 * GET → returns accuracy, time saved, cost avoided, feedback stats
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";
import { getAuditStats } from "@/lib/agents/audit-trail";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days

    // Audit stats
    const auditStats = await getAuditStats(null);

    // Feedback stats per agent type
    const feedbackStats = await sql`
      SELECT
        agent_type,
        COUNT(*) FILTER (WHERE rating = 'thumbs_up')::int as thumbs_up,
        COUNT(*) FILTER (WHERE rating = 'thumbs_down')::int as thumbs_down,
        COUNT(*)::int as total
      FROM agent_feedback
      WHERE created_at >= NOW() - (${period} || ' days')::interval
      GROUP BY agent_type
      ORDER BY total DESC
    `;

    // Alert stats by severity
    const alertStats = await sql`
      SELECT
        severity,
        COUNT(*)::int as count
      FROM agent_alerts
      WHERE created_at >= NOW() - (${period} || ' days')::interval
      GROUP BY severity
    `;

    // Workflow run stats
    const workflowStats = await sql`
      SELECT
        status,
        COUNT(*)::int as count,
        COALESCE(AVG(duration_ms), 0)::int as avg_duration_ms
      FROM agent_workflow_runs
      WHERE started_at >= NOW() - (${period} || ' days')::interval
      GROUP BY status
    `;

    // Outcomes (accuracy tracking)
    const outcomeStats = await sql`
      SELECT
        agent_type,
        COUNT(*)::int as total_outcomes,
        COUNT(*) FILTER (WHERE was_correct = true)::int as correct,
        COUNT(*) FILTER (WHERE was_correct = false)::int as incorrect,
        COALESCE(SUM(financial_impact), 0)::float as total_financial_impact,
        COALESCE(SUM(time_saved_minutes), 0)::int as total_time_saved_min
      FROM agent_outcomes
      WHERE tracked_at >= NOW() - (${period} || ' days')::interval
      GROUP BY agent_type
    `;

    // Patterns learned
    const patternStats = await sql`
      SELECT COUNT(*)::int as total_patterns, COUNT(*) FILTER (WHERE auto_apply = true)::int as auto_apply_count
      FROM agent_patterns
    `;

    // Calculate accuracy
    const totalFeedback = feedbackStats.reduce((sum, f) => sum + f.total, 0);
    const positiveFeedback = feedbackStats.reduce((sum, f) => sum + f.thumbs_up, 0);
    const accuracy = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 0;

    const totalOutcomes = outcomeStats.reduce((sum, o) => sum + o.total_outcomes, 0);
    const correctOutcomes = outcomeStats.reduce((sum, o) => sum + o.correct, 0);
    const outcomeAccuracy = totalOutcomes > 0 ? Math.round((correctOutcomes / totalOutcomes) * 100) : 0;

    return NextResponse.json({
      period: `${period} days`,
      audit: auditStats,
      accuracy: {
        feedbackBased: accuracy,
        outcomeBased: outcomeAccuracy,
        totalFeedback,
        totalOutcomes,
      },
      feedbackByAgent: feedbackStats,
      alerts: alertStats,
      workflows: workflowStats,
      outcomes: outcomeStats,
      patterns: {
        total: patternStats[0]?.total_patterns || 0,
        autoApply: patternStats[0]?.auto_apply_count || 0,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
