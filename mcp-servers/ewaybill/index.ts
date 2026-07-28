/**
 * E-Way Bill (GSTN) MCP Server
 * Auto-generate e-way bills from shipment data — GST compliance automated
 *
 * Tools:
 * - generate_ewaybill: Create e-way bill from shipment details
 * - cancel_ewaybill: Cancel an e-way bill
 * - get_ewaybill: Fetch e-way bill details
 * - validate_gstin: Validate a GSTIN number
 *
 * ENV: GSTN_API_KEY, GSTN_USERNAME, GSTN_PASSWORD, GSTN_BASE_URL
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class EwayBillMCP extends LaneworkMCPServer {
  private apiKey: string = "";
  private username: string = "";
  private password: string = "";
  private baseUrl: string = "";
  private authToken: string = "";
  private tokenExpiry: number = 0;

  constructor() { super("shipment-tracking"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.apiKey = this.getEnv("GSTN_API_KEY");
    this.username = this.getEnv("GSTN_USERNAME");
    this.password = this.getEnv("GSTN_PASSWORD");
    this.baseUrl = process.env.GSTN_BASE_URL || this.config.GSTN_BASE_URL || "https://api.mastergst.com/ewaybillapi/v1.03";
  }

  private async auth(): Promise<string> {
    if (this.authToken && Date.now() < this.tokenExpiry) return this.authToken;
    const res = await fetch(`${this.baseUrl}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": this.apiKey },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });
    if (!res.ok) throw new Error(`GSTN auth failed: ${res.status}`);
    const data: any = await res.json();
    this.authToken = data.data?.token || data.token;
    this.tokenExpiry = Date.now() + 5 * 60 * 60 * 1000;
    return this.authToken;
  }

  private async gstnReq(method: string, path: string, body?: any): Promise<any> {
    const token = await this.auth();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-api-key": this.apiKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`GSTN API error: ${res.status} — ${JSON.stringify(json)}`);
    return json;
  }

  /** ─── TOOLS ─── */

  async generateEwaybill(data: {
    shipmentId: string;
    fromGstin: string;
    toGstin: string;
    fromPincode: string;
    toPincode: string;
    invoiceNo: string;
    invoiceValue: number;
    hsnCode: string;
    productName: string;
    quantity: number;
    vehicleNo?: string;
    transporterId?: string;
    transDocNo?: string;
    transDocDate?: string;
  }): Promise<{
    ewbNo: string;
    ewbDate: string;
    validUntil: string;
    qrUrl: string;
    status: string;
  }> {
    await this.logAction("generate_ewaybill", "started", data);

    const payload = {
      transactionType: 1, // outward supply
      userGstin: data.fromGstin,
      supplyType: "O",
      subSupplyType: 1,
      docType: "INV",
      docNo: data.invoiceNo,
      docDate: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
      fromGstin: data.fromGstin,
      fromPincode: data.fromPincode,
      fromStateCode: parseInt(data.fromPincode.slice(0, 2)) || 29,
      actFromStateCode: parseInt(data.fromPincode.slice(0, 2)) || 29,
      toGstin: data.toGstin,
      toPincode: data.toPincode,
      toStateCode: parseInt(data.toPincode.slice(0, 2)) || 29,
      actToStateCode: parseInt(data.toPincode.slice(0, 2)) || 29,
      totalValue: data.invoiceValue,
      cgstValue: data.invoiceValue * 0.09,
      sgstValue: data.invoiceValue * 0.09,
      igstValue: 0,
      cessValue: 0,
      itemList: [{
        itemNo: 1,
        productName: data.productName,
        productDesc: data.productName,
        hsnCode: data.hsnCode,
        qtyUnit: "NOS",
        quantity: data.quantity,
        taxableAmount: data.invoiceValue,
        sgstRate: 9, cgstRate: 9, igstRate: 0, cessRate: 0,
      }],
      transporterId: data.transporterId || "",
      transporterDocNo: data.transDocNo || "",
      transporterDocDate: data.transDocDate || "",
      vehicleNo: data.vehicleNo || "",
      transactionDistance: Math.abs(parseInt(data.toPincode) - parseInt(data.fromPincode)) % 1000 || 100,
    };

    const result = await this.gstnReq("POST", "/ewaybill", payload);
    const ewb = result.data || result;

    // Store in DB
    await this.sql`
      INSERT INTO eway_bills (id, ewb_no, shipment_id, from_gstin, to_gstin, invoice_no, invoice_value, status, valid_until, created_at)
      VALUES (${crypto.randomUUID()}, ${ewb.ewayBillNo || ewb.ewbNo}, ${data.shipmentId}, ${data.fromGstin}, ${data.toGstin},
        ${data.invoiceNo}, ${data.invoiceValue}, 'active', ${ewb.validUpto || ewb.validUntil}, NOW())
    `;

    await this.logAction("generate_ewaybill", "completed", { ewbNo: ewb.ewayBillNo });
    return {
      ewbNo: ewb.ewayBillNo || ewb.ewbNo,
      ewbDate: ewb.ewayBillDate || new Date().toISOString(),
      validUntil: ewb.validUpto || ewb.validUntil,
      qrUrl: ewb.qrCodeUrl || ewb.qrUrl || "",
      status: "active",
    };
  }

  async cancelEwaybill(ewbNo: string, reason: string = "Order cancelled"): Promise<{ success: boolean; message: string }> {
    try {
      await this.gstnReq("POST", "/ewaybill/cancel", { ewbNo, cancelReason: reason });
      await this.sql`UPDATE eway_bills SET status = 'cancelled', updated_at = NOW() WHERE ewb_no = ${ewbNo}`;
      await this.logAction("cancel_ewaybill", "completed", { ewbNo });
      return { success: true, message: `E-way bill ${ewbNo} cancelled` };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getEwaybill(ewbNo: string): Promise<any> {
    const result = await this.gstnReq("GET", `/ewaybill/${ewbNo}`);
    return result.data || result;
  }

  async validateGstin(gstin: string): Promise<{ gstin: string; valid: boolean; legalName: string; stateCode: string; registrationDate: string }> {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const valid = gstinRegex.test(gstin.toUpperCase());

    let legalName = "";
    let stateCode = "";
    let registrationDate = "";

    if (valid) {
      try {
        const result = await this.gstnReq("GET", `/gstin/${gstin.toUpperCase()}`);
        const d = result.data || result;
        legalName = d.legalName || d.tradeName || "";
        stateCode = d.stateCode || gstin.slice(0, 2);
        registrationDate = d.regDate || d.registrationDate || "";
      } catch {
        // Regex validation passed but API failed — still report as valid with partial data
        stateCode = gstin.slice(0, 2);
      }
    }

    return { gstin: gstin.toUpperCase(), valid, legalName, stateCode, registrationDate };
  }
}

// ─── MCP Entry Point ───
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new EwayBillMCP();
const server = new Server({ name: "lanework-ewaybill", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "generate_ewaybill", description: "Generate e-way bill from shipment details", inputSchema: { type: "object", properties: { shipmentId: { type: "string" }, fromGstin: { type: "string" }, toGstin: { type: "string" }, fromPincode: { type: "string" }, toPincode: { type: "string" }, invoiceNo: { type: "string" }, invoiceValue: { type: "number" }, hsnCode: { type: "string" }, productName: { type: "string" }, quantity: { type: "number" }, vehicleNo: { type: "string" }, transporterId: { type: "string" } }, required: ["shipmentId", "fromGstin", "toGstin", "fromPincode", "toPincode", "invoiceNo", "invoiceValue", "hsnCode", "productName", "quantity"] } },
    { name: "cancel_ewaybill", description: "Cancel an e-way bill", inputSchema: { type: "object", properties: { ewbNo: { type: "string" }, reason: { type: "string" } }, required: ["ewbNo"] } },
    { name: "get_ewaybill", description: "Fetch e-way bill details by number", inputSchema: { type: "object", properties: { ewbNo: { type: "string" } }, required: ["ewbNo"] } },
    { name: "validate_gstin", description: "Validate a GSTIN number", inputSchema: { type: "object", properties: { gstin: { type: "string" } }, required: ["gstin"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "generate_ewaybill": return { content: [{ type: "text", text: JSON.stringify(await mcp.generateEwaybill(args as any), null, 2) }] };
      case "cancel_ewaybill": return { content: [{ type: "text", text: JSON.stringify(await mcp.cancelEwaybill(args.ewbNo as string, (args.reason as string) || ""), null, 2) }] };
      case "get_ewaybill": return { content: [{ type: "text", text: JSON.stringify(await mcp.getEwaybill(args.ewbNo as string), null, 2) }] };
      case "validate_gstin": return { content: [{ type: "text", text: JSON.stringify(await mcp.validateGstin(args.gstin as string), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[EwayBillMCP] Ready — 4 tools available");
