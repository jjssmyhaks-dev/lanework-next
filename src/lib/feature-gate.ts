/**
 * Feature Gate — middleware helper for plan-based access control.
 *
 * Usage in API routes:
 *   import { requireFeature, requireWithinLimit } from "@/lib/feature-gate";
 *   const gate = await requireFeature(user.id, "routeOptimization");
 *   if (gate.denied) return gate.response;
 *
 * Requires user to have a `plan` column in the users table or falls back to "free".
 */

import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import {
  PlanId,
  hasFeature,
  isWithinLimit,
  getPlanFeatures,
  PLANS,
} from "@/lib/pricing";
import type { PlanFeatures } from "@/lib/pricing";

const sql = neon(process.env.DATABASE_URL!);

async function getUserPlan(userId: string): Promise<PlanId> {
  try {
    const [row] = await sql`SELECT plan FROM users WHERE id = ${userId}`;
    const plan = (row?.plan as string) || "free";
    if (plan in PLANS) return plan as PlanId;
    return "free";
  } catch {
    return "free";
  }
}

async function getUserUsage(userId: string): Promise<Record<string, number>> {
  try {
    const [shipments] = await sql`SELECT COUNT(*) as count FROM shipments WHERE created_at >= date_trunc('month', NOW())`;
    const [inventory] = await sql`SELECT COUNT(*) as count FROM inventory WHERE user_id = ${userId}`;
    const [vehicles] = await sql`SELECT COUNT(*) as count FROM fleet_vehicles WHERE user_id = ${userId}`;
    const [drivers] = await sql`SELECT COUNT(*) as count FROM fleet_drivers WHERE user_id = ${userId}`;
    const [customers] = await sql`SELECT COUNT(*) as count FROM customers`;
    const [warehouses] = await sql`SELECT COUNT(*) as count FROM warehouse WHERE user_id = ${userId}`;

    return {
      shipmentsPerMonth: Number(shipments?.count) || 0,
      inventoryItems: Number(inventory?.count) || 0,
      vehicles: Number(vehicles?.count) || 0,
      drivers: Number(drivers?.count) || 0,
      customers: Number(customers?.count) || 0,
      warehouses: Number(warehouses?.count) || 0,
    };
  } catch {
    return {};
  }
}

export type GateResult = {
  denied: false;
  plan: PlanId;
  features: PlanFeatures;
} | {
  denied: true;
  plan: PlanId;
  response: NextResponse;
};

/** Check if a specific boolean feature is enabled on the user's plan */
export async function requireFeature(
  userId: string,
  feature: keyof PlanFeatures
): Promise<GateResult> {
  const plan = await getUserPlan(userId);
  const features = getPlanFeatures(plan);

  if (!hasFeature(plan, feature)) {
    const planName = PLANS[plan].name;
    return {
      denied: true,
      plan,
      response: NextResponse.json(
        {
          error: `This feature requires a higher plan.`,
          feature,
          currentPlan: planName,
          upgradeTo: plan === "free" ? "starter" : plan === "starter" ? "growth" : "enterprise",
          upgradeUrl: "/settings/billing",
        },
        { status: 403 }
      ),
    };
  }

  return { denied: false, plan, features };
}

/** Check if the user is within their plan's usage limit for a metric */
export async function requireWithinLimit(
  userId: string,
  metric: keyof PlanFeatures
): Promise<GateResult> {
  const plan = await getUserPlan(userId);
  const features = getPlanFeatures(plan);
  const usage = await getUserUsage(userId);
  const currentUsage = usage[metric as string] || 0;

  if (!isWithinLimit(plan, metric, currentUsage)) {
    const limit = features[metric as keyof PlanFeatures] as number;
    const planName = PLANS[plan].name;
    return {
      denied: true,
      plan,
      response: NextResponse.json(
        {
          error: `You've reached your ${planName} plan limit for this feature.`,
          metric,
          currentUsage,
          limit,
          upgradeTo: plan === "free" ? "starter" : plan === "starter" ? "growth" : "enterprise",
          upgradeUrl: "/settings/billing",
        },
        { status: 429 }
      ),
    };
  }

  return { denied: false, plan, features };
}
