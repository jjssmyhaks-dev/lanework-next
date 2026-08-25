/**
 * Agent Event System — typed event emitter for autonomous agent actions.
 *
 * Events are stored in the DB for audit trail and dispatched to registered
 * handlers that trigger MCP actions, notifications, and workflows.
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "agent-events" });

// ── Event Types ──

export type AgentEventType =
  | "shipment.created"
  | "shipment.delayed"
  | "shipment.delivered"
  | "shipment.exception"
  | "stock.below_reorder"
  | "stock.out_of_stock"
  | "stock.received"
  | "fleet.maintenance_due"
  | "fleet.driver_overtime"
  | "fleet.offline"
  | "compliance.license_expiring"
  | "compliance.rc_expiring"
  | "compliance.challan_pending"
  | "order.new"
  | "order.cancelled"
  | "delivery.completed"
  | "delivery.failed"
  | "daily.report"
  | "system.health_check";

export interface AgentEvent {
  id: string;
  eventType: AgentEventType;
  source: "poller" | "webhook" | "user" | "system";
  entityType?: string;
  entityId?: string;
  data: Record<string, unknown>;
  tenantId?: string;
  createdAt: Date;
}

export type EventAction = (event: AgentEvent) => Promise<void>;

// ── Handler Registry ──

const handlers = new Map<AgentEventType, EventAction[]>();

/**
 * Register a handler for an event type.
 */
export function onEvent(type: AgentEventType, handler: EventAction): void {
  if (!handlers.has(type)) handlers.set(type, []);
  handlers.get(type)!.push(handler);
}

/**
 * Emit an event — stores in DB and dispatches to handlers.
 */
export async function emitEvent(
  type: AgentEventType,
  data: Record<string, unknown>,
  opts: {
    source?: AgentEvent["source"];
    entityType?: string;
    entityId?: string;
    tenantId?: string;
  } = {}
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();

  // Store in DB
  try {
    await sql`
      INSERT INTO agent_events (id, tenant_id, event_type, source, entity_type, entity_id, data, created_at)
      VALUES (${id}, ${opts.tenantId || null}, ${type}, ${opts.source || "system"},
              ${opts.entityType || null}, ${opts.entityId || null},
              ${JSON.stringify(data)}::jsonb, ${now})
    `;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to store event in DB");
  }

  const event: AgentEvent = {
    id,
    eventType: type,
    source: opts.source || "system",
    entityType: opts.entityType,
    entityId: opts.entityId,
    data,
    tenantId: opts.tenantId,
    createdAt: now,
  };

  log.info({ eventType: type, source: event.source, entityId: opts.entityId }, "Event emitted");

  // Broadcast to SSE subscribers
  try {
    const { broadcastAgentEvent } = await import("@/app/api/agents/stream/route");
    broadcastAgentEvent({
      id,
      eventType: type,
      tenantId: opts.tenantId,
      data,
      source: opts.source || "system",
      timestamp: now.toISOString(),
    });
  } catch {
    // SSE module not available (e.g., during build) — ignore
  }

  // Dispatch to handlers (non-blocking, catch errors per handler)
  const eventHandlers = handlers.get(type) || [];
  const wildcardHandlers = handlers.get("*" as AgentEventType) || [];
  const allHandlers = [...eventHandlers, ...wildcardHandlers];

  for (const handler of allHandlers) {
    handler(event).catch((err) => {
      log.error({ err, eventType: type, handlerName: handler.name }, "Event handler failed");
    });
  }

  // Mark as processed
  try {
    await sql`UPDATE agent_events SET processed = true, processed_at = NOW() WHERE id = ${id}`;
  } catch {
    // Best effort
  }

  return id;
}

/**
 * Get recent events for a tenant.
 */
export async function getRecentEvents(
  tenantId: string | null,
  opts: { limit?: number; eventType?: AgentEventType; unprocessedOnly?: boolean } = {}
): Promise<AgentEvent[]> {
  const limit = opts.limit || 50;

  let rows;
  if (opts.eventType && opts.unprocessedOnly) {
    rows = await sql`
      SELECT * FROM agent_events
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
        AND event_type = ${opts.eventType}
        AND processed = false
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  } else if (opts.eventType) {
    rows = await sql`
      SELECT * FROM agent_events
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
        AND event_type = ${opts.eventType}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  } else if (opts.unprocessedOnly) {
    rows = await sql`
      SELECT * FROM agent_events
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
        AND processed = false
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  } else {
    rows = await sql`
      SELECT * FROM agent_events
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  }

  return rows.map((r) => ({
    id: r.id,
    eventType: r.event_type,
    source: r.source,
    entityType: r.entity_type,
    entityId: r.entity_id,
    data: typeof r.data === "string" ? JSON.parse(r.data) : r.data,
    tenantId: r.tenant_id,
    createdAt: r.created_at,
  }));
}
