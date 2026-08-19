/**
 * GET /api/billing — Returns billing info for the authenticated user.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (_request, user) => {
  try {
    // Get user plan
    const [userRow] = await sql`SELECT plan FROM users WHERE id = ${user.id}`;
    const plan = (userRow?.plan as string) || "free";

    // Get subscription info if exists
    let subscription = null;
    try {
      const [sub] = await sql`SELECT * FROM subscriptions WHERE org_id = ${user.id} ORDER BY created_at DESC LIMIT 1`;
      subscription = sub || null;
    } catch { /* subscriptions table may not exist */ }

    // Get recent invoices
    let invoices: any[] = [];
    try {
      invoices = await sql`SELECT * FROM invoices WHERE customer_name = ${user.email || user.id} ORDER BY created_at DESC LIMIT 10`;
    } catch { /* invoices table may not exist */ }

    return NextResponse.json({
      plan,
      planName: plan.charAt(0).toUpperCase() + plan.slice(1),
      billingCycle: subscription?.plan || "monthly",
      nextBillingDate: subscription?.trial_end || null,
      amount: plan === "free" ? 0 : plan === "starter" ? 999 : plan === "growth" ? 2999 : 7999,
      paymentMethod: null, // Would come from Razorpay customer
      invoices: invoices.map((inv: any) => ({
        id: inv.invoice_number || inv.id,
        date: inv.created_at,
        amount: Number(inv.total_amount) || 0,
        status: "paid",
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
