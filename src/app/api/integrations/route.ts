import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

// Tier 1 — Universal (works regardless of what customer has)
// Tier 2 — High-value India-specific
// Tier 3 — Scale/upmarket
const CATALOG = [
  // === Tier 1: Build First ===
  {
    id: "csv_import", tier: 1,
    name: "CSV / Excel Import", category: "Data Import",
    desc: "Upload shipment, inventory, or order data via CSV or Excel files",
    icon: "file-spreadsheet", docsUrl: "/docs#csv",
    configFields: ["file_upload"],
  },
  {
    id: "csv_export", tier: 1,
    name: "CSV / Excel Export", category: "Data Export",
    desc: "Export any dashboard, report, or agent data as CSV or Excel",
    icon: "download", docsUrl: "/docs#csv",
    configFields: [],
  },
  {
    id: "whatsapp", tier: 1,
    name: "WhatsApp Business API", category: "Communication",
    desc: "Customer notifications, driver check-ins, order intake via WhatsApp",
    icon: "message-circle", docsUrl: "/docs#whatsapp",
    configFields: ["phone_number_id", "access_token", "verify_token"],
  },
  {
    id: "google_sheets", tier: 1,
    name: "Google Sheets Sync", category: "Data Sync",
    desc: "Live two-way sync with Google Sheets — read and write in real time",
    icon: "sheet", docsUrl: "/docs#sheets",
    configFields: ["spreadsheet_id", "service_account_key", "sheet_name"],
  },
  {
    id: "generic_webhook", tier: 1,
    name: "Generic Webhook", category: "API / Webhook",
    desc: "Configurable inbound/outbound webhook — connect any TMS, WMS, ERP",
    icon: "webhook", docsUrl: "/docs#webhooks",
    configFields: ["inbound_url", "outbound_url", "secret", "event_types"],
  },

  // === Tier 2: High-Value India-Specific ===
  {
    id: "shiprocket", tier: 2,
    name: "Shiprocket", category: "Carrier Aggregator",
    desc: "One integration → Delhivery, BlueDart, DTDC, Ecom Express, XpressBees and more",
    icon: "rocket", docsUrl: "/docs#shiprocket",
    configFields: ["api_key", "api_secret", "channel_id"],
  },
  {
    id: "tally_prime", tier: 2,
    name: "TallyPrime", category: "Accounting",
    desc: "Sync inventory and orders with TallyPrime — the accounting system for Indian MSMEs",
    icon: "calculator", docsUrl: "/docs#tally",
    configFields: ["tally_odbc_dsn", "company_name", "sync_direction"],
  },
  {
    id: "gstn_eway_bill", tier: 2,
    name: "GSTN e-Way Bill API", category: "Compliance",
    desc: "Auto-generate e-way bills from shipment data — GST compliance automated",
    icon: "file-check", docsUrl: "/docs#ewaybill",
    configFields: ["gstin", "api_key", "username", "password"],
  },
  {
    id: "razorpay", tier: 2,
    name: "Razorpay", category: "Payments",
    desc: "COD reconciliation, invoicing, and payment tracking for Indian logistics",
    icon: "credit-card", docsUrl: "/docs#razorpay",
    configFields: ["key_id", "key_secret", "webhook_secret"],
  },

  // === Tier 3: Scale / Upmarket ===
  {
    id: "sap_b1", tier: 3,
    name: "SAP Business One", category: "ERP",
    desc: "Full ERP integration for mid-market / larger MSMEs running SAP B1",
    icon: "building", docsUrl: "/docs#sap",
    configFields: ["service_layer_url", "username", "password", "company_db"],
  },
  {
    id: "mapmyindia", tier: 3,
    name: "MapmyIndia API", category: "Maps / Routing",
    desc: "More accurate than Google Maps for Indian addresses, especially tier-2/3 cities",
    icon: "map-pin", docsUrl: "/docs#mapmyindia",
    configFields: ["api_key", "license_key"],
  },
  {
    id: "shopify", tier: 3,
    name: "Shopify", category: "E-Commerce",
    desc: "Auto-sync orders, inventory, and fulfillment for D2C sellers",
    icon: "shopping-cart", docsUrl: "/docs#shopify",
    configFields: ["store_url", "access_token", "api_version"],
  },
  {
    id: "woocommerce", tier: 3,
    name: "WooCommerce", category: "E-Commerce",
    desc: "Order and inventory sync for WooCommerce stores",
    icon: "shopping-bag", docsUrl: "/docs#woocommerce",
    configFields: ["store_url", "consumer_key", "consumer_secret"],
  },
  {
    id: "amazon_seller", tier: 3,
    name: "Amazon Seller Central", category: "E-Commerce",
    desc: "FBA and MFN order sync, inventory management",
    icon: "package", docsUrl: "/docs#amazon",
    configFields: ["seller_id", "auth_token", "marketplace_id"],
  },
  {
    id: "flipkart_seller", tier: 3,
    name: "Flipkart Seller", category: "E-Commerce",
    desc: "Order sync and fulfillment for Flipkart sellers",
    icon: "truck", docsUrl: "/docs#flipkart",
    configFields: ["api_key", "api_secret", "seller_id"],
  },
  {
    id: "loconav", tier: 3,
    name: "LocoNav", category: "Fleet Telematics",
    desc: "Real-time GPS, fuel monitoring, and driver behavior data",
    icon: "navigation", docsUrl: "/docs#loconav",
    configFields: ["api_key", "api_secret"],
  },
  {
    id: "fleetx", tier: 3,
    name: "FleetX", category: "Fleet Telematics",
    desc: "Vehicle tracking, fuel management, and trip analytics",
    icon: "activity", docsUrl: "/docs#fleetx",
    configFields: ["api_key", "auth_token"],
  },
];

