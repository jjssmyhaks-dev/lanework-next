import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";

/** Pre-defined integration catalog (mirrors the one in action/route.ts) */
const INTEGRATION_CATALOG: Record<string, any> = {
  shiprocket: { id: "shiprocket", name: "Shiprocket", category: "Carrier Aggregator", icon: "package", tier: 1,
    desc: "7+ Indian carriers: Delhivery, BlueDart, DTDC, Ecom Express, XpressBees, etc.",
    docsUrl: "/docs#shiprocket",
    actions: [{ action: "track_shipment", label: "Track Shipment", icon: "search" },
      { action: "get_rates", label: "Compare Rates", icon: "bar-chart" },
      { action: "create_shipment", label: "Create Shipment", icon: "plus" },
      { action: "cancel_shipment", label: "Cancel Shipment", icon: "x" }],
  },
  whatsapp: { id: "whatsapp", name: "WhatsApp Business API", category: "Communication", icon: "message-circle", tier: 1,
    desc: "Send tracking updates, NDR alerts, and POD confirmations to customers",
    actions: [{ action: "send_test", label: "Send Test Message", icon: "send" },
      { action: "notification_rules", label: "Notification Rules", icon: "bell" }],
  },
  tally_prime: { id: "tally_prime", name: "TallyPrime", category: "Accounting", icon: "calculator", tier: 1,
    desc: "Sync inventory, push orders as sales vouchers, check ledgers",
    actions: [{ action: "sync_inventory", label: "Sync Inventory Now", icon: "refresh-cw" },
      { action: "check_stock", label: "Check Stock", icon: "package" }],
  },
  gstn_eway_bill: { id: "gstn_eway_bill", name: "GSTN e-Way Bill API", category: "Compliance", icon: "file-text", tier: 1,
    desc: "Generate, update, cancel e-way bills",
    actions: [{ action: "status_check", label: "Status Check", icon: "search" },
      { action: "list_eway_bills", label: "View All Bills", icon: "list" }],
  },
  razorpay: { id: "razorpay", name: "Razorpay", category: "Payments", icon: "credit-card", tier: 1,
    desc: "Accept payments, automated reconciliation",
    actions: [{ action: "check_status", label: "Check Status", icon: "activity" }],
  },
  google_sheets: { id: "google_sheets", name: "Google Sheets Sync", category: "Data Sync", icon: "file-spreadsheet", tier: 1,
    desc: "Two-way sync — push shipments/orders to sheets, pull updates back",
    actions: [{ action: "sync_now", label: "Sync Now", icon: "refresh-cw" },
      { action: "export_shipments", label: "Export Shipments", icon: "download" }],
  },
  generic_webhook: { id: "generic_webhook", name: "Generic Webhook", category: "API / Webhook", tier: 1,
    desc: "Receive data from TMS, WMS, ERP, or any system with webhook support",
    actions: [{ action: "copy_webhook", label: "Copy Webhook URL", icon: "copy" },
      { action: "test_webhook", label: "Test Webhook", icon: "zap" }],
  },
};

export const GET = withAuth(async (_request, _user, ctx) => {
  try {
    const { id } = await params;
    const sql = neon(process.env.DATABASE_URL!);

    // First try catalog lookup (non-UUID identifiers like "shiprocket")
    const catalogMatch = INTEGRATION_CATALOG[id];

    // Try DB lookup (UUID id or integration_type)
    let dbRow: any = null;
    try {
      const rows = await sql`SELECT * FROM integrations WHERE id::text = ${id} OR integration_type = ${id}` as any;
      if (rows.length > 0) dbRow = rows[0];
    } catch {
      // UUID cast failed — try integration_type only
      try {
        const rows = await sql`SELECT * FROM integrations WHERE integration_type = ${id}` as any;
        if (rows.length > 0) dbRow = rows[0];
      } catch { /* no match */ }
    }

    if (catalogMatch && dbRow) {
      // Catalog + connected → return merged
      return NextResponse.json({
        integration: {
          ...catalogMatch,
          ...dbRow,
          connected_status: "connected",
          config: dbRow.config || {},
          connected_at: dbRow.updated_at || dbRow.created_at,
        },
      });
    }

    if (dbRow) {
      // Only in DB (maybe dynamically added)
      return NextResponse.json({ integration: dbRow });
    }

    if (catalogMatch) {
      // Only in catalog → return catalog data (not yet connected)
      return NextResponse.json({
        integration: {
          ...catalogMatch,
          connected_status: "not_connected",
          config: {},
        },
      });
    }

    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, _user, ctx) => {
  try {
    const { id } = await (ctx!.params! as any);
    const body = await request.json();
    const { status, config } = body;
    const sql = neon(process.env.DATABASE_URL!);

    const existing = await sql`SELECT * FROM integrations WHERE id::text = ${id} OR integration_type = ${id}` as any;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const realId = existing[0].id;

    if (config) {
      const merged = { ...(existing[0].config || {}), ...config };
      await sql`UPDATE integrations SET config = ${JSON.stringify(merged)}, updated_at = NOW() WHERE id = ${realId}`;
      return NextResponse.json({ success: true, config: merged });
    }
    if (status) {
      await sql`UPDATE integrations SET status = ${status}, updated_at = NOW() WHERE id = ${realId}`;
      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (_request, _user, ctx) => {
  try {
    const { id } = await (ctx!.params! as any);
    const sql = neon(process.env.DATABASE_URL!);

    // Try by UUID first (id), fall back to integration_type lookup
    let existing: any[] = [];
    try {
      existing = await sql`SELECT * FROM integrations WHERE id::text = ${id}`;
    } catch {}
    if (existing.length === 0) {
      try {
        existing = await sql`SELECT * FROM integrations WHERE integration_type = ${id}`;
      } catch {}
    }

    if (existing.length === 0) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const realId = existing[0].id;
    const realType = existing[0].integration_type || existing[0].type || id;

    try { await sql`DELETE FROM webhooks WHERE integration_id = ${realId}`; } catch {}
    await sql`DELETE FROM integrations WHERE id = ${realId}`;

    return NextResponse.json({ success: true, type: realType, message: `${realType} integration disconnected` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
