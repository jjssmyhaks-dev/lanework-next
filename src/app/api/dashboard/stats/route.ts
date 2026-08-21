import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";
import { cacheWrap } from "@/lib/cache";

export const GET = withAuth(async (_req, user) => {
  try {
    const data = await cacheWrap(`dashboard:${user.id}`, async () => {
      const sql = neon(process.env.DATABASE_URL!);
      const [shipments] = await sql`SELECT COUNT(*)::int as count FROM shipments`;
      const [tasks] = await sql`SELECT COUNT(*)::int as count FROM agent_tasks`;
      const [activeAgents] = await sql`SELECT COUNT(DISTINCT agent_type)::int as count FROM agent_tasks WHERE status = 'completed'`;
      const [exceptions] = await sql`SELECT COUNT(*)::int as count FROM agent_tasks WHERE status = 'rejected'`;
      return {
        shipments: shipments?.count || 0,
        tasks: tasks?.count || 0,
        agents: activeAgents?.count || 0,
        exceptions: exceptions?.count || 0,
        recentTasks: [],
      };
    }, 30); // 30 second cache
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
