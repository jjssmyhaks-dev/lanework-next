import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || "default";
    const sql = neon(process.env.DATABASE_URL!);

    const tasksResult = await sql`SELECT COUNT(*)::int as count FROM agent_tasks`;
    const [tasks]: any[] = tasksResult;
    const actionsResult = await sql`SELECT COUNT(*)::int as count FROM approval_actions`;
    const [actions]: any[] = actionsResult;
    const events = await sql`SELECT * FROM usage_events ORDER BY created_at DESC LIMIT 20`;

    return NextResponse.json({
      stats: {
        totalTasks: tasks?.count || 0,
        pendingApprovals: actions?.count || 0,
      },
      recentUsage: events,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, eventType, category, value, metadata } = body;
    if (!orgId || !eventType) {
      return NextResponse.json({ error: "orgId and eventType required" }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO usage_events (id, org_id, event_type, category, value, metadata)
      VALUES (${id}, ${orgId}, ${eventType}, ${category || null}, ${value || 1}, ${JSON.stringify(metadata || {})})
    `;
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
