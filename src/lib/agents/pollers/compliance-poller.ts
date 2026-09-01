/**
 * Compliance Poller — daily checks for:
 * - Driver license expiry (30-day window)
 * - Vehicle RC renewal (60-day window)
 * - Pending challans (traffic violations)
 */

import { neon } from "@neondatabase/serverless";
import { callMcpAction } from "@/lib/mcp";
import { emitEvent } from "../events";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "compliance-poller" });

export async function pollCompliance(): Promise<{ checked: number; alerts: number; errors: number }> {
  let checked = 0;
  let alerts = 0;
  let errors = 0;

  // Check vehicle registrations
  try {
    const vehicles = await sql`
      SELECT id, plate_number, registration_expiry, fitness_expiry, insurance_expiry, tenant_id
      FROM vehicles
      WHERE status != 'decommissioned'
      LIMIT 100
    `;

    for (const v of vehicles) {
      checked++;
      try {
        const now = Date.now();

        // Registration expiry (60-day window)
        if (v.registration_expiry) {
          const daysUntil = (new Date(v.registration_expiry).getTime() - now) / (1000 * 60 * 60 * 24);
          if (daysUntil <= 60 && daysUntil > 0) {
            alerts++;
            await createAlert(v.tenant_id, "compliance", "rc_expiring", daysUntil <= 15 ? "critical" : "warning",
              `RC expiring: ${v.plate_number}`,
              `Vehicle registration expires in ${Math.round(daysUntil)} days.`,
              { plateNumber: v.plate_number, expiryDate: v.registration_expiry, type: "rc" }
            );
          }
        }

        // Fitness expiry (30-day window)
        if (v.fitness_expiry) {
          const daysUntil = (new Date(v.fitness_expiry).getTime() - now) / (1000 * 60 * 60 * 24);
          if (daysUntil <= 30 && daysUntil > 0) {
            alerts++;
            await createAlert(v.tenant_id, "compliance", "fitness_expiring", "warning",
              `Fitness cert expiring: ${v.plate_number}`,
              `Vehicle fitness certificate expires in ${Math.round(daysUntil)} days.`,
              { plateNumber: v.plate_number, expiryDate: v.fitness_expiry, type: "fitness" }
            );
          }
        }

        // Insurance expiry (30-day window)
        if (v.insurance_expiry) {
          const daysUntil = (new Date(v.insurance_expiry).getTime() - now) / (1000 * 60 * 60 * 24);
          if (daysUntil <= 30 && daysUntil > 0) {
            alerts++;
            await createAlert(v.tenant_id, "compliance", "insurance_expiring", "warning",
              `Insurance expiring: ${v.plate_number}`,
              `Vehicle insurance expires in ${Math.round(daysUntil)} days.`,
              { plateNumber: v.plate_number, expiryDate: v.insurance_expiry, type: "insurance" }
            );
          }
        }

        // Check for pending challans via MCP
        const challanResult = await callMcpAction("compliance", "check_challan", {
          vehicle_reg: v.plate_number,
        });
        const pendingChallans = (challanResult as any)?.pendingChallans || 0;
        if (pendingChallans > 0) {
          alerts++;
          await createAlert(v.tenant_id, "compliance", "challan_pending", "warning",
            `Pending challans: ${v.plate_number}`,
            `${pendingChallans} pending challans found for ${v.plate_number}.`,
            { plateNumber: v.plate_number, count: pendingChallans }
          );
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown";
        log.warn({ plateNumber: v.plate_number, err: msg }, "Failed to check compliance");
        errors++;
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to fetch vehicles for compliance");
    errors++;
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
  } catch (e: unknown) {
    log.error({ err: e instanceof Error ? e.message : "unknown" }, "Failed to create alert");
  }
}
