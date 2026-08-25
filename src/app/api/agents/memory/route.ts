/**
 * /api/agents/memory — Agent memory query and management.
 * GET → query memories, preferences, rejection counts
 * POST → store memory, preference
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { queryMemory, storePreference, getPreference, storeMemory } from "@/lib/agents/memory";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "memory-api" });

export const GET = withAuth(async (request, user) => {
  try {
    const url = new URL(request.url);
    const tenantId = user?.id || url.searchParams.get("tenant_id") || undefined;
    const entityType = url.searchParams.get("entity_type") || undefined;
    const entityId = url.searchParams.get("entity_id") || undefined;
    const memoryType = url.searchParams.get("memory_type") as any || undefined;
    const key = url.searchParams.get("key") || undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);

    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const memories = await queryMemory({
      tenantId,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      memoryType,
      key: key || undefined,
      limit,
    });

    return NextResponse.json({ memories, count: memories.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  const rl = rateLimit(request, { maxRequests: 20, windowMs: 60_000, group: "memory" });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { action, tenantId, key, value, entityType, entityId, memoryType, confidence, ttlDays } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    if (action === "store_preference") {
      if (!key || !value) {
        return NextResponse.json({ error: "key and value are required" }, { status: 400 });
      }
      await storePreference(tenantId, key, value);
      return NextResponse.json({ success: true });
    }

    if (action === "get_preference") {
      if (!key) {
        return NextResponse.json({ error: "key is required" }, { status: 400 });
      }
      const pref = await getPreference(tenantId, key);
      return NextResponse.json({ preference: pref });
    }

    if (action === "store_memory") {
      if (!entityType || !entityId || !memoryType || !key || !value) {
        return NextResponse.json({ error: "entityType, entityId, memoryType, key, and value are required" }, { status: 400 });
      }
      const id = await storeMemory({
        tenantId,
        entityType,
        entityId,
        memoryType,
        key,
        value,
        confidence: confidence ?? 1.0,
        ttlDays: ttlDays ?? 90,
      });
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: "Invalid action. Use 'store_preference', 'get_preference', or 'store_memory'." }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    log.error({ err: msg }, "Memory action failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
