/**
 * POST /api/billing/checkout — Creates a Razorpay order for plan upgrade.
 * Body: { plan: "starter" | "growth" | "enterprise", billing: "monthly" | "yearly" }
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { PLANS, type PlanId } from "@/lib/pricing";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { plan, billing } = body as { plan: PlanId; billing: "monthly" | "yearly" };

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan === "free") {
      return NextResponse.json({ error: "Cannot checkout for free plan" }, { status: 400 });
    }

    const planData = PLANS[plan];
    const amount = billing === "yearly" ? planData.priceYearly : planData.priceMonthly;
    const amountPaise = amount * 100; // Razorpay uses paise

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      // Razorpay not configured — return upgrade URL that just updates the plan directly
      return NextResponse.json({
        checkoutUrl: `/api/billing/direct-upgrade?plan=${plan}&billing=${billing}`,
        message: "Razorpay not configured. Processing direct upgrade.",
      });
    }

    // Create Razorpay order
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `lanework_${plan}_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { plan, billing, userId: user.id },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      logger.error({ err }, "Razorpay order creation failed");
      return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
    }

    const order = await orderRes.json();

    return NextResponse.json({
      razorpayOrderId: order.id,
      keyId: razorpayKeyId,
      amount: amountPaise,
      currency: "INR",
      plan,
      billing,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    logger.error({ msg }, "Billing checkout failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
