/**
 * Daily Report Poller — generates a logistics summary every morning:
 * - Active shipments count + status breakdown
 * - Low stock items count
 * - Fleet utilization
 * - Pending approvals
 * - Alerts generated today
 */

import { neon } from "@neondatabase/serverless";
import { emitEvent } from "../events";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "daily-report" });

export async function pollDailyReport(): Promise<{ checked: number; alerts: number; errors: number }> {
  let errors = 0;

  try {
    // Gather stats
    const [shipmentStats] = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'delivered')::int as delivered,
        COUNT(*) FILTER (WHERE status = 'in_transit')::int as in_transit,
        COUNT(*) FILTER (WHERE status = 'exception')::int as exceptions,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending
      FROM shipments
      WHERE updated_at >= NOW() - INTERVAL '24 hours'
    `;

    const [inventoryStats] = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE quantity <= reorder_point)::int as low_stock,
        COUNT(*) FILTER (WHERE quantity = 0)::int as out_of_stock
      FROM inventory_items
    `;

    const [fleetStats] = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'active')::int as active,
        COUNT(*) FILTER (WHERE status = 'maintenance')::int as maintenance
      FROM vehicles
    `;

    const [alertStats] = await sql`
      SELECT COUNT(*)::int as total
      FROM agent_alerts
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    const [approvalStats] = await sql`
      SELECT COUNT(*)::int as pending
      FROM agent_approvals
      WHERE status = 'pending'
    `;

    const report = {
      shipments: {
        total: shipmentStats?.total || 0,
        delivered: shipmentStats?.delivered || 0,
        inTransit: shipmentStats?.in_transit || 0,
        exceptions: shipmentStats?.exceptions || 0,
        pending: shipmentStats?.pending || 0,
      },
      inventory: {
        total: inventoryStats?.total || 0,
        lowStock: inventoryStats?.low_stock || 0,
        outOfStock: inventoryStats?.out_of_stock || 0,
      },
      fleet: {
        total: fleetStats?.total || 0,
        active: fleetStats?.active || 0,
        maintenance: fleetStats?.maintenance || 0,
      },
      alerts24h: alertStats?.total || 0,
      pendingApprovals: approvalStats?.pending || 0,
      generatedAt: new Date().toISOString(),
    };

    // Emit as event
    await emitEvent("daily.report", report, { source: "poller" });

    log.info({ report }, "Daily report generated");

    // Create a summary alert
    await sql`
      INSERT INTO agent_alerts (id, tenant_id, agent_type, alert_type, severity, title, message, data, created_at)
      VALUES (gen_random_uuid(), NULL, 'system', 'daily_report', 'info',
              'Daily Logistics Report',
              ${`${report.shipments.total} shipments active, ${report.inventory.lowStock} low-stock items, ${report.fleet.active} vehicles on road.`},
              ${JSON.stringify(report)}::jsonb, NOW())
    `;

    return { checked: 1, alerts: 1, errors: 0 };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to generate daily report");
    return { checked: 0, alerts: 0, errors: 1 };
  }
}
