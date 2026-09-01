/**
 * Dead Letter Queue — captures failed events for retry, inspection, or discard.
 *
 * When an event handler fails 3 times, it moves to the DLQ instead of being lost.
 * Operators can retry, inspect, or discard dead letters from the dashboard.
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "dlq" });

// ── Types ──

export interface DeadLetter {
  id: string;
  eventId: string;
  eventType: string;
  source: string;
  tenantId: string | null;
  data: Record<string, unknown>;
  error: string;
  attempts: number;
  lastAttemptAt: string;
  status: "pending" | "retrying" | "discarded" | "recovered";
  createdAt: string;
}

export interface DeadLetterStats {
  total: number;
  pending: number;
  retrying: number;
  discarded: number;
  recovered: number;
  oldestPending: string | null;
  avgAttempts: number;
}

// ── Push to DLQ ──

export async function pushToDeadLetter(opts: {
  eventId: string;
  eventType: string;
  source: string;
  tenantId?: string | null;
  data: Record<string, unknown>;
  error: string;
  attempts?: number;
}): Promise<string> {
  const id = crypto.randomUUID();

  try {
    // Try to insert new or update existing (dedup by event_id)
    const existing = await sql`
      SELECT id, attempts FROM agent_dead_letters
      WHERE event_id = ${opts.eventId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Update existing DLQ entry
      await sql`
        UPDATE agent_dead_letters
        SET attempts = ${opts.attempts || existing[0].attempts + 1},
            error = ${opts.error},
            last_attempt_at = NOW()
        WHERE id = ${existing[0].id}
      `;
      log.info({ eventId: opts.eventId, attempts: opts.attempts || existing[0].attempts + 1 }, "Updated existing DLQ entry");
      return existing[0].id;
    }

    await sql`
      INSERT INTO agent_dead_letters (id, event_id, event_type, source, tenant_id, data, error, attempts, status, last_attempt_at, created_at)
      VALUES (${id}, ${opts.eventId}, ${opts.eventType}, ${opts.source}, ${opts.tenantId || null},
              ${JSON.stringify(opts.data)}::jsonb, ${opts.error}, ${opts.attempts || 1}, 'pending', NOW(), NOW())
    `;

    log.info({ id, eventId: opts.eventId, eventType: opts.eventType }, "Event pushed to DLQ");
    return id;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to push to DLQ");
    return id;
  }
}

// ── Get dead letters ──

export async function getDeadLetters(opts: {
  tenantId?: string | null;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<DeadLetter[]> {
  const limit = opts.limit || 50;
  const offset = opts.offset || 0;

  let rows;
  if (opts.status && opts.tenantId) {
    rows = await sql`
      SELECT * FROM agent_dead_letters
      WHERE (${opts.tenantId}::text IS NULL OR tenant_id = ${opts.tenantId})
        AND status = ${opts.status}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (opts.status) {
    rows = await sql`
      SELECT * FROM agent_dead_letters
      WHERE status = ${opts.status}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (opts.tenantId) {
    rows = await sql`
      SELECT * FROM agent_dead_letters
      WHERE (${opts.tenantId}::text IS NULL OR tenant_id = ${opts.tenantId})
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    rows = await sql`
      SELECT * FROM agent_dead_letters
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    eventType: r.event_type,
    source: r.source,
    tenantId: r.tenant_id,
    data: typeof r.data === "string" ? JSON.parse(r.data) : r.data,
    error: r.error,
    attempts: r.attempts,
    lastAttemptAt: r.last_attempt_at,
    status: r.status,
    createdAt: r.created_at,
  }));
}

// ── Retry a dead letter ──

export async function retryDeadLetter(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const [row] = await sql`
      SELECT * FROM agent_dead_letters WHERE id = ${id} LIMIT 1
    `;

    if (!row) {
      return { success: false, error: "Dead letter not found" };
    }

    if (row.status === "discarded") {
      return { success: false, error: "Already discarded" };
    }

    // Mark as retrying
    await sql`
      UPDATE agent_dead_letters SET status = 'retrying' WHERE id = ${id}
    `;

    // Re-emit the event
    const { emitEvent } = await import("./events");
    const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;

    await emitEvent(row.event_type as any, data, {
      source: "dlq-retry" as any,
      entityType: row.event_type.split(".")[0],
      entityId: row.event_id,
      tenantId: row.tenant_id,
    });

    // Mark as recovered
    await sql`
      UPDATE agent_dead_letters SET status = 'recovered' WHERE id = ${id}
    `;

    log.info({ id, eventId: row.event_id }, "Dead letter recovered");
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg, id }, "Failed to retry dead letter");

    await sql`
      UPDATE agent_dead_letters SET status = 'pending', error = ${msg} WHERE id = ${id}
    `.catch(() => {});

    return { success: false, error: msg };
  }
}

// ── Discard a dead letter ──

export async function discardDeadLetter(id: string): Promise<boolean> {
  try {
    await sql`
      UPDATE agent_dead_letters SET status = 'discarded' WHERE id = ${id}
    `;
    log.info({ id }, "Dead letter discarded");
    return true;
  } catch (_e) { /* non-critical, intentionally silent */
    return false;
  }
}

// ── Get stats ──

export async function getDLQStats(): Promise<DeadLetterStats> {
  try {
    const [row] = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'retrying')::int as retrying,
        COUNT(*) FILTER (WHERE status = 'discarded')::int as discarded,
        COUNT(*) FILTER (WHERE status = 'recovered')::int as recovered,
        AVG(attempts)::float as avg_attempts
      FROM agent_dead_letters
    `;

    const [oldest] = await sql`
      SELECT created_at FROM agent_dead_letters
      WHERE status = 'pending'
      ORDER BY created_at ASC LIMIT 1
    `;

    return {
      total: row?.total || 0,
      pending: row?.pending || 0,
      retrying: row?.retrying || 0,
      discarded: row?.discarded || 0,
      recovered: row?.recovered || 0,
      oldestPending: oldest?.created_at || null,
      avgAttempts: Math.round((row?.avg_attempts || 0) * 10) / 10,
    };
  } catch (_e) { /* non-critical, intentionally silent */
    return { total: 0, pending: 0, retrying: 0, discarded: 0, recovered: 0, oldestPending: null, avgAttempts: 0 };
  }
}

// ── Auto-cleanup old entries ──

export async function cleanupDeadLetters(daysOld: number = 30): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM agent_dead_letters
      WHERE status IN ('discarded', 'recovered')
        AND created_at < NOW() - (${daysOld} || ' days')::interval
    `;
    const count = (result as any).count || 0;
    if (count > 0) log.info({ count, daysOld }, "Cleaned up old DLQ entries");
    return count;
  } catch (_e) { /* non-critical, intentionally silent */
    return 0;
  }
}
