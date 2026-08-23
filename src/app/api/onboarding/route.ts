import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";

/* Multi-step onboarding: create organization, subscription, integrations, trust */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const sql = neon(process.env.DATABASE_URL!);
    const [org]: any[] = await sql`SELECT * FROM organizations WHERE id = ${orgId}`;
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [sub]: any[] = await sql`SELECT * FROM subscriptions WHERE org_id = ${orgId}`;
    const integrations = await sql`SELECT * FROM integrations WHERE org_id = ${orgId}`;
    const trusts = await sql`SELECT * FROM agent_trust_configs WHERE org_id = ${orgId}`;

    return NextResponse.json({ org, subscription: sub || null, integrations, trustConfigs: trusts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    const { step, userId, orgName, plan, integrations: intList, trustConfigs } = body;
    const sql = neon(process.env.DATABASE_URL!);

    if (step === "create-org" && userId && orgName) {
      const id = crypto.randomUUID();
      await sql`INSERT INTO organizations (id, name, owner_id) VALUES (${id}, ${orgName}, ${userId})`;
      await sql`INSERT INTO subscriptions (id, org_id, plan, status) VALUES (${crypto.randomUUID()}, ${id}, ${plan || 'starter'}, ${'active'})`;
      return NextResponse.json({ success: true, orgId: id, plan: plan || "starter" }, { status: 201 });
    }

    if (step === "integrations" && body.orgId && intList) {
      for (const item of intList) {
        await sql`INSERT INTO integrations (id, org_id, type, name, status)
          VALUES (${crypto.randomUUID()}, ${body.orgId}, ${item.type}, ${item.name}, "connected")`;
      }
      return NextResponse.json({ success: true });
    }

    if (step === "trust-config" && body.orgId && trustConfigs) {
      for (const t of trustConfigs) {
        await sql`
          INSERT INTO agent_trust_configs (id, org_id, agent_type, trust_level)
          VALUES (${crypto.randomUUID()}, ${body.orgId}, ${t.agentType}, ${t.trustLevel})
          ON CONFLICT (org_id, agent_type) DO UPDATE SET trust_level = ${t.trustLevel}`;
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid step or missing fields" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
