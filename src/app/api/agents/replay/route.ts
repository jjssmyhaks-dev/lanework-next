/**
 * /api/agents/replay — Event replay endpoint.
 *
 * POST → re-emit events from a time window for debugging/recovery.
 * GET → get replayable events summary.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { neon } from "@neondatabase/serverless";
import { emitEvent } from "@/lib/agents/events";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "replay-api" });

// ── GET: summary of replayable events ──

export const GET = withAuth(async (request) => {
  try {
    const url = new URL(request.url);
    const hours = Math.min(Number(url.searchParams.get("hours") || "24"), 168); // Max 7 days
    const eventType = url.searchParams.get("event_type");

    let rows;
    if (eventType) {
      rows = await sql`
        SELECT
          event_type,
          source,
          COUNT(*)::int as count,
          MIN(created_at) as earliest,
          MAX(created_at) as latest,
          COUNT(*) FILTER (WHERE processed = false)::int as unprocessed
        FROM agent_events
        WHERE created_at >= NOW() - (${hours} || ' hours')::interval
          AND event_type = ${eventType}
        GROUP BY event_type, source
        ORDER BY count DESC
      `;
    } else {
      rows = await sql`
        SELECT
          event_type,
          source,
          COUNT(*)::int as count,
          MIN(created_at) as earliest,
          MAX(created_at) as latest,
          COUNT(*) FILTER (WHERE processed = false)::int as unprocessed
        FROM agent_events
        WHERE created_at >= NOW() - (${hours} || ' hours')::interval
        GROUP BY event_type, source
        ORDER BY count DESC
      `;
    }

    return NextResponse.json({
      windowHours: hours,
      totalGroups: rows.length,
      events: rows.map((r) => ({
        eventType: r.event_type,
        source: r.source,
        count: r.count,
        earliest: r.earliest,
        latest: r.latest,
        unprocessed: r.unprocessed,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

// ── POST: replay events ──

export const POST = withAuth(async (request) => {
  const rl = rateLimit(request, { maxRequests: 3, windowMs: 3_600_000, group: "replay" });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Replay rate limit exceeded. Max 3 per hour." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const {
      hours = 1,
      eventType,
      dryRun = false,
      limit = 100,
    } = body;

    const safeHours = Math.min(Number(hours), 24); // Max 24h replay
    const safeLimit = Math.min(Number(limit), 100); // Max 100 events

    // Fetch events to replay
    let events;
    if (eventType) {
      events = await sql`
        SELECT id, event_type, source, tenant_id, data, entity_type, entity_id, created_at
        FROM agent_events
        WHERE created_at >= NOW() - (${safeHours} || ' hours')::interval
          AND event_type = ${eventType}
        ORDER BY created_at ASC
        LIMIT ${safeLimit}
      `;
    } else {
      events = await sql`
        SELECT id, event_type, source, tenant_id, data, entity_type, entity_id, created_at
        FROM agent_events
        WHERE created_at >= NOW() - (${safeHours} || ' hours')::interval
        ORDER BY created_at ASC
        LIMIT ${safeLimit}
      `;
    }

    if (events.length === 0) {
      return NextResponse.json({ message: "No events found in the specified window", replayed: 0 });
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        wouldReplay: events.length,
        events: events.map((e) => ({
          id: e.id,
          eventType: e.event_type,
          source: e.source,
          createdAt: e.created_at,
        })),
      });
    }

    // Replay events
    let replayed = 0;
    let errors = 0;

    for (const event of events) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        await emitEvent(event.event_type as any, data, {
          source: "replay" as any,
          entityType: event.entity_type,
          entityId: event.entity_id,
          tenantId: event.tenant_id,
        });
        replayed++;
      } catch (e: unknown) {
        errors++;
        log.warn({ eventId: event.id, err: e instanceof Error ? e.message : "unknown" }, "Failed to replay event");
      }
    }

    log.info({ replayed, errors, hours: safeHours, eventType }, "Event replay completed");

    return NextResponse.json({
      replayed,
      errors,
      windowHours: safeHours,
      eventType: eventType || "all",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    log.error({ err: msg }, "Replay failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
