/**
 * Agent Capabilities — declares what each agent can do, what integrations
 * it needs, and its trust defaults. Used for:
 *
 * - Tool availability checking before invoking MCP
 * - Plan-tier enforcement (Enterprise-only features)
 * - Dashboard capability matrix
 * - Self-documenting agent system
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "agent-capabilities" });

// ── Types ──

export interface AgentCapability {
  name: string;
  description: string;
  requiredIntegrations: string[];  // MCP integrations needed
  optionalIntegrations: string[];  // MCP integrations that enhance it
  trustDefault: "propose" | "auto_low_risk" | "full";
  riskLevel: "low" | "medium" | "high";
  planRequired: "free" | "starter" | "growth" | "enterprise";
  actions: string[];
}

// ── Capability Registry ──

export const AGENT_CAPABILITIES: AgentCapability[] = [
  {
    name: "shipment-tracking",
    description: "Track shipments across carriers, detect delays, predict delivery times",
    requiredIntegrations: [],
    optionalIntegrations: ["shiprocket", "fedex", "weather"],
    trustDefault: "auto_low_risk",
    riskLevel: "low",
    planRequired: "free",
    actions: ["track_shipment", "create_shipment", "cancel_shipment", "compare_rates", "generate_label"],
  },
  {
    name: "route-optimization",
    description: "Optimize delivery routes, consider traffic, weather, and constraints",
    requiredIntegrations: [],
    optionalIntegrations: ["mapmyindia", "weather", "fedex"],
    trustDefault: "auto_low_risk",
    riskLevel: "low",
    planRequired: "free",
    actions: ["optimize_route", "distance_matrix", "geocode", "reverse_geocode"],
  },
  {
    name: "inventory-management",
    description: "Monitor stock levels, auto-reorder, sync with Tally/ERP",
    requiredIntegrations: [],
    optionalIntegrations: ["tally_prime", "sap_b1", "google_sheets"],
    trustDefault: "propose",
    riskLevel: "medium",
    planRequired: "starter",
    actions: ["check_stock", "sync_inventory", "reorder_stock", "sync_orders"],
  },
  {
    name: "fleet-management",
    description: "Track vehicles, monitor driver hours, schedule maintenance",
    requiredIntegrations: [],
    optionalIntegrations: ["loconav", "fleetx", "compliance"],
    trustDefault: "propose",
    riskLevel: "medium",
    planRequired: "starter",
    actions: ["track_fleet", "track_vehicle", "schedule_maintenance", "driver_report", "maintenance_check"],
  },
  {
    name: "e-way-bill",
    description: "Generate, view, and cancel e-way bills for GST compliance",
    requiredIntegrations: [],
    optionalIntegrations: ["gstn_eway_bill"],
    trustDefault: "propose",
    riskLevel: "high",
    planRequired: "growth",
    actions: ["generate_ewb", "cancel_ewb", "view_ewb", "validate_gstin"],
  },
  {
    name: "compliance",
    description: "Check driver licenses, vehicle registrations, challans",
    requiredIntegrations: [],
    optionalIntegrations: ["compliance"],
    trustDefault: "auto_low_risk",
    riskLevel: "low",
    planRequired: "starter",
    actions: ["check_license", "check_registration", "check_challan", "compliance_summary"],
  },
  {
    name: "customer-support",
    description: "Analyze customer sentiment, auto-reply, send tracking updates",
    requiredIntegrations: [],
    optionalIntegrations: ["email", "shopify"],
    trustDefault: "propose",
    riskLevel: "medium",
    planRequired: "starter",
    actions: ["send_tracking_update", "auto_reply", "check_inbox"],
  },
  {
    name: "warehouse-operations",
    description: "Dock scheduling, pick/pack/ship, inventory receiving",
    requiredIntegrations: [],
    optionalIntegrations: ["wms", "scanner", "dockscheduler"],
    trustDefault: "propose",
    riskLevel: "medium",
    planRequired: "growth",
    actions: ["dock_schedule", "assign_pick", "check_inventory", "receive_shipment", "verify_pick", "receive_item"],
  },
  {
    name: "weather-intelligence",
    description: "Weather-based route risk assessment and alerts",
    requiredIntegrations: [],
    optionalIntegrations: ["weather"],
    trustDefault: "auto_low_risk",
    riskLevel: "low",
    planRequired: "free",
    actions: ["current_weather", "route_weather", "weather_alerts", "daily_forecast"],
  },
  {
    name: "erp-integration",
    description: "Sync orders, inventory, and invoices with ERP systems",
    requiredIntegrations: [],
    optionalIntegrations: ["sap_b1", "tally_prime"],
    trustDefault: "propose",
    riskLevel: "high",
    planRequired: "enterprise",
    actions: ["sync_orders", "sync_inventory", "sync_invoices", "business_partner"],
  },
];

// ── Check if an integration is available ──

export function isIntegrationAvailable(integration: string): boolean {
  // Check if the MCP server exists and has required env vars
  const envKey = `${integration.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;
  return !!process.env[envKey] || integration === "scanner" || integration === "dockscheduler";
}

// ── Check if a capability is available for a plan ──

export function isCapabilityAvailableForPlan(
  capabilityName: string,
  plan: string
): { available: boolean; reason?: string } {
  const capability = AGENT_CAPABILITIES.find((c) => c.name === capabilityName);
  if (!capability) {
    return { available: false, reason: `Unknown capability: ${capabilityName}` };
  }

  const PLAN_ORDER = ["free", "starter", "growth", "enterprise"];
  const requiredIndex = PLAN_ORDER.indexOf(capability.planRequired);
  const userIndex = PLAN_ORDER.indexOf(plan);

  if (userIndex >= requiredIndex) {
    return { available: true };
  }

  return {
    available: false,
    reason: `Requires ${capability.planRequired} plan or higher (you have ${plan})`,
  };
}

// ── Get all capabilities for a plan ──

export function getCapabilitiesForPlan(plan: string): Array<AgentCapability & { available: boolean }> {
  return AGENT_CAPABILITIES.map((cap) => ({
    ...cap,
    available: isCapabilityAvailableForPlan(cap.name, plan).available,
  }));
}

// ── Get capability matrix (for dashboard) ──

export function getCapabilityMatrix(): Array<{
  name: string;
  description: string;
  integrations: { name: string; available: boolean }[];
  trustDefault: string;
  riskLevel: string;
  planRequired: string;
}> {
  return AGENT_CAPABILITIES.map((cap) => ({
    name: cap.name,
    description: cap.description,
    integrations: [
      ...cap.requiredIntegrations.map((i) => ({ name: i, available: isIntegrationAvailable(i) })),
      ...cap.optionalIntegrations.map((i) => ({ name: i, available: isIntegrationAvailable(i) })),
    ],
    trustDefault: cap.trustDefault,
    riskLevel: cap.riskLevel,
    planRequired: cap.planRequired,
  }));
}

// ── Check if a specific action is supported ──

export function isActionSupported(actionType: string): {
  supported: boolean;
  capability?: string;
  integrations: string[];
} {
  for (const cap of AGENT_CAPABILITIES) {
    if (cap.actions.includes(actionType)) {
      return {
        supported: true,
        capability: cap.name,
        integrations: [...cap.requiredIntegrations, ...cap.optionalIntegrations],
      };
    }
  }
  return { supported: false, integrations: [] };
}
