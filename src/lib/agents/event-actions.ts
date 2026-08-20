/**
 * Event Actions — maps events to agent responses.
 *
 * When an event fires, these handlers:
 * 1. Evaluate trust level (auto-execute or require approval)
 * 2. Execute MCP actions if trusted
 * 3. Create alerts
 * 4. Log to audit trail
 */

import { onEvent, emitEvent, type AgentEvent } from "./events";
import { evaluateAction } from "./trust";
import { auditLog } from "./audit-trail";
import { callMcpAction } from "@/lib/mcp";
import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "event-actions" });

// ── Helper: create alert ──

async function createAlert(
  tenantId: string | null,
  agentType: string,
  alertType: string,
  severity: "info" | "warning" | "critical",
  title: string,
  message: string,
  data: Record<string, unknown>
): Promise<string> {
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO agent_alerts (id, tenant_id, agent_type, alert_type, severity, title, message, data, created_at)
    VALUES (${id}, ${tenantId || null}, ${agentType}, ${alertType}, ${severity},
            ${title}, ${message}, ${JSON.stringify(data)}::jsonb, NOW())
  `;
  return id;
}

// ── Helper: create approval request ──

async function createApprovalRequest(
  tenantId: string | null,
  event: AgentEvent,
  agentType: string,
  actionType: string,
  description: string,
  riskScore: number,
  inputData: Record<string, unknown>
): Promise<string> {
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO agent_approvals (id, tenant_id, alert_id, user_id, agent_type, action_type,
                                 action_description, risk_score, input_data, reasoning, status, created_at)
    VALUES (${id}, ${tenantId || null}, NULL, 'system', ${agentType}, ${actionType},
            ${description}, ${riskScore}, ${JSON.stringify(inputData)}::jsonb,
            'Auto-generated approval request', 'pending', NOW())
  `;
  return id;
}

// ── Register Event Handlers ──

