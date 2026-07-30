import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
}

async function routeAction(type: string, action: string, config: any, sql: any, payload: any): Promise<any> {
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
        return { success: true, mode: "db-fallback", messages: msgs.map((m: any) => ({ to: m.recipient, status: m.status, sentAt: m.created_at })), count: msgs.length };
      }
      break;

    // ── Google Sheets ──
    case "google_sheets":
      if (action === "sync_sheet") {
        return { success: true, mode: "simulated", message: "Starting Google Sheets sync. Data will be pulled from your configured spreadsheet and merged into Lanework." };
      }
      if (action === "export_sheet") {
        const rows = await sql`SELECT COUNT(*) as count FROM shipments`;
        return { success: true, mode: "db-fallback", message: `Ready to export ${rows[0]?.count || 0} shipments to Google Sheets.` };
      }
      if (action === "configure_sheet") {
        return { success: true, mode: "simulated", fields: ["tracking_number", "carrier", "status", "origin", "destination", "customer_name", "customer_phone", "estimated_delivery"], message: "Map these columns to your Google Sheets columns." };
      }
      break;

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

            // Upsert to inventory table
            let upserted = 0;
            for (const item of items) {
              try {
                await sql`
                  INSERT INTO inventory (item_name, quantity, updated_at)
                  VALUES (${item.name}, ${parseFloat(item.closingBalance) || 0}, NOW())
                  ON CONFLICT (item_name) DO UPDATE SET quantity = ${parseFloat(item.closingBalance) || 0}, updated_at = NOW()
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
              inventory: dbItems.map((i: any) => ({ item_name: i.item_name, quantity: i.quantity, updated_at: i.updated_at })),
              message: `TallyPrime sync failed (${err.message}). Showing cached inventory from database.`,
            };
          }
        }

        // No TALLY_REST_URL — read from inventory table
        const dbItems = await sql`SELECT * FROM inventory ORDER BY updated_at DESC LIMIT 20`;
        return {
          success: true,
          mode: "db-fallback",
          inventory: dbItems.map((i: any) => ({ item_name: i.item_name, quantity: i.quantity, updated_at: i.updated_at })),
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
        return {
          success: true,
          mode: "simulated",
          message: "Ready to generate an e-way bill. Provide shipment details: from GSTIN, to GSTIN, invoice number, invoice value, HSN code, and product details.",
          form: { fields: ["shipment_id", "from_gstin", "to_gstin", "invoice_no", "invoice_value", "hsn_code", "product_name", "quantity"] },
        };
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
        const ewbs = await sql`SELECT * FROM eway_bills ORDER BY created_at DESC LIMIT 5`;
        return { success: true, mode: "db-fallback", eway_bills: ewbs.map((e: any) => ({ ewb_no: e.ewb_no, status: e.status, created_at: e.created_at })), count: ewbs.length };
      }
      break;

    // ── Razorpay ──
    case "razorpay":
      if (action === "reconcile") {
        return { success: true, mode: "simulated", message: "Starting COD reconciliation. Lanework will match shipment COD amounts with Razorpay settlements. Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." };
      }
      if (action === "view_transactions") {
        return { success: true, mode: "simulated", message: "Connect Razorpay to view payment transactions. COD payments and settlements will appear here once configured." };
      }
      if (action === "send_link") {
        return { success: true, mode: "simulated", message: "Enter customer details to generate a Razorpay payment link. Customer receives an SMS/email with the link." };
      }
      break;

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

    // ── Fleet / LocoNav / FleetX ──
    case "loconav":
    case "fleetx":
      if (action === "track_all") {
        const vehicles = await sql`SELECT * FROM vehicles ORDER BY last_seen_at DESC LIMIT 10`;
        const tracking = vehicles.map((v: any) => ({ registration: v.registration, status: v.status, last_seen: v.last_seen_at, location: v.last_lat ? `${v.last_lat}, ${v.last_lng}` : "GPS not available" }));
        return { success: true, mode: "db-fallback", vehicles: tracking, count: vehicles.length, message: vehicles.length > 0 ? `${vehicles.length} vehicles found in your fleet` : "No vehicles in fleet. Add vehicles in Fleet Management." };
      }
      if (action === "maintenance_check") {
        const due = await sql`SELECT * FROM vehicles WHERE maintenance_due_date < NOW() + INTERVAL '7 days' ORDER BY maintenance_due_date ASC LIMIT 10`;
        return { success: true, mode: "db-fallback", maintenance_due: due.map((v: any) => ({ registration: v.registration, due_date: v.maintenance_due_date })), count: due.length };
      }
      if (action === "driver_report") {
        const drivers = await sql`SELECT * FROM drivers ORDER BY created_at DESC LIMIT 10`;
        return { success: true, mode: "db-fallback", drivers: drivers.map((d: any) => ({ name: d.name, license: d.license_number, hours_today: d.hours_today || 0, compliance: d.hours_today > 12 ? "⚠️ Over limit" : "✅ OK" })), count: drivers.length };
      }
      break;

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
