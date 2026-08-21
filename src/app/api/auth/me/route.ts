import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Fetch org info
    const sql = neon(process.env.DATABASE_URL!);
    const [member] = await sql`
      SELECT m.role as org_role, o.id as org_id, o.name as org_name, o.plan as org_plan, o.company_size
      FROM org_members m
      JOIN organizations o ON o.id = m.org_id
      WHERE m.user_id = ${user.id}
      LIMIT 1
    `;

    return NextResponse.json({
      user: {
        ...user,
        orgId: member?.org_id || null,
        orgRole: member?.org_role || null,
        org: member?.org_id
          ? { id: member.org_id, name: member.org_name, plan: member.org_plan, company_size: member.company_size }
          : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ user: null, error: e.message }, { status: 500 });
  }
}
