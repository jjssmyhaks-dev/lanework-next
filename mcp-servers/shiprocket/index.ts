// @ts-nocheck — MCP SDK types resolved at build time in project context
/**
 * Shiprocket MCP Server
 * One integration → 7+ Indian carriers (Delhivery, BlueDart, DTDC, Ecom Express, XpressBees, Shadowfax, etc.)
 *
 * Tools:
 * - track_shipment: Get real-time tracking for any AWB
 * - create_shipment: Book a shipment with any carrier
 * - get_rates: Compare shipping rates across carriers
 * - cancel_shipment: Cancel a shipment
 * - generate_label: Generate shipping label & manifest
 * - sync_webhook: Process Shiprocket webhook events (status updates, NDR)
 *
 * Graceful fallback: when SHIPROCKET_EMAIL/PASSWORD missing, returns DB-fallback data.
 * Each tool result includes `mode: "live" | "simulated" | "db-fallback"`.
 *
 * ENV required:
 * - SHIPROCKET_EMAIL
 * - SHIPROCKET_PASSWORD
 * - SHIPROCKET_CHANNEL_ID (optional, for multi-channel)
 */

import { LaneworkMCPServer, isDirectRun } from "../shared/server.ts";
import crypto from "crypto";

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

let authToken: string | null = null;
let tokenExpiry = 0;

export class ShiprocketMCP extends LaneworkMCPServer {
  private email: string;
  private password: string;
  private hasCredentials: boolean = false;

  constructor() {
    super("shipment-tracking");
    this.email = "";
    this.password = "";
  }

  async init(): Promise<void> {
    await this.loadConfig();
    this.email = this.getEnv("SHIPROCKET_EMAIL");
    this.password = this.getEnv("SHIPROCKET_PASSWORD");
    this.hasCredentials = this.hasEnv("SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD");
    if (this.hasCredentials) {
      await this.authenticate();
    }
  }

  /** ─── AUTH ───
   *  Wrapped with safeApiCall — returns "" when credentials missing, never throws */
  private async authenticate(): Promise<string> {
    if (!this.hasCredentials) return "";
    if (authToken && Date.now() < tokenExpiry) return authToken;

    const result = await this.safeApiCall<any>(
      "Shiprocket Auth",
      `${SHIPROCKET_BASE}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email, password: this.password }),
      },
      null, // no fallback data for auth — token is null
    );

    if (result.ok && result.data?.token) {
      authToken = result.data.token;
      tokenExpiry = Date.now() + 8 * 60 * 60 * 1000; // 8h expiry
      await this.logAction("authenticate", "completed");
      return authToken!;
    }

    // Auth failed (network, bad creds, etc.) — graceful
    console.error(`[ShiprocketMCP] Auth failed: ${result.message}`);
    await this.logAction("authenticate", "failed", { reason: result.message });
    return "";
  }

  /** Internal API request — returns null when no credentials or call fails */
  private async req(method: string, path: string, body?: any): Promise<any> {
    const token = await this.authenticate();
    if (!token) return null;

    const result = await this.safeApiCall<any>(
      `Shiprocket ${method} ${path}`,
      `${SHIPROCKET_BASE}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      null,
    );

    return result.data;
  }

  /** ─── TOOLS ───
   *  Each returns { mode: "live" | "simulated" | "db-fallback", ... } */

  /** Track any AWB/order across all integrated carriers */
  async trackShipment(awb: string): Promise<{
    mode: string; awb: string; status: string; statusCode: number;
    location: string; lastUpdate: string;
    scans: Array<{ status: string; location: string; time: string }>;
  }> {
    await this.logAction("track_shipment", "started", { awb });

    // Try live API
    if (this.hasCredentials) {
      const data = await this.req("GET", `/courier/track/awb/${awb}`);
      if (data) {
        const result = {
          mode: "live",
          awb,
          status: data.tracking_data?.shipment_status || "unknown",
          statusCode: data.tracking_data?.shipment_status_id || 0,
          location: data.tracking_data?.current_location || "",
          lastUpdate: data.tracking_data?.etd || "",
          scans: (data.tracking_data?.scan || []).map((s: any) => ({
            status: s.status,
            location: `${s.scanned_location || ""}, ${s.instructions || ""}`,
            time: s.scanned_date || "",
          })),
        };

        try {
          await this.sql`
            UPDATE shipments SET status = ${result.status}, updated_at = NOW()
            WHERE tracking_number = ${awb}
          `;
        } catch { /* DB update best-effort */ }

        await this.logAction("track_shipment", "completed", result);
        return result;
      }
    }

    // DB fallback — shipments table
    try {
      const rows: any[] = await this.sql`
        SELECT * FROM shipments WHERE tracking_number = ${awb} LIMIT 1
      ` as any;
      if (rows.length > 0) {
        const s = rows[0];
        await this.logAction("track_shipment", "completed", { awb, source: "db-fallback" });
        return {
          mode: "db-fallback",
          awb: s.tracking_number as string,
          status: (s.status as string) || "unknown",
          statusCode: 0,
          location: (s.destination as string) || "",
          lastUpdate: (s.updated_at as string) || (s.created_at as string) || "",
          scans: [],
        };
      }
    } catch { /* DB may not exist yet */ }

    // No data at all → simulated
    await this.logAction("track_shipment", "failed", { awb, error: "no-credentials-no-db" });
    return {
      mode: "simulated",
      awb, status: "unknown", statusCode: 0, location: "", lastUpdate: "", scans: [],
    };
  }

