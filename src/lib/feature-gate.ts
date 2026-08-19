/**
 * Feature Gate — plan-based access control with enforcement.
 *
 * Usage in API routes:
 *   import { requireFeature, requireChatLimit, requireShipmentLimit } from "@/lib/feature-gate";
 *   const gate = await requireChatLimit(user.id);
 *   if (gate.denied) return gate.response;
 *
 * Returns structured upgrade payloads the frontend can render into banners/modals.
 */

import { NextResponse } from "next/server";
import {
  PlanId,
  hasFeature,
  isWithinLimit,
  getPlanFeatures,
  getUpgradePlan,
  getUserPlan,
  getUserUsage,
  PLANS,
} from "@/lib/pricing";
import type { PlanFeatures } from "@/lib/pricing";

/** Common upgrade response shape the frontend can always render */
function upgradeResponse(
  plan: PlanId,
  opts: {
    limitType: string;
    message: string;
    currentUsage: number;
    limit: number;
    feature?: string;
  }
): NextResponse {
  const upgradePlan = getUpgradePlan(plan);
  const upgradeInfo = upgradePlan ? PLANS[upgradePlan] : null;

  return NextResponse.json(
    {
      error: opts.message,
      limitType: opts.limitType,
      currentPlan: PLANS[plan].name,
      currentPlanId: plan,
      currentUsage: opts.currentUsage,
      limit: opts.limit,
      upgradeTo: upgradePlan,
      upgradeName: upgradeInfo?.name || null,
      upgradePrice: upgradeInfo?.priceMonthly || 0,
      upgradeUrl: "/pricing",
      blocked: true,
      feature: opts.feature,
    },
    { status: 403 }
  );
}

export type GateResult = {
  denied: false;
  plan: PlanId;
  features: PlanFeatures;
  usage: Record<string, number>;
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
  const usage = await getUserUsage(userId);

  if (!hasFeature(plan, feature)) {
    return {
      denied: true,
      plan,
      response: upgradeResponse(plan, {
        limitType: "feature",
        message: `"${feature}" requires the ${getUpgradePlan(plan) ? PLANS[getUpgradePlan(plan)!].name : "higher"} plan.`,
        currentUsage: 0,
        limit: 0,
        feature,
      }),
    };
  }

  return { denied: false, plan, features, usage };
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
    const readableName = metric
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, s => s.toUpperCase())
      .replace("Per Day", "per day")
      .replace("Per Month", "per month");

    return {
      denied: true,
      plan,
      response: upgradeResponse(plan, {
        limitType: "usage",
        message: `You've used all your ${readableName} on the ${PLANS[plan].name} plan. Upgrade to continue.`,
        currentUsage,
        limit,
        feature: metric,
      }),
    };
  }

  return { denied: false, plan, features, usage };
}

/** Specifically enforce daily chat message limit — BLOCKS when exceeded */
export async function requireChatLimit(userId: string): Promise<GateResult> {
  const plan = await getUserPlan(userId);
  const features = getPlanFeatures(plan);
  const usage = await getUserUsage(userId);
  const todayCount = usage.chatMessagesPerDay || 0;

  // Unlimited plans skip check
  if (features.chatMessagesPerDay === -1) {
    return { denied: false, plan, features, usage };
  }

  if (todayCount >= features.chatMessagesPerDay) {
    return {
      denied: true,
      plan,
      response: upgradeResponse(plan, {
        limitType: "chat_messages",
        message: `You've used all ${features.chatMessagesPerDay} AI chats for today on the ${PLANS[plan].name} plan. ${getUpgradePlan(plan) ? `Upgrade to ${PLANS[getUpgradePlan(plan)!].name} for ${PLANS[getUpgradePlan(plan)!].features.chatMessagesPerDay === -1 ? "unlimited" : PLANS[getUpgradePlan(plan)!].features.chatMessagesPerDay + " chats/day"}.` : "Contact us for higher limits."}`,
        currentUsage: todayCount,
        limit: features.chatMessagesPerDay,
        feature: "chatMessagesPerDay",
      }),
    };
  }

  return { denied: false, plan, features, usage };
}

/** Specifically enforce monthly shipment limit — BLOCKS when exceeded */
export async function requireShipmentLimit(userId: string): Promise<GateResult> {
  const plan = await getUserPlan(userId);
  const features = getPlanFeatures(plan);
  const usage = await getUserUsage(userId);
  const monthCount = usage.shipmentsPerMonth || 0;

  // Unlimited plans skip check
  if (features.shipmentsPerMonth === -1) {
    return { denied: false, plan, features, usage };
  }

  if (monthCount >= features.shipmentsPerMonth) {
    return {
      denied: true,
      plan,
      response: upgradeResponse(plan, {
        limitType: "shipments",
        message: `You've created ${monthCount} shipments this month — your ${PLANS[plan].name} plan allows ${features.shipmentsPerMonth}. ${getUpgradePlan(plan) ? `Upgrade to ${PLANS[getUpgradePlan(plan)!].name} for ${PLANS[getUpgradePlan(plan)!].features.shipmentsPerMonth === -1 ? "unlimited" : PLANS[getUpgradePlan(plan)!].features.shipmentsPerMonth.toLocaleString("en-IN") + " shipments/month"}.` : "Contact us for higher limits."}`,
        currentUsage: monthCount,
        limit: features.shipmentsPerMonth,
        feature: "shipmentsPerMonth",
      }),
    };
  }

  return { denied: false, plan, features, usage };
}

/**
 * Get usage summary for the frontend (for displaying progress bars / warnings).
 * This is a lightweight read-only check — no blocking.
 */
export async function getUsageSummary(userId: string): Promise<{
  plan: PlanId;
  planName: string;
  limits: Record<string, { current: number; max: number; percent: number; label: string }>;
}> {
  const plan = await getUserPlan(userId);
  const features = getPlanFeatures(plan);
  const usage = await getUserUsage(userId);

  const limitEntry = (key: string, current: number, max: number, label: string) => {
    const pct = max === -1 ? 0 : Math.min(100, Math.round((current / max) * 100));
    return { current, max, percent: pct, label };
  };

  return {
    plan,
    planName: PLANS[plan].name,
    limits: {
      chatMessagesPerDay: limitEntry(
        "chatMessagesPerDay",
        usage.chatMessagesPerDay || 0,
        features.chatMessagesPerDay,
        "AI Chats Today"
      ),
      shipmentsPerMonth: limitEntry(
        "shipmentsPerMonth",
        usage.shipmentsPerMonth || 0,
        features.shipmentsPerMonth,
        "Shipments This Month"
      ),
    },
  };
}
