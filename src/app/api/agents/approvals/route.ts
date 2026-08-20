/**
 * /api/agents/approvals — Approval queue for agent actions.
 *
 * GET  → list pending approvals
 * POST → approve or reject an approval
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";
import { auditLog } from "@/lib/agents/audit-trail";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const approvals = await sql`
      SELECT * FROM agent_approvals
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ approvals });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { approvalId, decision, reason } = body as {
      approvalId: string;
      decision: "approved" | "rejected";
      reason?: string;
    };

    if (!approvalId || !decision) {
      return NextResponse.json({ error: "approvalId and decision required" }, { status: 400 });
    }

    // Update approval
    const [updated] = await sql`
      UPDATE agent_approvals
      SET status = ${decision === "approved" ? "approved" : "rejected"},
          decision = ${decision},
          decision_reason = ${reason || null},
          decided_at = NOW(),
          user_id = ${user.id}
      WHERE id = ${approvalId} AND status = 'pending'
      RETURNING *
    `;

    if (!updated) {
      return NextResponse.json({ error: "Approval not found or already decided" }, { status: 404 });
    }

    // Log to audit trail
    await auditLog({
      tenantId: undefined,
      agentType: updated.agent_type,
      action: updated.action_type,
      inputData: typeof updated.input_data === "string" ? JSON.parse(updated.input_data) : updated.input_data,
      outputData: { decision, reason },
      riskScore: updated.risk_score,
      trustLevel: "propose",
      approvalId: updated.id,
      userId: user.id || undefined,
      mode: decision === "approved" ? "approved" : "rejected",
      durationMs: 0,
      success: true,
    });

    // If approved, execute the action
    if (decision === "approved") {
      // The action execution would happen here via MCP
      // For now, log it as auto-approved
      return NextResponse.json({
        approval: updated,
        message: "Approval recorded. Action will be executed by the agent.",
      });
    }

    return NextResponse.json({ approval: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
