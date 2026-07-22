import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || "default";
    const sql = neon(process.env.DATABASE_URL!);

    const configs = await sql`SELECT * FROM agent_trust_configs WHERE org_id = ${orgId} ORDER BY agent_type`;
    // If empty, return defaults
    if (!configs.length) {
      return NextResponse.json({
        configs: [
          { agent_type: "shipment_tracking", trust_level: "propose_only", risk_threshold: 0.3, max_auto_value: 100 },
          { agent_type: "inventory_optimizer", trust_level: "propose_only", risk_threshold: 0.3, max_auto_value: 100 },
          { agent_type: "route_planner", trust_level: "propose_only", risk_threshold: 0.3, max_auto_value: 100 },
          { agent_type: "warehouse_agent", trust_level: "propose_only", risk_threshold: 0.3, max_auto_value: 50 },
          { agent_type: "customer_agent", trust_level: "auto_execute_low_risk", risk_threshold: 0.2, max_auto_value: 20 },
          { agent_type: "fleet_agent", trust_level: "propose_only", risk_threshold: 0.3, max_auto_value: 50 },
        ]
      });
    }
    return NextResponse.json({ configs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, configs } = body;
    if (!orgId || !configs) {
      return NextResponse.json({ error: "orgId and configs required" }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    for (const c of configs) {
      await sql`
        INSERT INTO agent_trust_configs (id, org_id, agent_type, trust_level, risk_threshold, max_auto_value)
        VALUES (${crypto.randomUUID()}, ${orgId}, ${c.agent_type}, ${c.trust_level}, ${c.risk_threshold || 0.3}, ${c.max_auto_value || 100})
        ON CONFLICT (org_id, agent_type) DO UPDATE
        SET trust_level = ${c.trust_level}, risk_threshold = ${c.risk_threshold}, max_auto_value = ${c.max_auto_value}`;
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
