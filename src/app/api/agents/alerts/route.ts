/**
 * /api/agents/alerts — Agent alerts API.
 *
 * GET  → list alerts (with filtering)
 * POST → acknowledge an alert
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const agentType = searchParams.get("agentType");
    const acknowledged = searchParams.get("acknowledged");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    let alerts;
    if (severity) {
      alerts = await sql`
        SELECT * FROM agent_alerts WHERE severity = ${severity}
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    } else if (agentType) {
      alerts = await sql`
        SELECT * FROM agent_alerts WHERE agent_type = ${agentType}
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    } else if (acknowledged === "false") {
      alerts = await sql`
        SELECT * FROM agent_alerts WHERE acknowledged = false
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    } else {
      alerts = await sql`
        SELECT * FROM agent_alerts
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    }

    // Get stats
    const [stats] = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE acknowledged = false)::int as unacknowledged,
        COUNT(*) FILTER (WHERE severity = 'critical' AND acknowledged = false)::int as critical,
        COUNT(*) FILTER (WHERE severity = 'warning' AND acknowledged = false)::int as warnings
      FROM agent_alerts
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    return NextResponse.json({ alerts, stats });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { alertId } = body as { alertId: string };

    if (!alertId) {
      return NextResponse.json({ error: "alertId required" }, { status: 400 });
    }

    await sql`
      UPDATE agent_alerts
      SET acknowledged = true, acknowledged_at = NOW(), acknowledged_by = ${user.id}
      WHERE id = ${alertId} AND acknowledged = false
    `;

    return NextResponse.json({ message: "Alert acknowledged" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
