/**
 * FedEx / DHL / International Carriers MCP Server
 * For Indian logistics companies shipping internationally
 *
 * Tools:
 * - track_fedex: Track FedEx shipment by tracking number
 * - create_fedex_shipment: Create a FedEx shipment + label
 * - track_dhl: Track DHL Express shipment
 * - create_dhl_shipment: Create DHL Express shipment
 *
 * ENV: FEDEX_API_KEY, FEDEX_SECRET_KEY, FEDEX_ACCOUNT_NUMBER, DHL_API_KEY, DHL_ACCOUNT_NUMBER
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class FedexMCP extends LaneworkMCPServer {
  private fedexKey: string = "";
  private fedexSecret: string = "";
  private fedexAccount: string = "";
  private fedexToken: string = "";
  private fedexTokenExpiry: number = 0;
  private fedexBase = "https://apis-sandbox.fedex.com"; // Switch to *.fedex.com in production

  private dhlKey: string = "";
  private dhlAccount: string = "";
  private dhlBase = "https://api-eu.dhl.com/track/shipments"; // Sandbox URL

  constructor() { super("shipment-tracking"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.fedexKey = process.env.FEDEX_API_KEY || this.config.FEDEX_API_KEY || "";
    this.fedexSecret = process.env.FEDEX_SECRET_KEY || this.config.FEDEX_SECRET_KEY || "";
    this.fedexAccount = process.env.FEDEX_ACCOUNT_NUMBER || this.config.FEDEX_ACCOUNT_NUMBER || "";
    this.dhlKey = process.env.DHL_API_KEY || this.config.DHL_API_KEY || "";
    this.dhlAccount = process.env.DHL_ACCOUNT_NUMBER || this.config.DHL_ACCOUNT_NUMBER || "";
  }

  /** ─── FEDEX AUTH ─── */
  private async fedexAuth(): Promise<string> {
    if (this.fedexToken && Date.now() < this.fedexTokenExpiry) return this.fedexToken;

    const res = await fetch(`${this.fedexBase}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${this.fedexKey}&client_secret=${this.fedexSecret}`,
    });
    if (!res.ok) throw new Error(`FedEx auth failed: ${res.status}`);
    const data: any = await res.json();
    this.fedexToken = data.access_token;
    this.fedexTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return this.fedexToken;
  }

  private async fedexReq(method: string, path: string, body?: any): Promise<any> {
    const token = await this.fedexAuth();
    const res = await fetch(`${this.fedexBase}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`FedEx API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  /** ─── DHL REQ ─── */
  private async dhlReq(trackingNumber: string): Promise<any> {
    const res = await fetch(`${this.dhlBase}?trackingNumber=***}`, {
      headers: { "DHL-API-Key": this.dhlKey, "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`DHL API error: ${res.status}`);
    return res.json();
  }

  /** ─── TOOLS ─── */

  async trackFedex(trackingNumber: string): Promise<{
    trackingNumber: string; carrier: string; status: string;
    origin: string; destination: string; estimatedDelivery: string;
    events: Array<{ date: string; location: string; description: string }>;
  }> {
    await this.logAction("track_fedex", "started", { trackingNumber });

    const data = await this.fedexReq("POST", "/track/v1/trackingnumbers", {
      includeDetailedScans: true,
      trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
    });

    const result = data.output?.completeTrackResults?.[0]?.trackResults?.[0] || {};
    const scanEvents = result.scanEvents || [];

    // Save to DB
    await this.createShipment({
      trackingNumber, carrier: "FedEx", origin: "", destination: "",
      status: result.latestStatusDetail?.code || "unknown",
    });

    await this.logAction("track_fedex", "completed", { trackingNumber });
    return {
      trackingNumber, carrier: "FedEx",
      status: result.latestStatusDetail?.description || "unknown",
      origin: `${scanEvents[scanEvents.length - 1]?.scanLocation?.city || ""}`,
      destination: `${scanEvents[0]?.scanLocation?.city || ""}`,
      estimatedDelivery: result.estimatedDeliveryTimeWindow?.window?.ends || "",
      events: scanEvents.map((e: any) => ({
        date: e.date || "",
        location: `${e.scanLocation?.city || ""}, ${e.scanLocation?.stateOrProvinceCode || ""}`,
        description: e.eventDescription || e.derivedStatus || "",
      })),
    };
  }

  async createFedexShipment(params: {
    fromName: string; fromPhone: string; fromAddress: string; fromCity: string; fromPincode: string; fromCountry: string;
    toName: string; toPhone: string; toAddress: string; toCity: string; toPincode: string; toCountry: string;
    weightKg: number;
    declaredValue?: number;
  }): Promise<{ trackingNumber: string; labelUrl: string; charges: number }> {
    await this.logAction("create_fedex_shipment", "started", params);

    const body = {
      requestedShipment: {
        shipper: {
          contact: { personName: params.fromName, phoneNumber: params.fromPhone },
          address: {
            streetLines: [params.fromAddress],
            city: params.fromCity, postalCode: params.fromPincode,
            countryCode: params.fromCountry || "IN",
          },
        },
        recipients: [{
          contact: { personName: params.toName, phoneNumber: params.toPhone },
          address: {
            streetLines: [params.toAddress],
            city: params.toCity, postalCode: params.toPincode,
            countryCode: params.toCountry || "US",
          },
        }],
        shipDatestamp: new Date().toISOString().slice(0, 10),
        serviceType: "INTERNATIONAL_PRIORITY",
        packagingType: "YOUR_PACKAGING",
        totalWeight: { units: "KG", value: params.weightKg },
        customsClearanceDetail: {
          commodities: [{
            description: "Merchandise",
            quantity: 1, quantityUnits: "PCS",
            customsValue: { currency: "USD", amount: params.declaredValue || params.weightKg * 10 },
            weight: { units: "KG", value: params.weightKg },
          }],
        },
        shippingChargesPayment: { paymentType: "SENDER" },
        labelSpecification: { labelFormatType: "COMMON2D", imageType: "PDF", labelStockType: "PAPER_4X6" },
      },
      accountNumber: { value: this.fedexAccount },
    };

    const data = await this.fedexReq("POST", "/ship/v1/shipments", body);
    const result = data.output?.transactionShipments?.[0] || {};

    const trackingNumber = result.masterTrackingNumber || result.pieceResponses?.[0]?.trackingNumber || crypto.randomUUID().slice(0, 12);

    await this.createShipment({
      trackingNumber, carrier: "FedEx", origin: `${params.fromCity}, ${params.fromCountry}`,
      destination: `${params.toCity}, ${params.toCountry}`,
      customerName: params.toName, customerPhone: params.toPhone, status: "created",
    });

    await this.logAction("create_fedex_shipment", "completed", { trackingNumber });
    return {
      trackingNumber,
      labelUrl: result.pieceResponses?.[0]?.packageDocuments?.[0]?.url || "",
      charges: result.shipmentRating?.totalNetCharge || 0,
    };
  }

  async trackDhl(trackingNumber: string): Promise<{
    trackingNumber: string; carrier: string; status: string;
    origin: string; destination: string; estimatedDelivery: string;
    events: Array<{ date: string; location: string; description: string }>;
  }> {
    await this.logAction("track_dhl", "started", { trackingNumber });

    const data = await this.dhlReq(trackingNumber);
    const shipment = data.shipments?.[0] || {};
    const events = shipment.events || [];

    await this.createShipment({
      trackingNumber, carrier: "DHL", origin: shipment.origin?.address?.addressLocality || "",
      destination: shipment.destination?.address?.addressLocality || "",
      status: shipment.status?.status || "unknown",
    });

    await this.logAction("track_dhl", "completed", { trackingNumber });
    return {
      trackingNumber, carrier: "DHL",
      status: shipment.status?.statusCode || shipment.status?.status || "unknown",
      origin: shipment.origin?.address?.addressLocality || "",
      destination: shipment.destination?.address?.addressLocality || "",
      estimatedDelivery: shipment.estimatedTimeOfDelivery || "",
      events: events.map((e: any) => ({
        date: e.timestamp || "",
        location: e.location?.address?.addressLocality || "",
        description: e.description || e.status || "",
      })),
    };
  }

  async createDhlShipment(params: {
    fromName: string; fromAddress: string; fromCity: string; fromPincode: string;
    toName: string; toAddress: string; toCity: string; toPincode: string;
    weightKg: number; toCountry: string;
  }): Promise<{ trackingNumber: string; labelUrl: string }> {
    await this.logAction("create_dhl_shipment", "started", params);

    // DHL Express Shipment API
    const body = {
      plannedShippingDateAndTime: new Date().toISOString(),
      pickup: { isRequested: true },
      productCode: "P",
      accounts: [{ typeCode: "shipper", number: this.dhlAccount }],
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: params.fromPincode, cityName: params.fromCity,
            countryCode: "IN", addressLine1: params.fromAddress,
          },
          contactInformation: { fullName: params.fromName, companyName: "Lanework Logistics" },
        },
        receiverDetails: {
          postalAddress: {
            postalCode: params.toPincode, cityName: params.toCity,
            countryCode: params.toCountry || "US", addressLine1: params.toAddress,
          },
          contactInformation: { fullName: params.toName },
        },
      },
      content: {
        packages: [{
          weight: params.weightKg,
          dimensions: { length: 30, width: 20, height: 10 },
        }],
        isCustomsDeclarable: params.toCountry !== "IN",
        description: "Merchandise", incoterm: "DAP",
      },
    };

    const res = await fetch("https://express.api.dhl.com/mydhlapi/shipments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DHL-API-Key": this.dhlKey,
        "Authorization": `Basic ${Buffer.from(`${this.dhlKey}:${this.dhlAccount}`).toString("base64")}`,
      },
      body: JSON.stringify(body),
    });
    const data: any = await res.json();

    const trackingNumber = data.shipmentTrackingNumber || crypto.randomUUID().slice(0, 12);
    await this.createShipment({
      trackingNumber, carrier: "DHL", origin: `${params.fromCity}, IN`,
      destination: `${params.toCity}, ${params.toCountry || "US"}`,
      customerName: params.toName, status: "created",
    });

    await this.logAction("create_dhl_shipment", "completed", { trackingNumber });
    return { trackingNumber, labelUrl: data.documents?.[0]?.url || "" };
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new FedexMCP();
const server = new Server({ name: "lanework-fedex-dhl", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "track_fedex", description: "Track FedEx international shipment", inputSchema: { type: "object", properties: { trackingNumber: { type: "string" } }, required: ["trackingNumber"] } },
    { name: "create_fedex_shipment", description: "Create FedEx international shipment with label", inputSchema: { type: "object", properties: { fromName: { type: "string" }, fromPhone: { type: "string" }, fromAddress: { type: "string" }, fromCity: { type: "string" }, fromPincode: { type: "string" }, fromCountry: { type: "string" }, toName: { type: "string" }, toPhone: { type: "string" }, toAddress: { type: "string" }, toCity: { type: "string" }, toPincode: { type: "string" }, toCountry: { type: "string" }, weightKg: { type: "number" }, declaredValue: { type: "number" } }, required: ["fromName", "fromPhone", "fromAddress", "fromCity", "fromPincode", "fromCountry", "toName", "toPhone", "toAddress", "toCity", "toPincode", "toCountry", "weightKg"] } },
    { name: "track_dhl", description: "Track DHL Express international shipment", inputSchema: { type: "object", properties: { trackingNumber: { type: "string" } }, required: ["trackingNumber"] } },
    { name: "create_dhl_shipment", description: "Create DHL Express shipment", inputSchema: { type: "object", properties: { fromName: { type: "string" }, fromAddress: { type: "string" }, fromCity: { type: "string" }, fromPincode: { type: "string" }, toName: { type: "string" }, toAddress: { type: "string" }, toCity: { type: "string" }, toPincode: { type: "string" }, weightKg: { type: "number" }, toCountry: { type: "string" } }, required: ["fromName", "fromAddress", "fromCity", "fromPincode", "toName", "toAddress", "toCity", "toPincode", "weightKg", "toCountry"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "track_fedex": return { content: [{ type: "text", text: JSON.stringify(await mcp.trackFedex(args.trackingNumber as string), null, 2) }] };
      case "create_fedex_shipment": return { content: [{ type: "text", text: JSON.stringify(await mcp.createFedexShipment(args as any), null, 2) }] };
      case "track_dhl": return { content: [{ type: "text", text: JSON.stringify(await mcp.trackDhl(args.trackingNumber as string), null, 2) }] };
      case "create_dhl_shipment": return { content: [{ type: "text", text: JSON.stringify(await mcp.createDhlShipment(args as any), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[FedexDHLMCPS] Ready — 4 tools available");
