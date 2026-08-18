import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || "default";
    const status = searchParams.get("status");
    const sql = neon(process.env.DATABASE_URL!);

    let query;
    if (status) {
      query = sql`SELECT * FROM approval_actions WHERE org_id = ${orgId} AND status = ${status} ORDER BY created_at DESC`;
    } else {
      query = sql`SELECT * FROM approval_actions WHERE org_id = ${orgId} ORDER BY created_at DESC`;
    }
    const actions = await query;

    return NextResponse.json({ actions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    const { orgId, agentType, actionType, description, inputData } = body;
    if (!orgId || !agentType || !actionType) {
      return NextResponse.json({ error: "orgId, agentType, actionType required" }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO approval_actions (id, org_id, agent_type, action_type, description, input_data)
      VALUES (${id}, ${orgId}, ${agentType}, ${actionType}, ${description || null}, ${JSON.stringify(inputData || {})})
    `;
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});

export const PUT = withAuth(async (request) => {
  try {
    const body = await request.json();
    const { actionId, decision, approvedBy, reason } = body;
    if (!actionId || !decision) {
      return NextResponse.json({ error: "actionId and decision required" }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const newStatus = decision === "approve" ? "approved" : "rejected";
    await sql`
      UPDATE approval_actions
      SET status = ${newStatus}, approved_by = ${approvedBy || null}, rejected_reason = ${reason || null}, resolved_at = NOW()
      WHERE id = ${actionId}
    `;
    return NextResponse.json({ success: true, status: newStatus });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
