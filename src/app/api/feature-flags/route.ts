/**
 * /api/feature-flags — Feature flag management API.
 *
 * GET  → List all flags (with user availability if authenticated)
 * POST → Update a flag (admin only)
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAllFlags, getFlagsForUser, toggleFlag, setFlagMinPlan } from "@/lib/feature-flags";
import type { PlanId } from "@/lib/pricing";

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const withAvailability = searchParams.get("availability") === "true";

    if (withAvailability) {
      const flags = await getFlagsForUser(user.id);
      return NextResponse.json({ count: flags.length, flags });
    }

    const flags = await getAllFlags();
    return NextResponse.json({ count: flags.length, flags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    // Only SUPER_ADMIN can modify flags
    const role = (user as any).role;
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only super admins can modify feature flags" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { key, enabled, minPlan } = body as {
      key?: string;
      enabled?: boolean;
      minPlan?: PlanId | null;
    };

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const results: string[] = [];

    if (typeof enabled === "boolean") {
      await toggleFlag(key, enabled);
      results.push(`enabled=${enabled}`);
    }

    if (minPlan !== undefined) {
      await setFlagMinPlan(key, minPlan);
      results.push(`minPlan=${minPlan}`);
    }

    return NextResponse.json({
      success: true,
      key,
      updated: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
