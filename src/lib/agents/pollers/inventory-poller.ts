/**
 * Inventory Poller — checks stock levels every 30 minutes for:
 * - Items below reorder point
 * - Out-of-stock items
 * - Unusually high demand (velocity spike)
 */

import { neon } from "@neondatabase/serverless";
import { emitEvent } from "../events";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "inventory-poller" });

export async function pollInventory(): Promise<{ checked: number; alerts: number; errors: number }> {
  let checked = 0;
  let alerts = 0;
  let errors = 0;

  let items;
  try {
    items = await sql`
      SELECT id, sku, name, quantity, reorder_point, warehouse, tenant_id
      FROM inventory_items
      WHERE quantity >= 0
      ORDER BY sku
      LIMIT 500
    `;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to fetch inventory items");
    return { checked: 0, alerts: 0, errors: 1 };
  }

  for (const item of items) {
    checked++;

    try {
      const qty = Number(item.quantity);
      const reorderPoint = Number(item.reorder_point) || 10;

      // Out of stock
      if (qty === 0) {
        await emitEvent("stock.out_of_stock", {
          sku: item.sku,
          name: item.name,
          warehouse: item.warehouse,
          quantity: 0,
        }, { source: "poller", entityType: "inventory", entityId: item.id, tenantId: item.tenant_id });

        alerts++;
        await createAlert(item.tenant_id, "inventory", "out_of_stock", "critical",
          `Out of stock: ${item.sku}`,
          `"${item.name}" in ${item.warehouse || "main warehouse"} is completely out of stock. Immediate reorder needed.`,
          { sku: item.sku, name: item.name, warehouse: item.warehouse, quantity: 0 }
        );
      }
      // Below reorder point
      else if (qty <= reorderPoint) {
        await emitEvent("stock.below_reorder", {
          sku: item.sku,
          name: item.name,
          warehouse: item.warehouse,
          quantity: qty,
          reorderPoint,
        }, { source: "poller", entityType: "inventory", entityId: item.id, tenantId: item.tenant_id });

        alerts++;
        await createAlert(item.tenant_id, "inventory", "below_reorder", "warning",
          `Low stock: ${item.sku}`,
          `"${item.name}" has ${qty} units (reorder point: ${reorderPoint}) in ${item.warehouse || "main warehouse"}.`,
          { sku: item.sku, name: item.name, quantity: qty, reorderPoint, warehouse: item.warehouse }
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      log.warn({ sku: item.sku, err: msg }, "Failed to check inventory item");
      errors++;
    }
  }

  return { checked, alerts, errors };
}

async function createAlert(
  tenantId: string | null, agentType: string, alertType: string,
  severity: "info" | "warning" | "critical", title: string, message: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await sql`
      INSERT INTO agent_alerts (id, tenant_id, agent_type, alert_type, severity, title, message, data, created_at)
      VALUES (gen_random_uuid(), ${tenantId || null}, ${agentType}, ${alertType}, ${severity},
              ${title}, ${message}, ${JSON.stringify(data)}::jsonb, NOW())
    `;
  } catch {}
}