export function registerEventHandlers(): void {
  // ── Shipment Delayed ──
  onEvent("shipment.delayed", async (event) => {
    const start = Date.now();
    const { trackingNumber, carrier, hoursSinceUpdate } = event.data;

    // Check trust level
    const trust = await evaluateAction(event.tenantId, "shipment_tracking", "reroute_shipment", event.data);

    if (!trust.allowed) {
      // Create approval request
      await createApprovalRequest(
        event.tenantId || null, event, "shipment_tracking", "reroute_shipment",
        `Suggest reroute for delayed shipment ${trackingNumber} (no update in ${hoursSinceUpdate || "?"}h)`,
        trust.risk.score, event.data
      );
      await auditLog({
        tenantId: event.tenantId || null, agentType: "shipment_tracking", action: "reroute_shipment",
        inputData: event.data, outputData: { approvalRequired: true },
        riskScore: trust.risk.score, trustLevel: trust.trustLevel, mode: "rejected",
        durationMs: Date.now() - start, success: true,
      });
      return;
    }

    // Auto-execute: check weather for route
    try {
      const weather = await callMcpAction("weather", "route_weather", {
        origin: event.data.origin || "Mumbai",
        destination: event.data.destination || "Delhi",
      });

      await createAlert(
        event.tenantId || null, "shipment_tracking", "delay_detected", "warning",
        `Shipment delayed: ${trackingNumber}`,
        `No status update in ${hoursSinceUpdate || "?"} hours. Weather risk: ${weather?.overallRisk || "unknown"}.`,
        { trackingNumber, carrier, weather: weather?.overallRisk, hoursSinceUpdate }
      );

      await auditLog({
        tenantId: event.tenantId || null, agentType: "shipment_tracking", action: "delay_analysis",
        inputData: event.data, outputData: weather || {},
        riskScore: trust.risk.score, trustLevel: trust.trustLevel, mode: "auto",
        durationMs: Date.now() - start, success: true,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      log.error({ err: msg }, "Failed to handle shipment delay");
    }
  });

  // ── Stock Below Reorder ──
  onEvent("stock.below_reorder", async (event) => {
    const start = Date.now();
    const { sku, name, quantity, reorderPoint } = event.data;

    const trust = await evaluateAction(event.tenantId, "inventory_management", "reorder_stock", event.data);

    if (!trust.allowed) {
      await createApprovalRequest(
        event.tenantId || null, event, "inventory_management", "reorder_stock",
        `Reorder ${name} (SKU: ${sku}) — current stock ${quantity}, reorder point ${reorderPoint}`,
        trust.risk.score, event.data
      );
      return;
    }

    // Auto: create suggestion alert
    const suggestedQty = ((reorderPoint as number) || 10) * 2 - ((quantity as number) || 0);
    await createAlert(
      event.tenantId || null, "inventory_management", "reorder_suggested", "info",
      `Reorder suggested: ${sku}`,
      `${name} has ${quantity} units. Suggested order: ${suggestedQty} units.`,
      { sku, name, currentStock: quantity, reorderPoint, suggestedQty }
    );

    await auditLog({
      tenantId: event.tenantId || null, agentType: "inventory_management", action: "reorder_suggestion",
      inputData: event.data, outputData: { suggestedQty },
      riskScore: trust.risk.score, trustLevel: trust.trustLevel, mode: "auto",
      durationMs: Date.now() - start, success: true,
    });
  });

  // ── Stock Out of Stock ──
  onEvent("stock.out_of_stock", async (event) => {
    const start = Date.now();
    const { sku, name, warehouse } = event.data;

    // Always create critical alert for out-of-stock
    await createAlert(
      event.tenantId || null, "inventory_management", "out_of_stock", "critical",
      `OUT OF STOCK: ${sku}`,
      `"${name}" in ${warehouse || "main warehouse"} is completely empty. Immediate action required.`,
      event.data
    );

    // Also emit reorder event
    await emitEvent("stock.below_reorder", event.data, {
      source: "system", entityType: "inventory",
    });

    await auditLog({
      tenantId: event.tenantId || null, agentType: "inventory_management", action: "out_of_stock_alert",
      inputData: event.data, outputData: { critical: true },
      riskScore: 0, trustLevel: "full", mode: "auto",
      durationMs: Date.now() - start, success: true,
    });
  });

  // ── Fleet Maintenance Due ──
  onEvent("fleet.maintenance_due", async (event) => {
    const start = Date.now();
    const trust = await evaluateAction(event.tenantId, "fleet_management", "schedule_maintenance", event.data);

    if (!trust.allowed) {
      await createApprovalRequest(
        event.tenantId || null, event, "fleet_management", "schedule_maintenance",
        `Schedule maintenance for ${event.data.plateNumber} (${event.data.kmOverdue} km overdue)`,
        trust.risk.score, event.data
      );
      return;
    }

    await createAlert(
      event.tenantId || null, "fleet_management", "maintenance_due", "warning",
      `Maintenance due: ${event.data.plateNumber}`,
      `${event.data.plateNumber} is ${event.data.kmOverdue} km overdue for service.`,
      event.data
    );

    await auditLog({
      tenantId: event.tenantId || null, agentType: "fleet_management", action: "maintenance_alert",
      inputData: event.data, outputData: { scheduled: false },
      riskScore: trust.risk.score, trustLevel: trust.trustLevel, mode: "auto",
      durationMs: Date.now() - start, success: true,
    });
  });

  // ── License Expiring ──
  onEvent("compliance.license_expiring", async (event) => {
    await createAlert(
      event.tenantId || null, "compliance", "license_expiring", "critical",
      `License expiring: ${event.data.name || event.data.driverName}`,
      `Driving license expires in ${event.data.daysUntilExpiry} days.`,
      event.data
    );
  });

  // ── Delivery Completed ──
  onEvent("delivery.completed", async (event) => {
    await createAlert(
      event.tenantId || null, "shipment_tracking", "delivery_completed", "info",
      `Delivered: ${event.data.trackingNumber}`,
      `Shipment ${event.data.trackingNumber} has been delivered successfully.`,
      event.data
    );
  });

  // ── Daily Report ──
  onEvent("daily.report", async (event) => {
    log.info({ report: event.data }, "Daily report event received");
    // Report is already stored in agent_alerts by the daily-report poller
  });

  log.info("Event handlers registered");
}