  /** Create a shipment booking */
  async bookShipment(order: {
    orderId: string; pickupPincode: string; deliveryPincode: string;
    weight: number; length?: number; breadth?: number; height?: number;
    paymentMode?: "prepaid" | "cod"; codAmount?: number;
    customerName: string; customerPhone: string; customerAddress: string;
    customerEmail?: string;
  }): Promise<{
    mode: string; shipmentId: string; awb: string; courier: string;
    labelUrl: string; trackingUrl: string; message?: string;
  }> {
    await this.logAction("create_shipment", "started", order);

    if (!this.hasCredentials) {
      // Save to DB anyway so we have a record
      const fakeAwb = `PENDING-${order.orderId}-${Date.now()}`;
      try {
        await super.createShipment({
          trackingNumber: fakeAwb, carrier: "pending",
          origin: order.pickupPincode, destination: order.deliveryPincode,
          customerName: order.customerName, customerPhone: order.customerPhone,
          status: "pending_credentials",
        });
      } catch { /* DB insert best-effort */ }

      await this.logAction("create_shipment", "completed", { orderId: order.orderId, source: "simulated" });
      return {
        mode: "simulated",
        shipmentId: `pending-${order.orderId}`,
        awb: fakeAwb,
        courier: "pending",
        labelUrl: "",
        trackingUrl: "",
        message: "⚠️ Shiprocket API keys not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in Vercel env vars to create real shipments. Shipment saved as pending in local DB.",
      };
    }

    const payload = {
      order_id: order.orderId,
      order_date: new Date().toISOString().split("T")[0],
      pickup_location: "Lanework Pickup",
      channel_id: this.config.SHIPROCKET_CHANNEL_ID || "",
      billing_customer_name: order.customerName,
      billing_address: order.customerAddress,
      billing_city: "",
      billing_pincode: order.deliveryPincode,
      billing_state: "",
      billing_country: "India",
      billing_email: order.customerEmail || "",
      billing_phone: order.customerPhone,
      shipping_is_billing: true,
      order_items: [{
        name: "Shipment", sku: `SKU-${order.orderId}`, units: 1,
        selling_price: order.paymentMode === "cod" ? (order.codAmount || 0) : 0,
      }],
      payment_method: order.paymentMode || "prepaid",
      sub_total: order.paymentMode === "cod" ? (order.codAmount || 0) : 0,
      length: order.length || 10, breadth: order.breadth || 10,
      height: order.height || 10, weight: order.weight,
    };

    const data = await this.req("POST", "/orders/create/adhoc", payload);

    if (!data) {
      // API call failed — return simulated
      const fakeAwb = `FAILED-${order.orderId}-${Date.now()}`;
      try {
        await super.createShipment({
          trackingNumber: fakeAwb, carrier: "failed",
          origin: order.pickupPincode, destination: order.deliveryPincode,
          customerName: order.customerName, customerPhone: order.customerPhone,
          status: "api_failed",
        });
      } catch { /* DB insert best-effort */ }

      return {
        mode: "simulated",
        shipmentId: `failed-${order.orderId}`,
        awb: fakeAwb,
        courier: "api-failed",
        labelUrl: "",
        trackingUrl: "",
        message: "⚠️ Shiprocket API unavailable. Shipment saved locally — retry when API is reachable.",
      };
    }

    const result = {
      mode: "live",
      shipmentId: data.shipment_id?.toString() || "",
      awb: data.awb_code || "",
      courier: data.courier_name || "",
      labelUrl: data.label_url || "",
      trackingUrl: `https://shiprocket.co/tracking/${data.awb_code}`,
    };

    try {
      await super.createShipment({
        trackingNumber: result.awb, carrier: result.courier || "Shiprocket",
        origin: order.pickupPincode, destination: order.deliveryPincode,
        customerName: order.customerName, customerPhone: order.customerPhone,
        status: "pending",
      });
    } catch { /* DB insert best-effort */ }

    try {
      await this.logIntegrationEvent("shiprocket", "shipment_created", result);
    } catch { /* event log best-effort */ }

    await this.logAction("create_shipment", "completed", result);
    return result;
  }

