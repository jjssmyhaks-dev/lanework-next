/**
 * Agent Memory — per-tenant contextual memory for smarter agent decisions.
 *
 * Stores:
 * - Last N decisions per entity (shipment, vehicle, inventory item)
 * - User rejections with reasons
 * - User preferences (e.g., "always use BlueDart for Delhi shipments")
 * - Contextual notes (e.g., "customer X prefers morning delivery")
 *
 * Memory decays over time — recent memories have higher weight.
 * Agents query memory before making decisions.
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "agent-memory" });

// ── Types ──

export type MemoryType =
  | "decision"           // An action the agent took
  | "rejection"          // A user-rejected action with reason
  | "preference"         // A learned user preference
  | "context"            // Contextual note about an entity
  | "outcome";           // Measured outcome of a past action

export interface MemoryEntry {
  id: string;
  tenantId: string;
  entityType: string;       // "shipment", "vehicle", "inventory", "system"
  entityId: string;         // specific entity ID or "global"
  memoryType: MemoryType;
  key: string;              // e.g., "last_reroute", "preferred_carrier"
  value: Record<string, unknown>;
  confidence: number;       // 0-1, decays over time
  accessCount: number;      // how often this memory was queried
  createdAt: string;
  expiresAt: string | null;
}

// ── Store a memory ──

export async function storeMemory(opts: {
  tenantId: string;
  entityType: string;
  entityId: string;
  memoryType: MemoryType;
  key: string;
  value: Record<string, unknown>;
  confidence?: number;
  ttlDays?: number;
}): Promise<string> {
  const id = crypto.randomUUID();
  const confidence = opts.confidence ?? 1.0;
  const ttlDays = opts.ttlDays ?? 90;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Upsert: update if same tenant + entity + key exists
    const existing = await sql`
      SELECT id, confidence FROM agent_memory
      WHERE tenant_id = ${opts.tenantId}
        AND entity_type = ${opts.entityType}
        AND entity_id = ${opts.entityId}
        AND key = ${opts.key}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Blend old and new confidence (EMA)
      const newConfidence = Math.min(existing[0].confidence * 0.7 + confidence * 0.3, 1.0);
      await sql`
        UPDATE agent_memory
        SET value = ${JSON.stringify(opts.value)}::jsonb,
            confidence = ${newConfidence},
            access_count = access_count + 1,
            updated_at = NOW(),
            expires_at = ${expiresAt}::timestamptz
        WHERE id = ${existing[0].id}
      `;
      log.debug({ id: existing[0].id, key: opts.key }, "Updated existing memory");
      return existing[0].id;
    }

    await sql`
      INSERT INTO agent_memory (id, tenant_id, entity_type, entity_id, memory_type, key, value, confidence, access_count, created_at, updated_at, expires_at)
      VALUES (${id}, ${opts.tenantId}, ${opts.entityType}, ${opts.entityId}, ${opts.memoryType},
              ${opts.key}, ${JSON.stringify(opts.value)}::jsonb, ${confidence}, 0, NOW(), NOW(), ${expiresAt}::timestamptz)
    `;

    log.debug({ id, key: opts.key, entity: `${opts.entityType}:${opts.entityId}` }, "Memory stored");
    return id;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to store memory");
    return id;
  }
}

// ── Query memories ──

export async function queryMemory(opts: {
  tenantId?: string;
  entityType?: string;
  entityId?: string;
  memoryType?: MemoryType;
  key?: string;
  limit?: number;
} = {}): Promise<MemoryEntry[]> {
  const limit = opts.limit || 20;
  const tenantId = opts.tenantId || null;

  let rows;
  if (opts.entityId && opts.key) {
    rows = await sql`
      SELECT * FROM agent_memory
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
        AND (${opts.entityType || null}::text IS NULL OR entity_type = ${opts.entityType})
        AND entity_id = ${opts.entityId}
        AND key = ${opts.key}
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY confidence DESC, created_at DESC
      LIMIT ${limit}
    `;
  } else if (opts.entityId) {
    rows = await sql`
      SELECT * FROM agent_memory
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
        AND (${opts.entityType || null}::text IS NULL OR entity_type = ${opts.entityType})
        AND entity_id = ${opts.entityId}
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY confidence DESC, created_at DESC
      LIMIT ${limit}
    `;
  } else if (opts.key) {
    rows = await sql`
      SELECT * FROM agent_memory
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
        AND (${opts.entityType || null}::text IS NULL OR entity_type = ${opts.entityType})
        AND key = ${opts.key}
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY confidence DESC, created_at DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await sql`
      SELECT * FROM agent_memory
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
        AND (${opts.entityType || null}::text IS NULL OR entity_type = ${opts.entityType})
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY confidence DESC, created_at DESC
      LIMIT ${limit}
    `;
  }

  // Update access counts
  for (const row of rows) {
    sql`UPDATE agent_memory SET access_count = access_count + 1 WHERE id = ${row.id}`.catch(() => {});
  }

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    memoryType: r.memory_type,
    key: r.key,
    value: typeof r.value === "string" ? JSON.parse(r.value) : r.value,
    confidence: r.confidence,
    accessCount: r.access_count,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}

// ── Record a decision with memory ──

export async function recordDecision(
  tenantId: string,
  entityType: string,
  entityId: string,
  action: string,
  result: Record<string, unknown>
): Promise<void> {
  await storeMemory({
    tenantId,
    entityType,
    entityId,
    memoryType: "decision",
    key: `last_${action}`,
    value: { action, result, timestamp: new Date().toISOString() },
    confidence: 1.0,
    ttlDays: 90,
  });

  // Also maintain a rolling history (last 10 decisions per entity)
  const history = await queryMemory({
    tenantId,
    entityType,
    entityId,
    memoryType: "decision",
    key: `last_${action}`,
    limit: 10,
  });

  // Keep only last 10
  if (history.length > 10) {
    const toDelete = history.slice(10);
    for (const entry of toDelete) {
      sql`DELETE FROM agent_memory WHERE id = ${entry.id}`.catch(() => {});
    }
  }
}

// ── Record a rejection with reason ──

export async function recordRejection(
  tenantId: string,
  entityType: string,
  entityId: string,
  action: string,
  reason: string,
  context?: Record<string, unknown>
): Promise<void> {
  await storeMemory({
    tenantId,
    entityType,
    entityId,
    memoryType: "rejection",
    key: `rejected_${action}`,
    value: { action, reason, context, timestamp: new Date().toISOString() },
    confidence: 1.0,
    ttlDays: 90,
  });
}

// ── Store a user preference ──

export async function storePreference(
  tenantId: string,
  key: string,
  value: Record<string, unknown>
): Promise<void> {
  await storeMemory({
    tenantId,
    entityType: "system",
    entityId: "global",
    memoryType: "preference",
    key,
    value,
    confidence: 0.9,
    ttlDays: 365, // Preferences last longer
  });
}

// ── Get a user preference ──

export async function getPreference(
  tenantId: string,
  key: string
): Promise<Record<string, unknown> | null> {
  const memories = await queryMemory({
    tenantId,
    entityType: "system",
    entityId: "global",
    memoryType: "preference",
    key,
    limit: 1,
  });
  return memories.length > 0 ? memories[0].value : null;
}

// ── Get rejection count for an action ──

export async function getRejectionCount(
  tenantId: string,
  entityType: string,
  entityId: string,
  action: string,
  days: number = 30
): Promise<number> {
  try {
    const [row] = await sql`
      SELECT COUNT(*)::int as count FROM agent_memory
      WHERE tenant_id = ${tenantId}
        AND entity_type = ${entityType}
        AND entity_id = ${entityId}
        AND memory_type = 'rejection'
        AND key = ${`rejected_${action}`}
        AND created_at >= NOW() - (${days} || ' days')::interval
    `;
    return row?.count || 0;
  } catch (_e) { /* non-critical, intentionally silent */
    return 0;
  }
}

// ── Cleanup expired memories ──

export async function cleanupMemory(daysOld: number = 90): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM agent_memory
      WHERE expires_at < NOW()
        OR (created_at < NOW() - (${daysOld} || ' days')::interval AND access_count = 0)
    `;
    const count = (result as any).count || 0;
    if (count > 0) log.info({ count }, "Cleaned up expired memories");
    return count;
  } catch (_e) { /* non-critical, intentionally silent */
    return 0;
  }
}
