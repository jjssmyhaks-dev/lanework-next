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
 * ENV required:
 * - SHIPROCKET_EMAIL
 * - SHIPROCKET_PASSWORD
 * - SHIPROCKET_CHANNEL_ID (optional, for multi-channel)
 */

import { LaneworkMCPServer } from "../shared/server.js";

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

let authToken: string | null = null;
let tokenExpiry = 0;

export class ShiprocketMCP extends LaneworkMCPServer {
  private email: string;
  private password: string;

  constructor() {
    super("shipment-tracking");
    this.email = "";
    this.password = "";
  }

  async init(): Promise<void> {
    await this.loadConfig();
    this.email = this.getEnv("SHIPROCKET_EMAIL");
    this.password = this.getEnv("SHIPROCKET_PASSWORD");
    await this.authenticate();
  }

  /** ─── AUTH ─── */
  private async authenticate(): Promise<string> {
    if (authToken && Date.now() < tokenExpiry) return authToken;

    const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });

    if (!res.ok) throw new Error(`Shiprocket auth failed: ${res.status} ${await res.text()}`);

    const data: any = await res.json();
    authToken = data.token;
    tokenExpiry = Date.now() + 8 * 60 * 60 * 1000; // 8h expiry
    await this.logAction("authenticate", "completed");
    return authToken!;
  }

  private async req(method: string, path: string, body?: any): Promise<any> {
    const token = await this.authenticate();
    const res = await fetch(`${SHIPROCKET_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(`Shiprocket API error: ${res.status} — ${JSON.stringify(json)}`);
    }
    return json;
  }

  /** ─── TOOLS ─── */

  /** Track any AWB/order across all integrated carriers */
  async trackShipment(awb: string): Promise<{
    awb: string;
    status: string;
    statusCode: number;
    location: string;
    lastUpdate: string;
    scans: Array<{ status: string; location: string; time: string }>;
  }> {
    await this.logAction("track_shipment", "started", { awb });
    try {
      const data = await this.req("GET", `/courier/track/awb/${awb}`);
      const result = {
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

      // Update local DB
      await this.sql`
        UPDATE shipments SET
          status = ${result.status},
          updated_at = NOW()
        WHERE tracking_number = ${awb}
      `;

      await this.logAction("track_shipment", "completed", result);
      return result;
    } catch (e: any) {
      await this.logAction("track_shipment", "failed", { awb, error: e.message });
      throw e;
    }
  }

  /** Create a shipment booking */
  async createShipment(order: {
    orderId: string;
    pickupPincode: string;
    deliveryPincode: string;
    weight: number;
    length?: number;
    breadth?: number;
    height?: number;
    paymentMode?: "prepaid" | "cod";
    codAmount?: number;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerEmail?: string;
  }): Promise<{
    shipmentId: string;
    awb: string;
    courier: string;
    labelUrl: string;
    trackingUrl: string;
  }> {
    await this.logAction("create_shipment", "started", order);

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
      order_items: [
        {
          name: "Shipment",
          sku: `SKU-${order.orderId}`,
          units: 1,
          selling_price: order.paymentMode === "cod" ? (order.codAmount || 0) : 0,
        },
      ],
      payment_method: order.paymentMode || "prepaid",
      sub_total: order.paymentMode === "cod" ? (order.codAmount || 0) : 0,
      length: order.length || 10,
      breadth: order.breadth || 10,
      height: order.height || 10,
      weight: order.weight,
    };

    try {
      const data = await this.req("POST", "/orders/create/adhoc", payload);

      const result = {
        shipmentId: data.shipment_id?.toString() || "",
        awb: data.awb_code || "",
        courier: data.courier_name || "",
        labelUrl: data.label_url || "",
        trackingUrl: `https://shiprocket.co/tracking/${data.awb_code}`,
      };

      // Save to database
      await this.createShipment({
        trackingNumber: result.awb,
        carrier: result.courier || "Shiprocket",
        origin: order.pickupPincode,
        destination: order.deliveryPincode,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        status: "pending",
      });

      // Log integration event
      await this.logIntegrationEvent("shiprocket", "shipment_created", result);

      await this.logAction("create_shipment", "completed", result);
      return result;
    } catch (e: any) {
      await this.logAction("create_shipment", "failed", { error: e.message });
      throw e;
    }
  }

  /** Compare shipping rates across available carriers */
  async getRates(pickupPincode: string, deliveryPincode: string, weight: number): Promise<Array<{
    courier: string;
    rate: number;
    estimatedDays: string;
    isRecommended: boolean;
  }>> {
    try {
      const data = await this.req("GET", `/courier/serviceability?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=0`);

      const rates = ((data.data?.available_courier_companies || []) as any[]).map((c: any) => ({
        courier: c.courier_name,
        rate: c.rate || c.freight_charge || 0,
        estimatedDays: c.estimated_delivery_days || "3-5",
        isRecommended: c.courier_name === (data.recommended_courier_company_id ? data.data?.available_courier_companies?.find((x: any) => x.courier_company_id === data.recommended_courier_company_id)?.courier_name : false),
      }));

      rates.sort((a, b) => a.rate - b.rate);
      return rates;
    } catch (e: any) {
      await this.logAction("get_rates", "failed", { error: e.message });
      throw e;
    }
  }

  /** Cancel a shipment */
  async cancelShipment(awb: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.req("POST", "/orders/cancel", { awbs: [awb] });
      await this.sql`UPDATE shipments SET status = 'cancelled', updated_at = NOW() WHERE tracking_number = ${awb}`;
      await this.logAction("cancel_shipment", "completed", { awb });
      return { success: true, message: `Shipment ${awb} cancelled` };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  /** Generate shipping label & manifest */
  async generateLabel(shipmentId: string): Promise<{ labelUrl: string; manifestUrl: string }> {
    const data = await this.req("POST", "/courier/generate/label", { shipment_id: [shipmentId] });
    return {
      labelUrl: data.label_url || "",
      manifestUrl: data.manifest_url || "",
    };
  }

  /** Process Shiprocket webhook (called by /api/webhooks/shiprocket) */
  async handleWebhook(event: any): Promise<void> {
    const awb = event.awb || event.tracking_number;
    if (!awb) return;

    const statusMap: Record<number, string> = {
      0: "created",
      1: "pickup_scheduled",
      2: "picked_up",
      3: "in_transit",
      4: "out_for_delivery",
      7: "delivered",
      8: "cancelled",
      9: "rto_initiated",
      10: "rto_delivered",
    };

    const status = statusMap[event.shipment_status_id] || event.shipment_status || "unknown";

    await this.sql`
      INSERT INTO shipment_events (id, tracking_number, status, location, description, created_at)
      VALUES (${crypto.randomUUID()}, ${awb}, ${status}, ${event.current_location || ""}, ${event.status_description || ""}, NOW())
    `;

    await this.sql`
      UPDATE shipments SET status = ${status}, updated_at = NOW() WHERE tracking_number = ${awb}
    `;

    // Trigger WhatsApp notification on status change
    if (["picked_up", "out_for_delivery", "delivered", "rto_initiated"].includes(status)) {
      await this.logIntegrationEvent("whatsapp", "status_notification", {
        awb,
        status,
        template: status === "delivered" ? "shipment_delivered" : "shipment_update",
      });
    }
  }
}

// MCP Server entry point
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import crypto from "crypto";

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
      case "create_shipment": result = await mcp.createShipment(args as any); break;
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
