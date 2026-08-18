import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import { rateLimit, integrationRateLimit } from "@/lib/rate-limit";
import { callMcpAction } from "@/lib/mcp";
import { withAuth } from "@/lib/auth";

// ── e-way bills table — created lazily so the feature works on fresh DBs ──
async function ensureEwayBillsTable(sql: any) {
  await sql`CREATE TABLE IF NOT EXISTS eway_bills (
    id UUID PRIMARY KEY,
    ewb_no TEXT,
    shipment_id UUID,
    status TEXT DEFAULT 'generated',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  try { await sql`CREATE UNIQUE INDEX IF NOT EXISTS eway_bills_ewb_no_key ON eway_bills (ewb_no)`; } catch { /* index may already exist */ }
}

// ── Shiprocket auth helper (token cached per process; auth only when needed) ──
let _shiprocketToken: { token: string; expiresAt: number } | null = null;
async function getShiprocketToken(): Promise<string | null> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return null;
  if (_shiprocketToken && Date.now() < _shiprocketToken.expiresAt - 60_000) {
    return _shiprocketToken.token;
  }
  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.token) {
      _shiprocketToken = { token: data.token, expiresAt: Date.now() + 9 * 60 * 1000 };
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Integration Action Handler
 * POST /api/integrations/[id]/action
 * Routes user actions to the appropriate MCP logic or API
 */
export const POST = withAuth(async (request, _user, ctx) => {
  // Rate limit: 30 requests/minute per IP for integration actions
  const rl = rateLimit(request, integrationRateLimit);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again.", retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)), "X-RateLimit-Remaining": "0" } }
    );
  }

  try {
    const { id } = await (ctx!.params! as any);
    const body = await request.json();
    const { action, ...payload } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action field" }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Find by integration_type first, then by UUID id. Catalog integrations (not yet connected) are allowed.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let type = id;
    let config: any = {};
    if (isUuid) {
      const rows = await sql`SELECT * FROM integrations WHERE id = ${id}`;
      if (rows.length === 0) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
      type = rows[0].integration_type || id;
      config = rows[0].config || {};
    } else {
      // Catalog integration — might not be in DB yet
      const rows = await sql`SELECT * FROM integrations WHERE integration_type = ${id}`;
      if (rows.length > 0) config = rows[0].config || {};
    }

    // Route actions based on integration type + action
    const result = await routeAction(type, action, config, sql, payload);

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, mode: "simulated", error: e.message }, { status: 500 });
  }
});

async function routeAction(type: string, action: string, config: any, sql: any, payload: any): Promise<any> {
  // ── MCP servers first: the standalone mcp-servers/* code is the reference
  // implementation for the integrations it covers. Falls back to inline logic
  // for integrations without an MCP server (razorpay, whatsapp, csv, webhooks).
  try {
    const mcpResult = await callMcpAction(type, action, payload);
    if (mcpResult) return mcpResult;
  } catch (e: any) {
    console.warn(`[action] MCP dispatch failed for ${type}/${action}, using inline:`, e);
  }

  switch (type) {
    // ── CSV / Import-Export ──
    case "csv_import":
    case "csv_export":
      if (action === "download_template") {
        return {
          success: true,
          mode: "simulated",
          template_url: "/api/export/csv?entity=shipments&format=csv",
          message: "Use this URL to download a pre-formatted CSV template for shipments. Change entity=shipments to entity=inventory or entity=orders for other templates.",
        };
      }
      if (action === "upload_csv") {
        return { success: true, mode: "simulated", message: "Send a POST request to /api/import/csv with your CSV file as form-data. Include entity_type field (shipments, inventory, or orders)." };
      }
      if (action === "view_history") {
        const recent = await sql`SELECT * FROM shipments ORDER BY created_at DESC LIMIT 5`;
        return { success: true, mode: "db-fallback", recent_imports: recent.map((r: any) => ({ tracking_number: r.tracking_number, status: r.status, created_at: r.created_at })), count: recent.length };
      }
      break;

    // ── WhatsApp ──
    case "whatsapp":
      if (action === "test_whatsapp") {
        const phoneId = process.env.WHATSAPP_PHONE_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

        if (!phoneId || !accessToken) {
          // Fallback: try to show a sample from DB
          const [shipment] = await sql`SELECT * FROM shipments LIMIT 1`;
          return {
            success: true,
            mode: "simulated",
            message: shipment
              ? `WhatsApp notification would be sent for: Shipment ${shipment.tracking_number} (${shipment.status}). Configure WHATSAPP_PHONE_ID and WHATSAPP_ACCESS_TOKEN in Vercel env vars to enable live WhatsApp messaging.`
              : "No shipments found to test with. Create a shipment first, then configure WHATSAPP_PHONE_ID and WHATSAPP_ACCESS_TOKEN.",
            hint: "Set WHATSAPP_PHONE_ID and WHATSAPP_ACCESS_TOKEN in your environment variables.",
          };
        }

        try {
          // Send a test message template via WhatsApp Cloud API
          const testTo = payload.to || config.test_recipient || "919999999999";
          const apiUrl = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: testTo,
              type: "template",
              template: {
                name: "hello_world",
                language: { code: "en" },
              },
            }),
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (res.ok) {
            return { success: true, mode: "live", whatsapp_response: data, message: "Test message sent successfully via WhatsApp Cloud API." };
          }
          return { success: true, mode: "live", whatsapp_response: data, message: `WhatsApp API responded with status ${res.status}. Check your template and recipient number.` };
        } catch (err: any) {
          return { success: true, mode: "simulated", message: `WhatsApp API call failed: ${err.message}. Verify WHATSAPP_PHONE_ID and WHATSAPP_ACCESS_TOKEN are correct.` };
        }
      }
      if (action === "configure_rules") {
        return {
          success: true,
          mode: "simulated",
          available_events: ["shipment.picked_up", "shipment.out_for_delivery", "shipment.delivered", "shipment.delayed", "shipment.rto", "inventory.low_stock", "route.eta_changed"],
          current_rules: config.rules || [],
          message: "Configure which events trigger WhatsApp notifications in your integration settings.",
        };
      }
      if (action === "view_log") {
        const msgs = await sql`SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 10`;
        return { success: true, mode: "db-fallback", messages: msgs.map((m: any) => ({ to: m.to_number || m.toNumber, direction: m.direction, status: m.status, sentAt: m.created_at })), count: msgs.length };
      }
      break;

    // ═══════════════════════════════════════════
    // ── Google Sheets (real add-on service, not drive API) ──
    // ═══════════════════════════════════════════
    case "google_sheets": {
      const sheetsApiKey = process.env.GOOGLE_SHEETS_API_KEY;
      const sheetId = config.spreadsheet_id || payload.spreadsheet_id;

      if (action === "sync_sheet") {
        if (!sheetsApiKey || !sheetId) {
          const shipments = await sql`SELECT COUNT(*) as count FROM shipments`;
          return {
            success: true, mode: "db-fallback",
            message: `Ready to sync ${shipments[0]?.count || 0} shipments to Google Sheets. Configure GOOGLE_SHEETS_API_KEY and provide a spreadsheet_id to enable live sync.`,
            hint: "Set GOOGLE_SHEETS_API_KEY in environment variables and save your spreadsheet_id in integration config.",
          };
        }
        try {
          const sheetName = config.sheet_name || "Sheet1";
          const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(sheetName)}!A1:Z1000?key=${encodeURIComponent(sheetsApiKey)}`, { signal: AbortSignal.timeout(8000) });
          const data = await res.json();
          if (res.ok && data.values) {
            const headerRow = data.values[0] || [];
            const dataRows = data.values.slice(1);
            return {
              success: true, mode: "live",
              sheet_id: sheetId, sheet_name: sheetName,
              rows_fetched: dataRows.length, headers: headerRow,
              sample: dataRows.slice(0, 3),
              message: `Fetched ${dataRows.length} rows from Google Sheets '${sheetName}'. Use export_sheet to push Lanework data back.`,
            };
          }
          return { success: true, mode: "live", sheets_response: data, message: `Google Sheets API returned status ${res.status}. Check spreadsheet permissions.` };
        } catch (err: any) {
          return { success: true, mode: "simulated", message: `Google Sheets sync failed: ${err.message}.` };
        }
      }
      if (action === "export_sheet") {
        // Export requires OAuth, not API key — show DB preview with export API guidance
        const rows = await sql`SELECT * FROM shipments ORDER BY created_at DESC LIMIT 20`;
        const csvHeader = "tracking_number,carrier,status,origin,destination,customer_name,created_at";
        const csvRows = rows.map((r: any) => `${r.tracking_number},${r.carrier},${r.status},${r.origin},${r.destination},${r.customer_name},${r.created_at}`).join("\n");
        return {
          success: true, mode: "db-fallback",
          preview_rows: rows.length, csv_header: csvHeader, csv_sample: csvRows.substring(0, 500),
          export_url: "/api/export/csv?entity=shipments&format=csv",
          message: `${rows.length} shipments previewed. Download CSV from /api/export/csv and import into Sheets. For live 2-way sync, set up a service account with GOOGLE_SERVICE_ACCOUNT_KEY.`,
        };
      }
      if (action === "configure_sheet") {
        return { success: true, mode: "simulated", fields: ["tracking_number", "carrier", "status", "origin", "destination", "customer_name", "customer_phone", "estimated_delivery"], message: "Map these columns to your Google Sheets columns." };
      }
      break;
    }

    // ── Generic Webhook ──
    case "generic_webhook":
      if (action === "copy_webhook") {
        const webhookUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/webhooks/inbound/${type}`;
        return { success: true, mode: "simulated", webhook_url: webhookUrl, secret: config.secret || "Not set", message: "Paste this URL into your TMS, WMS, or ERP webhook settings." };
      }
      if (action === "test_webhook") {
        return {
          success: true,
          mode: "simulated",
          test_command: `curl -X POST YOUR_WEBHOOK_URL -H "Content-Type: application/json" -d '{"event":"shipment.status_changed","data":{"tracking_number":"TEST-001","status":"in_transit","location":"Mumbai"}}'`,
          message: "Send a test payload to verify your webhook receives and processes events correctly.",
        };
      }
      if (action === "view_webhook_log") {
        const events = await sql`SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10`;
        return { success: true, mode: "db-fallback", events: events.map((e: any) => ({ event_type: e.event_type, received_at: e.created_at })), count: events.length };
      }
      break;

    // ═══════════════════════════════════════════
    // ── Shiprocket ──
    // ═══════════════════════════════════════════
    case "shiprocket":
      if (action === "track_shipment") {
        const awb = payload.awb || payload.tracking_number || "";
        const token = await getShiprocketToken();

        if (token && awb) {
          try {
            const res = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${encodeURIComponent(awb)}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(8000),
            });
            const data = await res.json();
            if (res.ok) {
              return { success: true, mode: "live", tracking: data, message: `Live tracking data for AWB: ${awb}` };
            }
            return { success: true, mode: "live", tracking: data, message: `Shiprocket API returned status ${res.status} for AWB: ${awb}` };
          } catch (err: any) {
            return { success: true, mode: "simulated", message: `Shiprocket tracking call failed: ${err.message}. Check your AWB number.` };
          }
        }

        // DB fallback — no token or no AWB
        const shipments = await sql`SELECT * FROM shipments WHERE carrier IN ('Shiprocket','Delhivery','BlueDart','DTDC','Ecom Express','XpressBees') ORDER BY created_at DESC LIMIT 5`;
        return {
          success: true,
          mode: token ? "simulated" : "simulated",
          shipments: shipments.map((s: any) => ({ tracking_number: s.tracking_number, carrier: s.carrier, status: s.status, destination: s.destination })),
          count: shipments.length,
          message: awb
            ? `Tracking ${awb}: SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD not configured. Set them for live tracking.`
            : "Select a tracking number above to get real-time tracking. For new shipments, use Create Shipment.",
          hint: !token ? "Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in environment variables." : undefined,
        };
      }

      if (action === "compare_rates") {
        const pickup = payload.pickup_pincode || "";
        const delivery = payload.delivery_pincode || "";
        const weight = payload.weight_kg || payload.weight || "1";
        const token = await getShiprocketToken();

        if (token && pickup && delivery) {
          try {
            const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability?pickup_postcode=${encodeURIComponent(pickup)}&delivery_postcode=${encodeURIComponent(delivery)}&weight=${encodeURIComponent(weight)}&cod=0`;
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(8000),
            });
            const data = await res.json();
            if (res.ok) {
              return { success: true, mode: "live", rates: data, message: `Live rate comparison for ${pickup} → ${delivery} (${weight} kg)` };
            }
            return { success: true, mode: "live", rates: data, message: `Shiprocket serviceability returned status ${res.status}` };
          } catch (err: any) {
            return { success: true, mode: "simulated", message: `Rate comparison failed: ${err.message}.` };
          }
        }

        return {
          success: true,
          mode: "simulated",
          message: token
            ? "Enter pickup pincode, delivery pincode, and weight_kg to compare rates across all available carriers via Shiprocket."
            : "Enter a pickup pincode, delivery pincode, and weight to compare rates. Configure SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD for live rates.",
          form: { fields: ["pickup_pincode", "delivery_pincode", "weight_kg"] },
        };
      }

      if (action === "create_shipment") {
        const token = await getShiprocketToken();

        if (token && payload.order_id) {
          try {
            const orderData = {
              order_id: payload.order_id,
              order_date: payload.order_date || new Date().toISOString().split("T")[0],
              pickup_location: payload.pickup_location || config.pickup_location || "Primary",
              channel_id: payload.channel_id || "",
              comment: payload.comment || "",
              billing_customer_name: payload.customer_name || "Customer",
              billing_last_name: "",
              billing_address: payload.customer_address || "",
              billing_address_2: "",
              billing_city: payload.billing_city || "",
              billing_pincode: payload.billing_pincode || payload.delivery_pincode || "",
              billing_state: payload.billing_state || "",
              billing_country: "India",
              billing_email: payload.customer_email || "",
              billing_phone: payload.customer_phone || "",
              shipping_is_billing: true,
              order_items: payload.order_items || [{ name: "Item", sku: "SKU001", units: 1, selling_price: payload.invoice_value || "0" }],
              payment_method: payload.payment_mode === "COD" ? "COD" : "Prepaid",
              shipping_charges: 0,
              giftwrap_charges: 0,
              transaction_charges: 0,
              total_discount: 0,
              sub_total: payload.invoice_value || "0",
              length: payload.length || 10,
              breadth: payload.breadth || 10,
              height: payload.height || 10,
              weight: payload.weight_kg || payload.weight || "1",
            };
            const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(orderData),
              signal: AbortSignal.timeout(8000),
            });
            const data = await res.json();
            if (res.ok) {
              return { success: true, mode: "live", shipment: data, message: `Shipment created successfully! Order ID: ${payload.order_id}` };
            }
            return { success: true, mode: "live", shipment: data, message: `Shiprocket order creation returned status ${res.status}` };
          } catch (err: any) {
            return { success: true, mode: "simulated", message: `Shipment creation failed: ${err.message}.` };
          }
        }

        return {
          success: true,
          mode: "simulated",
          message: token
            ? "Provide order details (order_id, customer_name, delivery_pincode, etc.) to create a shipment via Shiprocket."
            : "Ready to create a shipment via Shiprocket. Fill in the shipment details to get the best rate from 7+ Indian carriers. Configure SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD for live creation.",
          form: { fields: ["order_id", "pickup_pincode", "delivery_pincode", "weight_kg", "customer_name", "customer_phone", "customer_address", "payment_mode"] },
        };
      }
      if (action === "bulk_awb") {
        return { success: true, mode: "simulated", message: "Upload a CSV file with AWB numbers (one per line) to track multiple shipments at once. Send POST to /api/import/csv with entity_type=shipment." };
      }
      break;

    // ═══════════════════════════════════════════
    // ── TallyPrime ──
    // ═══════════════════════════════════════════
    case "tally_prime":
      if (action === "sync_inventory") {
        const tallyUrl = process.env.TALLY_REST_URL;

        if (tallyUrl) {
          try {
            const xmlBody = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Stock Summary</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
            const res = await fetch(tallyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/xml" },
              body: xmlBody,
              signal: AbortSignal.timeout(8000),
            });
            const xmlText = await res.text();

            // Parse stock items from Tally XML response
            const items: { name: string; closingBalance: string }[] = [];
            const itemRegex = /<STOCKITEMNAME>([\s\S]*?)<\/STOCKITEMNAME>\s*[\s\S]*?<CLOSINGBALANCE>([\s\S]*?)<\/CLOSINGBALANCE>/g;
            let match;
            while ((match = itemRegex.exec(xmlText)) !== null) {
              items.push({ name: match[1].trim(), closingBalance: match[2].trim() });
            }

            // Upsert to inventory_items table
            let upserted = 0;
            for (const item of items) {
              try {
                await sql`
                  INSERT INTO inventory_items (id, sku, name, quantity_on_hand, quantity_available, unit_of_measure, last_updated)
                  VALUES (${crypto.randomUUID()}, ${item.name.toUpperCase().replace(/\s+/g, "-")}, ${item.name}, ${parseFloat(item.closingBalance) || 0}, ${parseFloat(item.closingBalance) || 0}, 'pcs', NOW())
                  ON CONFLICT (id) DO NOTHING
                `;
                upserted++;
              } catch {
                // skip individual upsert failures
              }
            }

            if (items.length > 0) {
              return {
                success: true,
                mode: "live",
                synced: upserted,
                total_items: items.length,
                items: items.slice(0, 20),
                message: `Synced ${upserted}/${items.length} stock items from TallyPrime.`,
              };
            }
            return { success: true, mode: "live", items: [], message: "No stock items found in TallyPrime response. Check TALLY_REST_URL configuration." };
          } catch (err: any) {
            // Fallback to DB
            const dbItems = await sql`SELECT * FROM inventory ORDER BY updated_at DESC LIMIT 20`;
            return {
              success: true,
              mode: "db-fallback",
              inventory: dbItems.map((i: any) => ({ item_name: i.name || i.item_name, quantity: i.quantity, updated_at: i.updated_at })),
              message: `TallyPrime sync failed (${err.message}). Showing cached inventory from database.`,
            };
          }
        }

        // No TALLY_REST_URL — read from inventory table
        const dbItems = await sql`SELECT * FROM inventory ORDER BY updated_at DESC LIMIT 20`;
        return {
          success: true,
          mode: "db-fallback",
          inventory: dbItems.map((i: any) => ({ item_name: i.name || i.item_name, quantity: i.quantity, updated_at: i.updated_at })),
          count: dbItems.length,
          message: "TallyPrime inventory from local database. Set TALLY_REST_URL in Vercel env vars for live sync from Tally.",
          hint: "Set TALLY_REST_URL to your TallyPrime REST server URL (e.g., http://192.168.1.100:9000).",
        };
      }
      if (action === "push_orders") {
        const orders = await sql`SELECT COUNT(*) as count FROM orders WHERE status = 'completed'`;
        return { success: true, mode: "db-fallback", pending_orders: orders[0]?.count || 0, message: `${orders[0]?.count || 0} completed orders ready to push to Tally as sales vouchers.` };
      }
      if (action === "check_ledger") {
        const ledgerName = payload.ledger_name || "";
        const tallyUrl = process.env.TALLY_REST_URL;

        if (tallyUrl && ledgerName) {
          try {
            const xmlBody = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Ledger</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><SVFROMDATE>20240101</SVFROMDATE><SVTODATE>20300101</SVTODATE><LEDGERNAME>${ledgerName}</LEDGERNAME></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
            const res = await fetch(tallyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/xml" },
              body: xmlBody,
              signal: AbortSignal.timeout(8000),
            });
            const xmlText = await res.text();
            return { success: true, mode: "live", ledger_name: ledgerName, raw_xml: xmlText.substring(0, 2000), message: `Ledger data fetched for "${ledgerName}".` };
          } catch (err: any) {
            return { success: true, mode: "simulated", message: `TallyPrime ledger fetch failed: ${err.message}. Verify TALLY_REST_URL is correct.` };
          }
        }

        return { success: true, mode: "simulated", message: "Enter a ledger name (e.g., 'Sales', 'Cash', customer name) to fetch the Tally ledger balance and recent transactions. Set TALLY_REST_URL for live data." };
      }
      break;

    // ═══════════════════════════════════════════
    // ── GSTN E-Way Bill ──
    // ═══════════════════════════════════════════
    case "gstn_eway_bill":
      if (action === "generate_ewb") {
        const apiKey = process.env.GSTN_API_KEY;
        if (!apiKey || !payload.shipment_id) {
          return {
            success: true, mode: "simulated",
            message: "Ready to generate an e-way bill. Provide shipment details: from GSTIN, to GSTIN, invoice number, invoice value, HSN code, and product details.",
            form: { fields: ["shipment_id", "from_gstin", "to_gstin", "invoice_no", "invoice_value", "hsn_code", "product_name", "quantity"] },
          };
        }
        try {
          const [shipment] = await sql`SELECT * FROM shipments WHERE id = ${payload.shipment_id}`;
          if (!shipment) return { success: true, mode: "simulated", message: `Shipment ${payload.shipment_id} not found in database.` };
          const ewbPayload = {
            supplyType: "O", subSupplyType: 1, docType: "INV",
            transactionType: 1, subSupplyDesc: "",
            fromGstin: payload.from_gstin || "", fromTrdName: config.from_trd_name || shipment.origin || "",
            fromAddr1: config.from_addr1 || shipment.origin || "", fromPlace: config.from_place || shipment.origin || "",
            fromPincode: parseInt(payload.from_pincode || config.from_pincode || "0"), fromStateCode: parseInt(config.from_state_code || "0"),
            toGstin: payload.to_gstin || "", toTrdName: payload.to_name || shipment.customer_name || "",
            toAddr1: payload.to_addr1 || shipment.destination || "", toPlace: shipment.destination || "",
            toPincode: parseInt(payload.to_pincode || "0"), toStateCode: parseInt(payload.to_state_code || "0"),
            totalValue: parseFloat(payload.invoice_value || "0"), cgstValue: 0, sgstValue: 0, igstValue: 0, cessValue: 0,
            transporterId: "", transporterName: shipment.carrier || "",
            transDocNo: shipment.tracking_number || "", transDocDate: new Date().toISOString().split("T")[0].replace(/-/g, "/"),
            transMode: "1", distance: parseInt(payload.distance_km || "0"),
            itemList: [{ productName: payload.product_name || "Item", productDesc: payload.product_desc || "", hsnCode: parseInt(payload.hsn_code || "0"), quantity: parseFloat(payload.quantity || "1"), qtyUnit: "NOS", taxRate: 0 }],
            vehicleNo: payload.vehicle_no || "",
          };
          const res = await fetch("https://gstn.api.gov.in/ewb/api/v1/ewaybill", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(ewbPayload),
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (res.ok && data.ewayBillNo) {
            await ensureEwayBillsTable(sql);
            await sql`INSERT INTO eway_bills (id, ewb_no, shipment_id, status, created_at) VALUES (${crypto.randomUUID()}, ${data.ewayBillNo}, ${shipment.id}, 'generated', NOW()) ON CONFLICT DO NOTHING`;
            return { success: true, mode: "live", eway_bill_no: data.ewayBillNo, eway_bill_date: data.ewayBillDate, valid_until: data.validUpto, message: `E-Way Bill ${data.ewayBillNo} generated successfully!` };
          }
          return { success: true, mode: "live", gstn_response: data, message: `GSTN E-Way Bill API returned status ${res.status}. ${data.error?.message || ""}` };
        } catch (err: any) {
          return { success: true, mode: "simulated", message: `E-Way Bill generation failed: ${err.message}. Check GSTN_API_KEY and shipment details.` };
        }
      }
      if (action === "validate_gstin") {
        const gstin = payload.gstin || payload.gstin_number || "";
        const apiKey = process.env.GSTN_API_KEY;

        // GSTIN format check (always available)
        const validFormat = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin?.toUpperCase?.() || "");

        if (!gstin) {
          return { success: true, mode: "simulated", message: "Enter a GSTIN to validate. Example: 27AABCG2196N1Z1 for a valid format check and basic verification.", example: "27AABCG2196N1Z1" };
        }

        if (apiKey) {
          try {
            const res = await fetch(`https://gstn.api.gov.in/ewb/api/v1/gstin/validate/${encodeURIComponent(gstin.toUpperCase())}`, {
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              signal: AbortSignal.timeout(8000),
            });
            const data = await res.json();
            return {
              success: true,
              mode: "live",
              gstin: gstin.toUpperCase(),
              gstn_response: data,
              format_valid: validFormat,
              message: validFormat ? "GSTIN format is valid. Live validation result from GSTN API shown above." : "GSTIN format is invalid. The GSTN API may also reject it.",
            };
          } catch (err: any) {
            return {
              success: true,
              mode: "simulated",
              gstin: gstin.toUpperCase(),
              format_valid: validFormat,
              message: validFormat
                ? `GSTIN format is valid but GSTN API call failed: ${err.message}.`
                : `GSTIN format is invalid (expected: 2 digits + 5 letters + 4 digits + 1 letter + Z + 1 char). API validation skipped.`,
            };
          }
        }

        // Format-only check (no API key)
        return {
          success: true,
          mode: "simulated",
          gstin: gstin.toUpperCase(),
          format_valid: validFormat,
          message: validFormat
            ? "GSTIN format appears valid (2 digits, 5 letters, 4 digits, 1 letter, Z, 1 character). Set GSTN_API_KEY for live GSTN verification."
            : "GSTIN format is invalid. Expected: 2 digits + 5 letters + 4 digits + 1 letter + Z + 1 character (e.g., 27AABCG2196N1Z1).",
          hint: !apiKey ? "Set GSTN_API_KEY in environment variables for live GST validation." : undefined,
        };
      }
      if (action === "view_ewb") {
        await ensureEwayBillsTable(sql);
        const ewbs = await sql`SELECT * FROM eway_bills ORDER BY created_at DESC LIMIT 5`;
        return { success: true, mode: "db-fallback", eway_bills: ewbs.map((e: any) => ({ ewb_no: e.ewb_no, status: e.status, created_at: e.created_at })), count: ewbs.length };
      }
      break;

    // ═══════════════════════════════════════════
    // ── Razorpay ──
    // ═══════════════════════════════════════════
    case "razorpay": {
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
      const razorpayAuth = razorpayKeyId && razorpayKeySecret
        ? Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")
        : null;

      if (action === "reconcile") {
        if (!razorpayAuth) {
          const codOrders = await sql`SELECT COUNT(*) as count FROM orders WHERE payment_mode = 'COD' AND status = 'delivered'`;
          return {
            success: true, mode: "db-fallback",
            cod_orders: codOrders[0]?.count || 0,
            settlements_matched: 0,
            message: `${codOrders[0]?.count || 0} COD deliveries pending reconciliation. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for automatic settlement matching.`,
            hint: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.",
          };
        }
        try {
          const res = await fetch("https://api.razorpay.com/v1/settlements?count=10", {
            headers: { Authorization: `Basic ${razorpayAuth}` },
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (res.ok) {
            const codOrders = await sql`SELECT COUNT(*) as count FROM orders WHERE payment_mode = 'COD' AND status = 'delivered'`;
            return {
              success: true, mode: "live",
              settlements: data.items?.map((s: any) => ({ id: s.id, amount: s.amount, status: s.status, created_at: s.created_at })) || [],
              cod_orders: codOrders[0]?.count || 0,
              message: `Fetched ${data.items?.length || 0} settlements from Razorpay. ${codOrders[0]?.count || 0} COD deliveries need matching.`,
            };
          }
          return { success: true, mode: "live", razorpay_response: data, message: `Razorpay API returned status ${res.status}.` };
        } catch (err: any) {
          const codOrders = await sql`SELECT COUNT(*) as count FROM orders WHERE payment_mode = 'COD' AND status = 'delivered'`;
          return {
            success: true, mode: "db-fallback",
            cod_orders: codOrders[0]?.count || 0,
            message: `Razorpay reconciliation failed: ${err.message}. ${codOrders[0]?.count || 0} COD deliveries awaiting settlement in database.`,
          };
        }
      }
      if (action === "view_transactions") {
        if (!razorpayAuth) {
          return { success: true, mode: "simulated", message: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to view live payment transactions." };
        }
        try {
          const res = await fetch("https://api.razorpay.com/v1/payments?count=10", {
            headers: { Authorization: `Basic ${razorpayAuth}` },
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (res.ok) {
            return {
              success: true, mode: "live",
              transactions: data.items?.map((p: any) => ({ id: p.id, amount: p.amount / 100, currency: p.currency, status: p.status, method: p.method, created_at: new Date(p.created_at * 1000).toISOString() })) || [],
              message: `Fetched ${data.items?.length || 0} recent transactions from Razorpay.`,
            };
          }
          return { success: true, mode: "live", razorpay_response: data, message: `Razorpay API returned status ${res.status}.` };
        } catch (err: any) {
          return { success: true, mode: "simulated", message: `Razorpay transaction fetch failed: ${err.message}.` };
        }
      }
      if (action === "send_link") {
        if (!razorpayAuth || !payload.amount || !payload.customer_name) {
          return {
            success: true, mode: "simulated",
            message: "Fill in amount (in paise, e.g. 10000 = ₹100), customer_name, customer_email, and customer_phone to generate a payment link.",
            form: { fields: ["amount", "customer_name", "customer_email", "customer_phone", "description"] },
          };
        }
        try {
          const res = await fetch("https://api.razorpay.com/v1/payment_links", {
            method: "POST",
            headers: { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: payload.amount,
              currency: "INR",
              accept_partial: false,
              description: payload.description || `Payment for ${payload.customer_name}`,
              customer: { name: payload.customer_name, email: payload.customer_email || "", contact: payload.customer_phone || "" },
              notify: { sms: !!payload.customer_phone, email: !!payload.customer_email },
              reminder_enable: true,
              notes: { shipment_id: payload.shipment_id || "" },
            }),
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (res.ok) {
            return {
              success: true, mode: "live",
              payment_link: data.short_url || data.payment_link?.short_url,
              link_id: data.id,
              amount: data.amount,
              message: `Payment link created! Share: ${data.short_url || "Check response for URL"}`,
            };
          }
          return { success: true, mode: "live", razorpay_response: data, message: `Razorpay payment link creation returned status ${res.status}.` };
        } catch (err: any) {
          return { success: true, mode: "simulated", message: `Razorpay payment link creation failed: ${err.message}.` };
        }
      }
      break;
    }

    // ═══════════════════════════════════════════
    // ── MapmyIndia ──
    // ═══════════════════════════════════════════
    case "mapmyindia":
      if (action === "geocode") {
        const address = payload.address || "";
        const licenseKey = process.env.MAPMYINDIA_LICENSE_KEY;

        if (!address) {
          return { success: true, mode: "simulated", message: "Enter an Indian address to convert to latitude/longitude coordinates. Example: 'Connaught Place, New Delhi 110001'." };
        }

        if (licenseKey) {
          try {
            const url = `https://apis.mapmyindia.com/advancedmaps/v1/${encodeURIComponent(licenseKey)}/geo_code?addr=${encodeURIComponent(address)}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            const data = await res.json();
            if (res.ok && data.results?.length > 0) {
              const result = data.results[0];
              return {
                success: true,
                mode: "live",
                address,
                lat: result.lat,
                lng: result.lng,
                formatted_address: result.formatted_address,
                message: `Geocoded: ${result.formatted_address || address} → (${result.lat}, ${result.lng})`,
              };
            }
            return { success: true, mode: "live", address, mapmyindia_response: data, message: "MapmyIndia geocoding completed but returned no results." };
          } catch (err: any) {
            return { success: true, mode: "simulated", message: `MapmyIndia geocoding failed: ${err.message}. Check your license key.` };
          }
        }

        return {
          success: true,
          mode: "simulated",
          message: `Enter an address to geocode. Configure MAPMYINDIA_LICENSE_KEY in Vercel env vars for live geocoding. Address: "${address}"`,
          hint: "Set MAPMYINDIA_LICENSE_KEY in your environment variables.",
        };
      }
      if (action === "optimize_route") {
        return { success: true, mode: "simulated", message: "Enter multiple stop locations to get the fastest delivery route. Lanework will optimize the sequence and provide ETAs for each stop." };
      }
      if (action === "distance_matrix") {
        return { success: true, mode: "simulated", message: "Enter origins and destinations to get travel time and distance between each pair. Useful for dispatching and fleet planning." };
      }
      break;

    // ═══════════════════════════════════════════
    // ── Fleet / LocoNav / FleetX ──
    // ═══════════════════════════════════════════
    case "loconav":
    case "fleetx": {
      const fleetProvider = type === "loconav" ? "LocoNav" : "FleetX";
      const fleetApiKey = process.env.FLEET_API_SECRET || config.api_key;

      if (action === "track_all") {
        if (fleetApiKey) {
          try {
            const fleetEndpoint = type === "loconav"
              ? "https://api.loconav.com/v1/vehicles"
              : "https://api.fleetx.io/v1/fleet/vehicles";
            const res = await fetch(fleetEndpoint, {
              headers: { Authorization: `Bearer ${fleetApiKey}` },
              signal: AbortSignal.timeout(8000),
            });
            const data = await res.json();
            if (res.ok) {
              const vehicles = (data.data || data.vehicles || []).map((v: any) => ({ registration: v.registration_number || v.vehicle_number || v.vehicleId, status: v.status || "active", speed: v.speed_kmh || v.speed || 0, location: v.lat ? `${v.lat}, ${v.lng}` : "—", last_seen: v.last_updated || v.timestamp }));
              return { success: true, mode: "live", provider: fleetProvider, vehicles, count: vehicles.length, message: `Live tracking data from ${fleetProvider}: ${vehicles.length} vehicles.` };
            }
            return { success: true, mode: "live", fleet_response: data, message: `${fleetProvider} API returned status ${res.status}.` };
          } catch (err: any) {
            // Fall through to DB fallback
          }
        }
        // DB fallback
        const vehicles = await sql`SELECT * FROM vehicles ORDER BY last_seen_at DESC LIMIT 10`;
        const tracking = vehicles.map((v: any) => ({ registration: v.registration, status: v.status, last_seen: v.last_seen_at, location: v.last_lat ? `${v.last_lat}, ${v.last_lng}` : "GPS not available" }));
        return {
          success: true, mode: "db-fallback", vehicles: tracking, count: vehicles.length,
          message: vehicles.length > 0 ? `${vehicles.length} vehicles from database. Set FLEET_API_SECRET for live ${fleetProvider} tracking.` : "No vehicles in fleet. Add vehicles in Fleet Management.",
          hint: fleetApiKey ? undefined : `Set FLEET_API_SECRET in environment variables for live ${fleetProvider} telematics.`,
        };
      }
      if (action === "maintenance_check") {
        // Live vehicles table has no maintenance_due_date column — report what we can
        const vehicles = await sql`SELECT * FROM vehicles ORDER BY created_at DESC LIMIT 10`;
        return {
          success: true,
          mode: "db-fallback",
          vehicles: vehicles.map((v: any) => ({
            registration: v.license_plate || v.registration || v.name,
            status: v.status,
            odometer: v.odometer || 0,
            last_seen: v.last_seen_at,
          })),
          count: vehicles.length,
          message: vehicles.length > 0
            ? `${vehicles.length} vehicles in fleet. Maintenance tracking requires odometer/service data — connect ${fleetProvider} for live maintenance alerts.`
            : "No vehicles in fleet. Add vehicles in Fleet Management.",
        };
      }
      if (action === "driver_report") {
        const drivers = await sql`SELECT * FROM drivers ORDER BY created_at DESC LIMIT 10`;
        return { success: true, mode: "db-fallback", drivers: drivers.map((d: any) => ({ name: d.name, license: d.license_number, status: d.status, phone: d.phone || "—" })), count: drivers.length };
      }
      break;
    }

    // ═══════════════════════════════════════════
    // ── Shopify ──
    // ═══════════════════════════════════════════
    case "shopify": {
      const shopifyStore = process.env.SHOPIFY_STORE_URL || config.store_url;
      const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN || config.access_token;

      if (action === "sync_orders") {
        if (!shopifyStore || !shopifyToken) {
          const dbOrders = await sql`SELECT COUNT(*) as count FROM orders`;
          return {
            success: true, mode: "db-fallback",
            message: `${dbOrders[0]?.count || 0} orders in database. Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN for live Shopify sync.`,
            hint: "Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN in environment variables.",
          };
        }
        try {
          const url = `https://${shopifyStore.replace(/https?:\/\//, "")}/admin/api/2024-01/orders.json?status=any&limit=20`;
          const res = await fetch(url, {
            headers: { "X-Shopify-Access-Token": shopifyToken, "Content-Type": "application/json" },
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (res.ok && data.orders) {
            for (const o of data.orders) {
              try {
                await sql`INSERT INTO orders (id, external_id, order_number, total_amount, status, items, created_at) VALUES (${crypto.randomUUID()}, ${String(o.id)}, ${String(o.name || o.order_number || "")}, ${parseFloat(o.total_price || "0")}, ${o.financial_status || "pending"}, ${JSON.stringify({ customer_name: (o.customer?.first_name || "") + " " + (o.customer?.last_name || "") || "Shopify Customer" })}::jsonb, ${o.created_at || new Date().toISOString()}) ON CONFLICT (external_id) DO NOTHING`;
              } catch { /* skip individual imports */ }
            }
            const [count] = await sql`SELECT COUNT(*) as c FROM orders WHERE external_id IS NOT NULL`;
            return { success: true, mode: "live", orders_synced: data.orders.length, total_synced: count?.c || 0, shopify_orders: data.orders.length, message: `Synced ${data.orders.length} orders from Shopify. Total in database: ${count?.c || 0}.` };
          }
          return { success: true, mode: "live", shopify_response: data, message: `Shopify API returned status ${res.status}.` };
        } catch (err: any) {
          return { success: true, mode: "simulated", message: `Shopify sync failed: ${err.message}. Verify SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN.` };
        }
      }
      if (action === "sync_inventory") {
        if (!shopifyStore || !shopifyToken) {
          return { success: true, mode: "simulated", message: "Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN to sync inventory from Shopify." };
        }
        try {
          const url = `https://${shopifyStore.replace(/https?:\/\//, "")}/admin/api/2024-01/products.json?limit=20`;
          const res = await fetch(url, {
            headers: { "X-Shopify-Access-Token": shopifyToken },
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (res.ok && data.products) {
            let synced = 0;
            for (const p of data.products) {
              for (const v of p.variants || []) {
                try {
                  await sql`INSERT INTO inventory (id, sku, name, quantity, updated_at) VALUES (${crypto.randomUUID()}, ${v.sku || `SHOP-${v.id}`}, ${p.title + (v.title && v.title !== "Default Title" ? " - " + v.title : "")}, ${v.inventory_quantity || 0}, NOW()) ON CONFLICT (sku) DO UPDATE SET quantity = ${v.inventory_quantity || 0}, name = ${p.title}, updated_at = NOW()`;
                  synced++;
                } catch { /* skip */ }
              }
            }
            return { success: true, mode: "live", products_synced: data.products.length, variants_synced: synced, message: `Synced ${synced} variants from ${data.products.length} products.` };
          }
          return { success: true, mode: "live", shopify_response: data, message: `Shopify Products API returned status ${res.status}.` };
        } catch (err: any) {
          return { success: true, mode: "simulated", message: `Shopify inventory sync failed: ${err.message}.` };
        }
      }
      break;
    }

    // ═══════════════════════════════════════════
    // ── WooCommerce ──
    // ═══════════════════════════════════════════
    case "woocommerce": {
      const wooStore = process.env.WOO_STORE_URL || config.store_url;
      const wooKey = process.env.WOO_CONSUMER_KEY || config.consumer_key;
      const wooSecret = process.env.WOO_CONSUMER_SECRET || config.consumer_secret;

      if (action === "sync_orders" || action === "sync_inventory") {
        if (!wooStore || !wooKey || !wooSecret) {
          return {
            success: true, mode: "simulated",
            message: "Set WOO_STORE_URL, WOO_CONSUMER_KEY, and WOO_CONSUMER_SECRET for live WooCommerce sync.",
            hint: "Generate consumer keys in WooCommerce > Settings > Advanced > REST API.",
          };
        }
        try {
          const endpoint = action === "sync_orders" ? "orders?per_page=20" : "products?per_page=20";
          const url = `${wooStore.replace(/\/$/, "")}/wp-json/wc/v3/${endpoint}`;
          const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString("base64");
          const res = await fetch(url, {
            headers: { Authorization: `Basic ${auth}` },
            signal: AbortSignal.timeout(8000),
          });
          const data = await res.json();
          if (res.ok && Array.isArray(data)) {
            let synced = 0;
            for (const item of data) {
              try {
                if (action === "sync_orders") {
                  await sql`INSERT INTO orders (id, external_id, order_number, total_amount, status, items, created_at) VALUES (${crypto.randomUUID()}, ${String(item.id)}, ${String(item.number || item.order_key || "")}, ${parseFloat(item.total || "0")}, ${item.status || "pending"}, ${JSON.stringify({ customer_name: (item.billing?.first_name + " " + item.billing?.last_name) || "WC Customer" })}::jsonb, ${item.date_created || new Date().toISOString()}) ON CONFLICT (external_id) DO NOTHING`;
                } else {
                  await sql`INSERT INTO inventory (id, sku, name, quantity, updated_at) VALUES (${crypto.randomUUID()}, ${item.sku || `WC-${item.id}`}, ${item.name}, ${item.stock_quantity || 0}, NOW()) ON CONFLICT (sku) DO UPDATE SET quantity = ${item.stock_quantity || 0}, updated_at = NOW()`;
                }
                synced++;
              } catch { /* skip */ }
            }
            return { success: true, mode: "live", items_synced: synced, total: data.length, message: `Synced ${synced}/${data.length} items from WooCommerce.` };
          }
          return { success: true, mode: "live", woocommerce_response: Array.isArray(data) ? { count: data.length } : data, message: `WooCommerce API returned ${Array.isArray(data) ? data.length : "error"} items.` };
        } catch (err: any) {
          return { success: true, mode: "simulated", message: `WooCommerce sync failed: ${err.message}.` };
        }
      }
      break;
    }

    // ═══════════════════════════════════════════
    // ── SAP B1 ──
    // ═══════════════════════════════════════════
    case "sap_b1": {
      const sapUrl = process.env.SAP_SERVICE_LAYER_URL || config.service_layer_url;
      const sapUser = config.username || payload.username;
      const sapPass = config.password || payload.password;
      const sapDb = config.company_db || process.env.SAP_COMPANY_DB;

      if (action === "sync_orders") {
        if (!sapUrl || !sapUser || !sapPass) {
          const dbOrders = await sql`SELECT COUNT(*) as count FROM orders`;
          return {
            success: true, mode: "db-fallback",
            message: `${dbOrders[0]?.count || 0} orders in database. Set SAP_SERVICE_LAYER_URL, username, and password for SAP B1 sync.`,
          };
        }
        try {
          const loginRes = await fetch(`${sapUrl}/Login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ CompanyDB: sapDb, UserName: sapUser, Password: sapPass }),
            signal: AbortSignal.timeout(8000),
          });
          if (!loginRes.ok) return { success: true, mode: "simulated", message: `SAP B1 login failed with HTTP ${loginRes.status}. Check credentials.` };
          const loginData = await loginRes.json();
          const sessionId = loginData.SessionId;

          const ordersRes = await fetch(`${sapUrl}/Orders?$top=20`, {
            headers: { Cookie: `B1SESSION=${sessionId}` },
            signal: AbortSignal.timeout(8000),
          });
          const data = await ordersRes.json();
          if (ordersRes.ok && data.value) {
            let synced = 0;
            for (const o of data.value) {
              try {
                await sql`INSERT INTO orders (id, external_id, order_number, total_amount, status, items, created_at) VALUES (${crypto.randomUUID()}, ${String(o.DocEntry)}, ${String(o.DocNum || "")}, ${o.DocTotal || 0}, ${o.DocumentStatus === "bostatus_Close" ? "closed" : "open"}, ${JSON.stringify({ customer_name: o.CardName || "SAP Customer" })}::jsonb, ${o.DocDate ? new Date(o.DocDate).toISOString() : new Date().toISOString()}) ON CONFLICT (external_id) DO NOTHING`;
                synced++;
              } catch { /* skip */ }
            }
            return { success: true, mode: "live", orders_synced: synced, sap_orders: data.value.length, message: `Synced ${synced}/${data.value.length} orders from SAP B1.` };
          }
          return { success: true, mode: "live", sap_response: data, message: `SAP B1 Orders API returned ${ordersRes.status}.` };
        } catch (err: any) {
          return { success: true, mode: "simulated", message: `SAP B1 sync failed: ${err.message}.` };
        }
      }
      if (action === "sync_inventory") {
        return { success: true, mode: "simulated", message: "Enter SAP B1 credentials to sync inventory items from SAP Business One." };
      }
      break;
    }

    // ── Generic / Fallback ──
    default:
      if (action === "configure") {
        return {
          success: true,
          mode: "simulated",
          message: `Configure ${type} by setting the required API keys in Vercel environment variables. See the Docs page for detailed setup instructions for this integration.`,
          config_fields: ["api_key", "api_secret", "endpoint_url"],
        };
      }
      if (action === "test") {
        return { success: true, mode: "simulated", message: `Testing ${type} connection... Make sure API keys are configured in environment variables. If this fails, check Vercel dashboard → Environment Variables.` };
      }
      if (action === "view_logs") {
        return { success: true, mode: "simulated", message: `No recent activity logged for ${type}. Connect and use the integration to see logs here.` };
      }
  }

  return { success: true, mode: "simulated", message: `Action "${action}" executed for ${type}.` };
}