// Tier labels
const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Universal", color: "bg-emerald-100 text-emerald-800" },
  2: { label: "India-Specific", color: "bg-blue-100 text-blue-800" },
  3: { label: "Scale", color: "bg-purple-100 text-purple-800" },
};

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier");
    const category = searchParams.get("category");

    // Fetch connected integrations from DB
    let connected: any[] = [];
    try {
      // Try with both column name variants
      connected = await sql`SELECT * FROM integrations`;
    } catch {
      // Table might have integration_type instead of type
    }

    const connectedMap = new Map(connected.map(c => [c.integration_type || c.type, c]));

    let filtered = CATALOG;
    if (tier) filtered = filtered.filter(c => c.tier === parseInt(tier));
    if (category) filtered = filtered.filter(c => c.category.toLowerCase() === category.toLowerCase());

    const integrations = filtered.map(c => ({
      ...c,
      status: connectedMap.has(c.id) ? "connected" : "disconnected",
      connectedAt: connectedMap.get(c.id)?.created_at || null,
      config: connectedMap.get(c.id)?.config || null,
    }));

    // Stats
    const total = CATALOG.length;
    const connectedCount = connected.length;
    const tierCounts = {
      tier1: CATALOG.filter(c => c.tier === 1).length,
      tier2: CATALOG.filter(c => c.tier === 2).length,
      tier3: CATALOG.filter(c => c.tier === 3).length,
    };

    return NextResponse.json({
      integrations,
      stats: {
        total,
        connected: connectedCount,
        available: total - connectedCount,
        tiers: tierCounts,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const createIntegrationSchema = z.object({
  type: z.string().min(1, "type is required"),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withAuth(async (request, _user) => {
  try {
    const validation = await validateBody(request, createIntegrationSchema);
    if (!validation.success) return validation.error;
    const { type, config } = validation.data;

    const catalogEntry = CATALOG.find(c => c.id === type);
    if (!catalogEntry) {
      return NextResponse.json({ error: `Unknown integration type: ${type}` }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Check if already connected
    const existing = await sql`SELECT id FROM integrations WHERE integration_type = ${type}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "Integration already connected", id: existing[0].id }, { status: 409 });
    }

    const id = crypto.randomUUID();
    // Use a default org_id for single-tenant mode
    const orgId = config?.org_id || "default";
    await sql`
      INSERT INTO integrations (id, org_id, integration_type, name, status, config)
      VALUES (${id}, ${orgId}, ${type}, ${catalogEntry.name}, 'connected',
        ${config ? JSON.stringify({...(config || {}), connected_at: new Date().toISOString()}) : "{}"}
      )
    `;

    // If WhatsApp, also create a webhook endpoint record
    if (type === "whatsapp") {
      const webhookId = crypto.randomUUID();
      await sql`
        INSERT INTO webhooks (id, type, endpoint, secret, integration_id, active)
        VALUES (${webhookId}, 'whatsapp', ${`/api/webhooks/whatsapp/${id}`}, ${config?.verify_token || ""}, ${id}, true)
      `;
    }

    // If generic webhook, create inbound webhook endpoint
    if (type === "generic_webhook") {
      const webhookId = crypto.randomUUID();
      const webhookSecret = config?.secret || crypto.randomUUID().slice(0, 16);
      await sql`
        INSERT INTO webhooks (id, type, endpoint, secret, integration_id, active)
        VALUES (${webhookId}, 'generic', ${`/api/webhooks/inbound/${id}`}, ${webhookSecret}, ${id}, true)
      `;
    }

    return NextResponse.json({
      success: true,
      id,
      type,
      name: catalogEntry.name,
      status: "connected",
      message: `${catalogEntry.name} integration connected successfully`,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