  /** Compare shipping rates across available carriers */
  async getRates(pickupPincode: string, deliveryPincode: string, weight: number): Promise<{
    mode: string; rates: Array<{ courier: string; rate: number; estimatedDays: string; isRecommended: boolean }>;
    message?: string;
  }> {
    if (!this.hasCredentials) {
      return {
        mode: "simulated",
        rates: [],
        message: "⚠️ Shiprocket API keys not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to compare live rates.",
      };
    }

    const data = await this.req(
      "GET",
      `/courier/serviceability?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=0`,
    );

    if (!data) {
      await this.logAction("get_rates", "failed", { pickupPincode, deliveryPincode, error: "api-unavailable" });
      return {
        mode: "simulated",
        rates: [],
        message: "⚠️ Shiprocket API unavailable. Try again later.",
      };
    }

    const rates = ((data.data?.available_courier_companies || []) as any[]).map((c: any) => ({
      courier: c.courier_name,
      rate: c.rate || c.freight_charge || 0,
      estimatedDays: c.estimated_delivery_days || "3-5",
      isRecommended: c.courier_name === (data.recommended_courier_company_id
        ? data.data?.available_courier_companies?.find((x: any) =>
            x.courier_company_id === data.recommended_courier_company_id)?.courier_name
        : false),
    }));

    rates.sort((a, b) => a.rate - b.rate);
    return { mode: "live", rates };
  }

  /** Cancel a shipment */
  async cancelShipment(awb: string): Promise<{ mode: string; success: boolean; message: string }> {
    if (!this.hasCredentials) {
      try {
        await this.sql`UPDATE shipments SET status = 'cancelled', updated_at = NOW() WHERE tracking_number = ${awb}`;
      } catch { /* DB update best-effort */ }
      return { mode: "db-fallback", success: true, message: `Shipment ${awb} marked cancelled in local DB. Configure Shiprocket API keys to cancel on carrier side.` };
    }

    const data = await this.req("POST", "/orders/cancel", { awbs: [awb] });

    if (!data) {
      // API failed but still update local DB
      try {
        await this.sql`UPDATE shipments SET status = 'cancelled', updated_at = NOW() WHERE tracking_number = ${awb}`;
      } catch { /* DB update best-effort */ }
      await this.logAction("cancel_shipment", "completed", { awb, source: "simulated" });
      return { mode: "simulated", success: true, message: `Shipment ${awb} cancelled in local DB. API unavailable — carrier may not have received cancellation.` };
    }

    try {
      await this.sql`UPDATE shipments SET status = 'cancelled', updated_at = NOW() WHERE tracking_number = ${awb}`;
    } catch { /* DB update best-effort */ }

    await this.logAction("cancel_shipment", "completed", { awb });
    return { mode: "live", success: true, message: `Shipment ${awb} cancelled` };
  }

  /** Generate shipping label & manifest */
  async generateLabel(shipmentId: string): Promise<{ mode: string; labelUrl: string; manifestUrl: string; message?: string }> {
    if (!this.hasCredentials) {
      return {
        mode: "simulated",
        labelUrl: "",
        manifestUrl: "",
        message: "⚠️ Shiprocket API keys not configured. Cannot generate labels.",
      };
    }

    const data = await this.req("POST", "/courier/generate/label", { shipment_id: [shipmentId] });

    if (!data) {
      return {
        mode: "simulated",
        labelUrl: "",
        manifestUrl: "",
        message: "⚠️ Shiprocket API unavailable. Try again later.",
      };
    }

    return {
      mode: "live",
      labelUrl: data.label_url || "",
      manifestUrl: data.manifest_url || "",
    };
  }

