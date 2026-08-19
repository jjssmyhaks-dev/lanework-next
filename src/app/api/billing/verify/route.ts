/**
 * POST /api/billing/verify — Verifies Razorpay payment and updates user plan.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

const sql = neon(process.env.DATABASE_URL!);

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = body;

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (razorpayKeySecret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      // Verify signature
      const expectedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
      }
    }

    // Update user plan
    await sql`UPDATE users SET plan = ${plan}, updated_at = NOW() WHERE id = ${user.id}`;

    return NextResponse.json({ success: true, plan });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[Billing Verify]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
