/**
 * Audit logging — records who did what, when, with what before/after values.
 * Uses the existing `audit_logs` Prisma model (already in schema).
 *
 * Usage:
 *   await auditLog({ userId, action: "create", entityType: "shipment", entityId: id, newValues: data });
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

interface AuditLogParams {
  userId?: string;
  tenantId?: string;
  action: string; // "create" | "update" | "delete" | "login" | "logout" | "export" etc.
  entityType: string; // "shipment" | "inventory" | "route" | "fleet" | "integration" etc.
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Best-effort audit log — never throws, never blocks the main request.
 * Uses raw SQL since the app uses Neon serverless, not Prisma client.
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    const {
      userId,
      tenantId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    } = params;

    await sql`
      INSERT INTO audit_logs (
        id, user_id, tenant_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, user_agent, created_at
      ) VALUES (
        gen_random_uuid(),
        ${userId || null},
        ${tenantId || null},
        ${action},
        ${entityType},
        ${entityId},
        ${oldValues ? JSON.stringify(oldValues) : null}::jsonb,
        ${newValues ? JSON.stringify(newValues) : null}::jsonb,
        ${ipAddress || null},
        ${userAgent || null},
        NOW()
      )
    `;
  } catch (_e) { /* non-critical, intentionally silent */
    // Audit logging should never fail the main request
    // Log to stderr at minimum for debugging
    console.error("[AuditLog] Failed to write audit record:", params.action, params.entityType, params.entityId);
  }
}

/**
 * Helper to extract IP and User-Agent from a Request object.
 */
export function extractRequestMeta(request: Request): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  };
}
