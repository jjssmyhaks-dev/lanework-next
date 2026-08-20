/**
 * /api/agents/feedback — Record user feedback on agent actions.
 *
 * POST → submit feedback (thumbs up/down + optional comment)
 * GET  → list feedback history
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { taskId, alertId, agentType, rating, comment } = body as {
      taskId?: string;
      alertId?: string;
      agentType: string;
      rating: "thumbs_up" | "thumbs_down";
      comment?: string;
    };

    if (!agentType || !rating) {
      return NextResponse.json({ error: "agentType and rating required" }, { status: 400 });
    }

    if (!["thumbs_up", "thumbs_down"].includes(rating)) {
      return NextResponse.json({ error: "rating must be thumbs_up or thumbs_down" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await sql`
      INSERT INTO agent_feedback (id, tenant_id, task_id, alert_id, user_id, agent_type, rating, comment, created_at)
      VALUES (${id}, NULL, ${taskId || null}, ${alertId || null}, ${user.id},
              ${agentType}, ${rating}, ${comment || null}, NOW())
    `;

    return NextResponse.json({ id, message: "Feedback recorded" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    let feedback;
    if (agentType) {
      feedback = await sql`
        SELECT * FROM agent_feedback
        WHERE agent_type = ${agentType}
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    } else {
      feedback = await sql`
        SELECT * FROM agent_feedback
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    }

    return NextResponse.json({ feedback });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
