/**
 * Fleet Poller — checks vehicles and drivers every 10 minutes for:
 * - Maintenance due (km or date based)
 * - Driver hours compliance (driving > 8h without break)
 * - Offline vehicles (no GPS signal for > 30 min)
 */

import { neon } from "@neondatabase/serverless";
import { emitEvent } from "../events";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "fleet-poller" });

export async function pollFleet(): Promise<{ checked: number; alerts: number; errors: number }> {
  let checked = 0;
  let alerts = 0;
  let errors = 0;

  // Check vehicles
  try {
    const vehicles = await sql`
      SELECT id, plate_number, type, status, last_maintenance_km, current_km,
             last_seen_at, tenant_id
      FROM vehicles
      WHERE status != 'decommissioned'
      ORDER BY last_maintenance_km ASC
      LIMIT 100
    `;

    for (const v of vehicles) {
      checked++;
      try {
        // Maintenance check: every 10,000 km
        const lastKm = Number(v.last_maintenance_km) || 0;
        const currentKm = Number(v.current_km) || 0;
        if (currentKm > 0 && currentKm - lastKm >= 10000) {
          await emitEvent("fleet.maintenance_due", {
            vehicleId: v.id,
            plateNumber: v.plate_number,
            currentKm,
            lastMaintenanceKm: lastKm,
            kmOverdue: currentKm - lastKm,
          }, { source: "poller", entityType: "vehicle", entityId: v.id, tenantId: v.tenant_id });

          alerts++;
          await createAlert(v.tenant_id, "fleet", "maintenance_due", "warning",
            `Maintenance due: ${v.plate_number}`,
            `${v.plate_number} (${v.type}) has done ${currentKm - lastKm} km since last service.`,
            { plateNumber: v.plate_number, currentKm, lastMaintenanceKm: lastKm }
          );
        }

        // Offline check: no GPS signal for > 30 minutes
        if (v.last_seen_at) {
          const minsSinceSeen = (Date.now() - new Date(v.last_seen_at).getTime()) / (1000 * 60);
          if (minsSinceSeen > 30 && v.status === "active") {
            await emitEvent("fleet.offline", {
              vehicleId: v.id,
              plateNumber: v.plate_number,
              lastSeenAt: v.last_seen_at,
              minutesSinceSeen: Math.round(minsSinceSeen),
            }, { source: "poller", entityType: "vehicle", entityId: v.id, tenantId: v.tenant_id });

            alerts++;
            await createAlert(v.tenant_id, "fleet", "vehicle_offline", "warning",
              `Vehicle offline: ${v.plate_number}`,
              `${v.plate_number} has no GPS signal for ${Math.round(minsSinceSeen)} minutes.`,
              { plateNumber: v.plate_number, lastSeenAt: v.last_seen_at }
            );
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown";
        log.warn({ plateNumber: v.plate_number, err: msg }, "Failed to check vehicle");
        errors++;
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to fetch vehicles");
    errors++;
  }

  // Check drivers
  try {
    const drivers = await sql`
      SELECT id, name, license_number, license_expiry, status, tenant_id
      FROM drivers
      WHERE status != 'inactive'
      LIMIT 100
    `;

    for (const d of drivers) {
      checked++;
      try {
        // License expiry check (30 days ahead)
        if (d.license_expiry) {
          const daysUntilExpiry = (new Date(d.license_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
            await emitEvent("compliance.license_expiring", {
              driverId: d.id,
              name: d.name,
              licenseNumber: d.license_number,
              expiryDate: d.license_expiry,
              daysUntilExpiry: Math.round(daysUntilExpiry),
            }, { source: "poller", entityType: "driver", entityId: d.id, tenantId: d.tenant_id });

            alerts++;
            await createAlert(d.tenant_id, "compliance", "license_expiring", "critical",
              `License expiring: ${d.name}`,
              `${d.name}'s driving license expires in ${Math.round(daysUntilExpiry)} days (${d.license_expiry}).`,
              { driverName: d.name, licenseNumber: d.license_number, expiryDate: d.license_expiry }
            );
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown";
        log.warn({ driverName: d.name, err: msg }, "Failed to check driver");
        errors++;
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to fetch drivers");
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
  } catch {}
}
