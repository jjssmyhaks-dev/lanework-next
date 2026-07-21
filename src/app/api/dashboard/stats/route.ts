import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const userId = "default-user";

    const [shipments] = await sql`SELECT COUNT(*)::int as count FROM shipments WHERE user_id = ${userId}`;
    const [tasks] = await sql`SELECT COUNT(*)::int as count FROM agent_tasks WHERE user_id = ${userId}`;
    const [activeAgents] = await sql`SELECT COUNT(DISTINCT agent_id)::int as count FROM agent_tasks WHERE user_id = ${userId} AND status = 'completed'`;
    const [exceptions] = await sql`SELECT COUNT(*)::int as count FROM agent_tasks WHERE user_id = ${userId} AND status = 'rejected'`;

    return NextResponse.json({
      shipments: shipments?.count || 0,
      tasks: tasks?.count || 0,
      agents: activeAgents?.count || 0,
      exceptions: exceptions?.count || 0,
      recentTasks: [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
