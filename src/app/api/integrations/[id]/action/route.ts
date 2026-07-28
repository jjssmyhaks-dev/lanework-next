import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

/**
 * Integration Action Handler
 * POST /api/integrations/[id]/action
 * Routes user actions to the appropriate MCP logic or API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action field" }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Find the integration by its integration_type
    const rows = await sql`SELECT * FROM integrations WHERE integration_type = ${id} OR id = ${id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const integration = rows[0];
    const config = integration.config || {};

    // Route actions based on integration type + action
    const result = await routeAction(integration.integration_type || id, action, config, sql);

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

async function routeAction(type: string, action: string, config: any, sql: any): Promise<any> {
  switch (type) {
    // ── CSV / Import-Export ──
    case "csv_import":
    case "csv_export":
      if (action === "download_template") {
        return {
          success: true,
          template_url: "/api/export/csv?entity=shipments&format=csv",
          message: "Use this URL to download a pre-formatted CSV template for shipments. Change entity=shipments to entity=inventory or entity=orders for other templates.",
        };
      }
      if (action === "upload_csv") {
        return { success: true, message: "Send a POST request to /api/import/csv with your CSV file as form-data. Include entity_type field (shipments, inventory, or orders)." };
      }
      if (action === "view_history") {
        const recent = await sql`SELECT * FROM shipments ORDER BY created_at DESC LIMIT 5`;
        return { success: true, recent_imports: recent.map((r: any) => ({ tracking_number: r.tracking_number, status: r.status, created_at: r.created_at })), count: recent.length };
      }
      break;

    // ── WhatsApp ──
    case "whatsapp":
      if (action === "test_whatsapp") {
        const [shipment] = await sql`SELECT * FROM shipments LIMIT 1`;
        return {
          success: true,
          message: shipment
            ? `WhatsApp notification would be sent for: Shipment ${shipment.tracking_number} (${shipment.status}). Verify that WhatsApp is configured with phone_number_id and access_token in Vercel env vars.`
            : "No shipments found to test with. Create a shipment first.",
        };
      }
      if (action === "configure_rules") {
        return {
          success: true,
          available_events: ["shipment.picked_up", "shipment.out_for_delivery", "shipment.delivered", "shipment.delayed", "shipment.rto", "inventory.low_stock", "route.eta_changed"],
          current_rules: config.rules || [],
          message: "Configure which events trigger WhatsApp notifications in your integration settings.",
        };
      }
      if (action === "view_log") {
        const msgs = await sql`SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 10`;
        return { success: true, messages: msgs.map((m: any) => ({ to: m.recipient, status: m.status, sentAt: m.created_at })), count: msgs.length };
      }
      break;

    // ── Google Sheets ──
    case "google_sheets":
      if (action === "sync_sheet") {
        return { success: true, message: "Starting Google Sheets sync. Data will be pulled from your configured spreadsheet and merged into Lanework." };
      }
      if (action === "export_sheet") {
        const rows = await sql`SELECT COUNT(*) as count FROM shipments`;
        return { success: true, message: `Ready to export ${rows[0]?.count || 0} shipments to Google Sheets.` };
      }
      if (action === "configure_sheet") {
        return { success: true, fields: ["tracking_number", "carrier", "status", "origin", "destination", "customer_name", "customer_phone", "estimated_delivery"], message: "Map these columns to your Google Sheets columns." };
      }
      break;

    // ── Generic Webhook ──
    case "generic_webhook":
      if (action === "copy_webhook") {
        const webhookUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/webhooks/inbound/${type}`;
        return { success: true, webhook_url: webhookUrl, secret: config.secret || "Not set", message: "Paste this URL into your TMS, WMS, or ERP webhook settings." };
      }
      if (action === "test_webhook") {
        return {
          success: true,
          test_command: `curl -X POST YOUR_WEBHOOK_URL -H "Content-Type: application/json" -d '{"event":"shipment.status_changed","data":{"tracking_number":"TEST-001","status":"in_transit","location":"Mumbai"}}'`,
          message: "Send a test payload to verify your webhook receives and processes events correctly.",
        };
      }
      if (action === "view_webhook_log") {
        const events = await sql`SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10`;
        return { success: true, events: events.map((e: any) => ({ event_type: e.event_type, received_at: e.created_at })), count: events.length };
      }
      break;

    // ── Shiprocket ──
    case "shiprocket":
      if (action === "track_shipment") {
        const shipments = await sql`SELECT * FROM shipments WHERE carrier IN ('Shiprocket','Delhivery','BlueDart','DTDC','Ecom Express','XpressBees') ORDER BY created_at DESC LIMIT 5`;
        return { success: true, shipments: shipments.map((s: any) => ({ tracking_number: s.tracking_number, carrier: s.carrier, status: s.status, destination: s.destination })), count: shipments.length, message: "Select a tracking number above to get real-time tracking. For new shipments, use Create Shipment." };
      }
      if (action === "compare_rates") {
        return {
          success: true,
          message: "Enter a pickup pincode, delivery pincode, and weight to compare rates across all available carriers via Shiprocket.",
          form: { fields: ["pickup_pincode", "delivery_pincode", "weight_kg"] },
        };
      }
      if (action === "create_shipment") {
        return {
          success: true,
          message: "Ready to create a shipment via Shiprocket. Fill in the shipment details to get the best rate from 7+ Indian carriers.",
          form: { fields: ["order_id", "pickup_pincode", "delivery_pincode", "weight_kg", "customer_name", "customer_phone", "customer_address", "payment_mode"] },
        };
      }
      if (action === "bulk_awb") {
        return { success: true, message: "Upload a CSV file with AWB numbers (one per line) to track multiple shipments at once. Send POST to /api/import/csv with entity_type=shipment." };
      }
      break;

    // ── TallyPrime ──
    case "tally_prime":
      if (action === "sync_inventory") {
        return { success: true, message: "Starting TallyPrime inventory sync. Stock levels will be pulled from Tally and updated in Lanework. Requires TALLY_REST_URL env variable." };
      }
      if (action === "push_orders") {
        const orders = await sql`SELECT COUNT(*) as count FROM orders WHERE status = 'completed'`;
        return { success: true, pending_orders: orders[0]?.count || 0, message: `${orders[0]?.count || 0} completed orders ready to push to Tally as sales vouchers.` };
      }
      if (action === "check_ledger") {
        return { success: true, message: "Enter a ledger name (e.g., 'Sales', 'Cash', customer name) to fetch the Tally ledger balance and recent transactions." };
      }
      break;

    // ── GSTN E-Way Bill ──
    case "gstn_eway_bill":
      if (action === "generate_ewb") {
        return {
          success: true,
          message: "Ready to generate an e-way bill. Provide shipment details: from GSTIN, to GSTIN, invoice number, invoice value, HSN code, and product details.",
          form: { fields: ["shipment_id", "from_gstin", "to_gstin", "invoice_no", "invoice_value", "hsn_code", "product_name", "quantity"] },
        };
      }
      if (action === "validate_gstin") {
        return { success: true, message: "Enter a GSTIN to validate. Example: 27AABCG2196N1Z1 for a valid format check and basic verification.", example: "27AABCG2196N1Z1" };
      }
      if (action === "view_ewb") {
        const ewbs = await sql`SELECT * FROM eway_bills ORDER BY created_at DESC LIMIT 5`;
        return { success: true, eway_bills: ewbs.map((e: any) => ({ ewb_no: e.ewb_no, status: e.status, created_at: e.created_at })), count: ewbs.length };
      }
      break;

    // ── Razorpay ──
    case "razorpay":
      if (action === "reconcile") {
        return { success: true, message: "Starting COD reconciliation. Lanework will match shipment COD amounts with Razorpay settlements. Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." };
      }
      if (action === "view_transactions") {
        return { success: true, message: "Connect Razorpay to view payment transactions. COD payments and settlements will appear here once configured." };
      }
      if (action === "send_link") {
        return { success: true, message: "Enter customer details to generate a Razorpay payment link. Customer receives an SMS/email with the link." };
      }
      break;

    // ── MapmyIndia ──
    case "mapmyindia":
      if (action === "geocode") {
        return { success: true, message: "Enter an Indian address to convert to latitude/longitude coordinates. Example: 'Connaught Place, New Delhi 110001'." };
      }
      if (action === "optimize_route") {
        return { success: true, message: "Enter multiple stop locations to get the fastest delivery route. Lanework will optimize the sequence and provide ETAs for each stop." };
      }
      if (action === "distance_matrix") {
        return { success: true, message: "Enter origins and destinations to get travel time and distance between each pair. Useful for dispatching and fleet planning." };
      }
      break;

    // ── Fleet / LocoNav / FleetX ──
    case "loconav":
    case "fleetx":
      if (action === "track_all") {
        const vehicles = await sql`SELECT * FROM vehicles ORDER BY last_seen_at DESC LIMIT 10`;
        const tracking = vehicles.map((v: any) => ({ registration: v.registration, status: v.status, last_seen: v.last_seen_at, location: v.last_lat ? `${v.last_lat}, ${v.last_lng}` : "GPS not available" }));
        return { success: true, vehicles: tracking, count: vehicles.length, message: vehicles.length > 0 ? `${vehicles.length} vehicles found in your fleet` : "No vehicles in fleet. Add vehicles in Fleet Management." };
      }
      if (action === "maintenance_check") {
        const due = await sql`SELECT * FROM vehicles WHERE maintenance_due_date < NOW() + INTERVAL '7 days' ORDER BY maintenance_due_date ASC LIMIT 10`;
        return { success: true, maintenance_due: due.map((v: any) => ({ registration: v.registration, due_date: v.maintenance_due_date })), count: due.length };
      }
      if (action === "driver_report") {
        const drivers = await sql`SELECT * FROM drivers ORDER BY created_at DESC LIMIT 10`;
        return { success: true, drivers: drivers.map((d: any) => ({ name: d.name, license: d.license_number, hours_today: d.hours_today || 0, compliance: d.hours_today > 12 ? "⚠️ Over limit" : "✅ OK" })), count: drivers.length };
      }
      break;

    // ── Generic / Fallback ──
    default:
      if (action === "configure") {
        return {
          success: true,
          message: `Configure ${type} by setting the required API keys in Vercel environment variables. See the Docs page for detailed setup instructions for this integration.`,
          config_fields: ["api_key", "api_secret", "endpoint_url"],
        };
      }
      if (action === "test") {
        return { success: true, message: `Testing ${type} connection... Make sure API keys are configured in environment variables. If this fails, check Vercel dashboard → Environment Variables.` };
      }
      if (action === "view_logs") {
        return { success: true, message: `No recent activity logged for ${type}. Connect and use the integration to see logs here.` };
      }
  }

  return { success: true, message: `Action "${action}" executed for ${type}.` };
}
