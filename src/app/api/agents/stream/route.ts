/**
 * /api/agents/stream — SSE endpoint for real-time agent activity.
 *
 * Streams agent events, workflow steps, and alerts as they happen.
 * Client subscribes with ?tenant_id=xxx&types=shipment.delayed,stock.below_reorder
 */

import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth";

// ── In-memory subscriber registry ──

type Subscriber = {
  id: string;
  controller: ReadableStreamDefaultController;
  tenantId: string | null;
  types: string[];
  lastEventId: string;
};

const subscribers = new Map<string, Subscriber>();

/**
 * Broadcast an event to all matching subscribers.
 * Called from emitEvent in the event system.
 */
export function broadcastAgentEvent(event: {
  id: string;
  eventType: string;
  tenantId?: string | null;
  data: Record<string, unknown>;
  source: string;
  timestamp: string;
}): void {
  for (const [, sub] of subscribers) {
    // Check tenant match
    if (sub.tenantId && event.tenantId && sub.tenantId !== event.tenantId) continue;

    // Check type filter
    if (sub.types.length > 0 && !sub.types.includes(event.eventType)) continue;

    const sseMessage = [
      `id: ${event.id}`,
      `event: ${event.eventType}`,
      `data: ${JSON.stringify({
        id: event.id,
        eventType: event.eventType,
        data: event.data,
        source: event.source,
        timestamp: event.timestamp,
      })}`,
      "",
      "",
    ].join("\n");

    try {
      const encoder = new TextEncoder();
      sub.controller.enqueue(encoder.encode(sseMessage));
    } catch {
      // Subscriber disconnected
      subscribers.delete(sub.id);
    }
  }
}

// ── Keep-alive ping ──

const PING_INTERVAL_MS = 30_000;

function startKeepAlive(controller: ReadableStreamDefaultController, subId: string): NodeJS.Timeout {
  return setInterval(() => {
    try {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`: ping\n\n`));
    } catch {
      subscribers.delete(subId);
    }
  }, PING_INTERVAL_MS);
}

// ── GET handler ──

export const GET = withAuth(async (request, user) => {
  const url = new URL(request.url);
  const tenantId = user?.id || url.searchParams.get("tenant_id");
  const typesParam = url.searchParams.get("types") || "";
  const types = typesParam ? typesParam.split(",").map((t) => t.trim()) : [];
  const subscriberId = crypto.randomUUID();

  let keepAlive: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const welcomeMessage = [
        `event: connected`,
        `data: ${JSON.stringify({ subscriberId, tenantId, types, connectedAt: new Date().toISOString() })}`,
        "",
        "",
      ].join("\n");
      controller.enqueue(encoder.encode(welcomeMessage));

      // Register subscriber
      subscribers.set(subscriberId, {
        id: subscriberId,
        controller,
        tenantId,
        types,
        lastEventId: "",
      });

      // Start keep-alive
      keepAlive = startKeepAlive(controller, subscriberId);
    },
    cancel() {
      if (keepAlive) clearInterval(keepAlive);
      subscribers.delete(subscriberId);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

// ── Utility: get subscriber count ──

export function getSubscriberCount(): number {
  return subscribers.size;
}
