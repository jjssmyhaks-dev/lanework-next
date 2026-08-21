/**
 * /api/agents/trust — Agent trust level configuration.
 *
 * GET  → fetch all trust levels for the tenant
 * POST → update trust levels (batch)
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAllTrustLevels, setTrustLevel, type TrustLevel } from "@/lib/agents/trust";

const AGENT_TYPES = [
  "shipment_tracking",
  "inventory_management",
  "fleet_management",
  "compliance",
  "route_optimization",
  "warehouse_operations",
  "customer_communication",
];

const ACTION_TYPES = [
  "track_shipment",
  "create_shipment",
  "cancel_shipment",
  "reroute_shipment",
  "reorder_stock",
  "sync_inventory",
  "schedule_maintenance",
  "check_license",
  "optimize_route",
  "send_notification",
  "send_whatsapp",
  "generate_ewb",
];

export const GET = withAuth(async (request, user) => {
  try {
    const trustLevels = await getAllTrustLevels(user.id || "default");
    return NextResponse.json({ trustLevels });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { configs } = body as {
      configs: Array<{ agentType: string; actionType: string; trustLevel: TrustLevel }>;
    };

    if (!Array.isArray(configs) || configs.length === 0) {
      return NextResponse.json({ error: "configs array required" }, { status: 400 });
    }

    for (const config of configs) {
      if (!config.agentType || !config.actionType || !config.trustLevel) {
        return NextResponse.json({ error: "agentType, actionType, and trustLevel required" }, { status: 400 });
      }
      if (!["propose", "auto_low_risk", "full"].includes(config.trustLevel)) {
        return NextResponse.json({ error: "trustLevel must be propose, auto_low_risk, or full" }, { status: 400 });
      }
    }

    const tenantId = user.id || "default";
    for (const config of configs) {
      await setTrustLevel(tenantId, config.agentType, config.actionType, config.trustLevel);
    }

    return NextResponse.json({ message: "Trust levels updated", count: configs.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
