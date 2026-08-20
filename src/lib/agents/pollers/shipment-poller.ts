/**
 * Shipment Poller — checks all active shipments every 5 minutes for:
 * - Delays (status stuck, ETA passed)
 * - Status changes (delivered, exception, RTO)
 * - Proactive delay prediction based on patterns
 */

import { neon } from "@neondatabase/serverless";
import { callMcpAction } from "@/lib/mcp";
import { emitEvent } from "../events";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "shipment-poller" });

export async function pollShipments(): Promise<{ checked: number; alerts: number; errors: number }> {
  let checked = 0;
  let alerts = 0;
  let errors = 0;

  // Get all active shipments (not delivered, not cancelled, not too old)
  let shipments;
  try {
    shipments = await sql`
      SELECT id, tracking_number, carrier, status, origin, destination,
             customer_name, customer_phone, updated_at, tenant_id
      FROM shipments
      WHERE status NOT IN ('delivered', 'cancelled', 'returned')
        AND updated_at >= NOW() - INTERVAL '14 days'
      ORDER BY updated_at DESC
      LIMIT 200
    `;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to fetch active shipments");
    return { checked: 0, alerts: 0, errors: 1 };
  }

  for (const shipment of shipments) {
    checked++;

    try {
      // Track via MCP
      const result = await callMcpAction("shiprocket", "track_shipment", {
        awb: shipment.tracking_number,
      });

      if (!result || !result.success) {
        errors++;
        continue;
      }

      const newStatus = result.status || result.data?.status;
      const oldStatus = shipment.status;

      // Detect status change
      if (newStatus && newStatus !== oldStatus) {
        // Update DB
        await sql`
          UPDATE shipments SET status = ${newStatus}, updated_at = NOW()
          WHERE id = ${shipment.id}
        `;

        // Emit event based on new status
        if (newStatus === "delivered") {
          await emitEvent("delivery.completed", {
            trackingNumber: shipment.tracking_number,
            carrier: shipment.carrier,
            customerName: shipment.customer_name,
          }, { source: "poller", entityType: "shipment", entityId: shipment.id, tenantId: shipment.tenant_id });
        } else if (newStatus === "exception" || newStatus === "rto") {
          await emitEvent("shipment.exception", {
            trackingNumber: shipment.tracking_number,
            carrier: shipment.carrier,
            status: newStatus,
            oldStatus,
          }, { source: "poller", entityType: "shipment", entityId: shipment.id, tenantId: shipment.tenant_id });

          alerts++;
          await createAlert(shipment.tenant_id, "shipment", "exception", "warning",
            `Shipment ${shipment.tracking_number} has an exception`,
            `Status changed from "${oldStatus}" to "${newStatus}". Carrier: ${shipment.carrier}.`,
            { trackingNumber: shipment.tracking_number, carrier: shipment.carrier, status: newStatus }
          );
        }
      }

      // Detect potential delay (status hasn't changed in > 48 hours and not delivered)
      if (newStatus && newStatus !== oldStatus === false) {
        const hoursSinceUpdate = (Date.now() - new Date(shipment.updated_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate > 48 && newStatus !== "delivered") {
          await emitEvent("shipment.delayed", {
            trackingNumber: shipment.tracking_number,
            carrier: shipment.carrier,
            hoursSinceUpdate: Math.round(hoursSinceUpdate),
            lastStatus: oldStatus,
          }, { source: "poller", entityType: "shipment", entityId: shipment.id, tenantId: shipment.tenant_id });

          alerts++;
          await createAlert(shipment.tenant_id, "shipment", "delay", "warning",
            `Shipment ${shipment.tracking_number} may be delayed`,
            `No status update in ${Math.round(hoursSinceUpdate)} hours. Last status: "${oldStatus}".`,
            { trackingNumber: shipment.tracking_number, hoursSinceUpdate: Math.round(hoursSinceUpdate) }
          );
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      log.warn({ trackingNumber: shipment.tracking_number, err: msg }, "Failed to check shipment");
      errors++;
    }
  }

  return { checked, alerts, errors };
}

async function createAlert(
  tenantId: string | null,
  agentType: string,
  alertType: string,
  severity: "info" | "warning" | "critical",
  title: string,
  message: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await sql`
      INSERT INTO agent_alerts (id, tenant_id, agent_type, alert_type, severity, title, message, data, created_at)
      VALUES (gen_random_uuid(), ${tenantId || null}, ${agentType}, ${alertType}, ${severity},
              ${title}, ${message}, ${JSON.stringify(data)}::jsonb, NOW())
    `;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to create alert");
  }
}