  /** Process Shiprocket webhook (called by /api/webhooks/shiprocket) */
  async handleWebhook(event: any): Promise<void> {
    const awb = event.awb || event.tracking_number;
    if (!awb) return;

    const statusMap: Record<number, string> = {
      0: "created", 1: "pickup_scheduled", 2: "picked_up",
      3: "in_transit", 4: "out_for_delivery", 7: "delivered",
      8: "cancelled", 9: "rto_initiated", 10: "rto_delivered",
    };

    const status = statusMap[event.shipment_status_id] || event.shipment_status || "unknown";

    try {
      let shipmentId: string | null = null;
      try {
        const [s] = await this.sql`SELECT id FROM shipments WHERE tracking_number = ${awb} LIMIT 1`;
        shipmentId = s?.id || null;
      } catch { /* ignore */ }
      await this.sql`
        INSERT INTO shipment_events (id, shipment_id, event_type, location, description, created_at)
        VALUES (${crypto.randomUUID()}, ${shipmentId}, ${status},
          ${JSON.stringify({ address: event.current_location || "" })}::jsonb, ${event.status_description || ""}, NOW())
      `;

      await this.sql`
        UPDATE shipments SET status = ${status}, updated_at = NOW() WHERE tracking_number = ${awb}
      `;
    } catch {
      console.error(`[ShiprocketMCP] Webhook DB update failed for AWB ${awb}`);
    }

    // Trigger WhatsApp notification on status change
    if (["picked_up", "out_for_delivery", "delivered", "rto_initiated"].includes(status)) {
      try {
        await this.logIntegrationEvent("whatsapp", "status_notification", {
          awb, status,
          template: status === "delivered" ? "shipment_delivered" : "shipment_update",
        });
      } catch { /* event log best-effort */ }
    }
  }
}

// ─── MCP Server entry point ───
async function main(): Promise<void> {
const SDK = "@modelcontextprotocol/sdk";
  const { Server } = await import(`${SDK}/server/index.js`);
  const { StdioServerTransport } = await import(`${SDK}/server/stdio.js`);
  const { CallToolRequestSchema, ListToolsRequestSchema } = await import(`${SDK}/types.js`);
  
  const mcp = new ShiprocketMCP();
  
  const server = new Server(
    { name: "lanework-shiprocket", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "track_shipment",
        description: "Track any shipment by AWB across all Indian carriers. Returns real-time status, location, and scan history.",
        inputSchema: {
          type: "object",
          properties: { awb: { type: "string", description: "AWB/Tracking number" } },
          required: ["awb"],
        },
      },
      {
        name: "create_shipment",
        description: "Book a shipment with the best carrier. Returns AWB, courier name, and label URL.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: { type: "string" },
            pickupPincode: { type: "string" },
            deliveryPincode: { type: "string" },
            weight: { type: "number" },
            length: { type: "number" },
            breadth: { type: "number" },
            height: { type: "number" },
            paymentMode: { type: "string", enum: ["prepaid", "cod"] },
            codAmount: { type: "number" },
            customerName: { type: "string" },
            customerPhone: { type: "string" },
            customerAddress: { type: "string" },
            customerEmail: { type: "string" },
          },
          required: ["orderId", "pickupPincode", "deliveryPincode", "weight", "customerName", "customerPhone", "customerAddress"],
        },
      },
      {
        name: "get_rates",
        description: "Compare shipping rates across all available carriers for a given route and weight.",
        inputSchema: {
          type: "object",
          properties: {
            pickupPincode: { type: "string" },
            deliveryPincode: { type: "string" },
            weight: { type: "number" },
          },
          required: ["pickupPincode", "deliveryPincode", "weight"],
        },
      },
      {
        name: "cancel_shipment",
        description: "Cancel a shipment and get refund.",
        inputSchema: {
          type: "object",
          properties: { awb: { type: "string" } },
          required: ["awb"],
        },
      },
    ],
  }));
  
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    await mcp.init();
  
    try {
      let result: any;
      switch (name) {
        case "track_shipment": result = await mcp.trackShipment(args.awb as string); break;
        case "create_shipment": result = await mcp.bookShipment(args as any); break;
        case "get_rates": result = await mcp.getRates(args.pickupPincode as string, args.deliveryPincode as string, args.weight as number); break;
        case "cancel_shipment": result = await mcp.cancelShipment(args.awb as string); break;
        default: throw new Error(`Unknown tool: ${name}`);
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true };
    }
  });
  
  const transport = new StdioServerTransport();
  await mcp.init();
  await server.connect(transport);
  console.error("[ShiprocketMCP] Ready — 4 tools available");
  
}

// Run only when executed directly (tsx index.ts), not when imported by the app.
if (isDirectRun(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
