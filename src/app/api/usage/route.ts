/**
 * GET /api/usage — Returns current usage stats for the authenticated user.
 * Used by the UpgradeBanner component to show progress bars.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getUserPlan, getUserUsage, getPlanFeatures, PLANS } from "@/lib/pricing";

export const GET = withAuth(async (_request, user) => {
  try {
    const plan = await getUserPlan(user.id);
    const features = getPlanFeatures(plan);
    const usage = await getUserUsage(user.id);

    const limitEntry = (key: string, current: number, max: number, label: string) => ({
      current,
      max,
      percent: max === -1 ? 0 : Math.min(100, Math.round((current / max) * 100)),
      label,
    });

    return NextResponse.json({
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
        inventoryItems: limitEntry(
          "inventoryItems",
          usage.inventoryItems || 0,
          features.inventoryItems,
          "Inventory Items"
        ),
        vehicles: limitEntry(
          "vehicles",
          usage.vehicles || 0,
          features.vehicles,
          "Vehicles"
        ),
        drivers: limitEntry(
          "drivers",
          usage.drivers || 0,
          features.drivers,
          "Drivers"
        ),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
