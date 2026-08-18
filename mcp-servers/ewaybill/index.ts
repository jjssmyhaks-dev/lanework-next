// @ts-nocheck — MCP SDK types resolved at build time in project context
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
 * Graceful fallback: when GSTN_API_KEY missing, generates valid-but-unsubmitted
 * e-way bill data stored in eway_bills DB table. Each result includes
 * `mode: "live" | "simulated" | "db-fallback"`.
 *
 * ENV: GSTN_API_KEY, GSTN_USERNAME, GSTN_PASSWORD, GSTN_BASE_URL
 */

// @ts-nocheck � MCP SDK types resolved at build time
import { LaneworkMCPServer, isDirectRun } from "../shared/server.ts";
import crypto from "crypto";

export class EwayBillMCP extends LaneworkMCPServer {
  private apiKey: string = "";
  private username: string = "";
  private password: string = "";
  private baseUrl: string = "";
  private authToken: string = "";
  private tokenExpiry: number = 0;
  private hasCredentials: boolean = false;

  constructor() { super("shipment-tracking"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.apiKey = this.getEnv("GSTN_API_KEY");
    this.username = this.getEnv("GSTN_USERNAME");
    this.password = this.getEnv("GSTN_PASSWORD");
    this.baseUrl = process.env.GSTN_BASE_URL || this.config.GSTN_BASE_URL || "https://api.mastergst.com/ewaybillapi/v1.03";
    this.hasCredentials = this.hasEnv("GSTN_API_KEY", "GSTN_USERNAME", "GSTN_PASSWORD");
  }

  private async auth(): Promise<string> {
    if (!this.hasCredentials) return "";
    if (this.authToken && Date.now() < this.tokenExpiry) return this.authToken;

    const result = await this.safeApiCall<any>(
      "GSTN Auth",
      `${this.baseUrl}/authenticate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": this.apiKey },
        body: JSON.stringify({ username: this.username, password: this.password }),
      },
      null,
    );

    if (result.ok && (result.data?.data?.token || result.data?.token)) {
      this.authToken = result.data.data?.token || result.data.token;
      this.tokenExpiry = Date.now() + 5 * 60 * 60 * 1000;
      return this.authToken;
    }

    console.error(`[EwayBillMCP] Auth failed: ${result.message}`);
    return "";
  }

  private async gstnReq(method: string, path: string, body?: any): Promise<any> {
    if (!this.hasCredentials) return null;

    const token = await this.auth();
    if (!token) return null;

    const result = await this.safeApiCall<any>(
      `GSTN ${method} ${path}`,
      `${this.baseUrl}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-api-key": this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      null,
    );

    return result.data;
  }

  /** ─── TOOLS ───
   *  Each returns { mode: "live" | "simulated" | "db-fallback", ... } */

  async generateEwaybill(data: {
    shipmentId: string; fromGstin: string; toGstin: string;
    fromPincode: string; toPincode: string; invoiceNo: string;
    invoiceValue: number; hsnCode: string; productName: string; quantity: number;
    vehicleNo?: string; transporterId?: string; transDocNo?: string; transDocDate?: string;
  }): Promise<{
    mode: string; ewbNo: string; ewbDate: string; validUntil: string;
    qrUrl: string; status: string; message?: string;
  }> {
    await this.logAction("generate_ewaybill", "started", data);

    if (!this.hasCredentials) {
      // Generate locally — valid data, just not submitted to GSTN
      const generatedEwbNo = `EWB-LOCAL-${data.invoiceNo}-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date();
      const validUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

      // Store in DB so it can be submitted later
      const id = crypto.randomUUID();
      try {
        await this.sql`
          INSERT INTO eway_bills (id, ewb_no, shipment_id, from_gstin, to_gstin, invoice_no,
            invoice_value, status, valid_until, created_at)
          VALUES (${id}, ${generatedEwbNo}, ${data.shipmentId}, ${data.fromGstin}, ${data.toGstin},
            ${data.invoiceNo}, ${data.invoiceValue}, 'generated_local', ${validUntil}, NOW())
        `;
      } catch { /* DB insert best-effort */ }

      await this.logAction("generate_ewaybill", "completed", { ewbNo: generatedEwbNo, source: "simulated" });
      return {
        mode: "simulated",
        ewbNo: generatedEwbNo,
        ewbDate: now.toISOString(),
        validUntil,
        qrUrl: "",
        status: "generated_local",
        message: "⚠️ E-Way Bill generated locally but NOT submitted to GSTN. Configure GSTN_API_KEY, GSTN_USERNAME, and GSTN_PASSWORD in Vercel env vars to submit. Stored locally — submit when credentials are configured.",
      };
    }

    const payload = {
      transactionType: 1,
      userGstin: data.fromGstin, supplyType: "O", subSupplyType: 1,
      docType: "INV", docNo: data.invoiceNo,
      docDate: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
      fromGstin: data.fromGstin, fromPincode: data.fromPincode,
      fromStateCode: parseInt(data.fromPincode.slice(0, 2)) || 29,
      actFromStateCode: parseInt(data.fromPincode.slice(0, 2)) || 29,
      toGstin: data.toGstin, toPincode: data.toPincode,
      toStateCode: parseInt(data.toPincode.slice(0, 2)) || 29,
      actToStateCode: parseInt(data.toPincode.slice(0, 2)) || 29,
      totalValue: data.invoiceValue,
      cgstValue: data.invoiceValue * 0.09, sgstValue: data.invoiceValue * 0.09,
      igstValue: 0, cessValue: 0,
      itemList: [{
        itemNo: 1, productName: data.productName, productDesc: data.productName,
        hsnCode: data.hsnCode, qtyUnit: "NOS", quantity: data.quantity,
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

    if (!result) {
      // API failed — generate locally as fallback
      const generatedEwbNo = `EWB-FALLBACK-${data.invoiceNo}-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date();
      const validUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

      try {
        await this.sql`
          INSERT INTO eway_bills (id, ewb_no, shipment_id, from_gstin, to_gstin, invoice_no,
            invoice_value, status, valid_until, created_at)
          VALUES (${crypto.randomUUID()}, ${generatedEwbNo}, ${data.shipmentId}, ${data.fromGstin},
            ${data.toGstin}, ${data.invoiceNo}, ${data.invoiceValue}, 'api_failed_local', ${validUntil}, NOW())
        `;
      } catch { /* DB insert best-effort */ }

      await this.logAction("generate_ewaybill", "completed", { ewbNo: generatedEwbNo, source: "simulated" });
      return {
        mode: "simulated",
        ewbNo: generatedEwbNo,
        ewbDate: now.toISOString(),
        validUntil,
        qrUrl: "",
        status: "api_failed_local",
        message: "⚠️ GSTN API unavailable. E-Way bill data generated locally and saved to DB. Will need to be submitted when API is reachable.",
      };
    }

    const ewb = result.data || result;

    // Store in DB
    try {
      await this.sql`
        INSERT INTO eway_bills (id, ewb_no, shipment_id, from_gstin, to_gstin, invoice_no,
          invoice_value, status, valid_until, created_at)
        VALUES (${crypto.randomUUID()}, ${ewb.ewayBillNo || ewb.ewbNo}, ${data.shipmentId},
          ${data.fromGstin}, ${data.toGstin}, ${data.invoiceNo}, ${data.invoiceValue},
          'active', ${ewb.validUpto || ewb.validUntil}, NOW())
      `;
    } catch { /* DB insert best-effort */ }

    await this.logAction("generate_ewaybill", "completed", { ewbNo: ewb.ewayBillNo });
    return {
      mode: "live",
      ewbNo: ewb.ewayBillNo || ewb.ewbNo,
      ewbDate: ewb.ewayBillDate || new Date().toISOString(),
      validUntil: ewb.validUpto || ewb.validUntil,
      qrUrl: ewb.qrCodeUrl || ewb.qrUrl || "",
      status: "active",
    };
  }

  async cancelEwaybill(ewbNo: string, reason: string = "Order cancelled"): Promise<{
    mode: string; success: boolean; message: string;
  }> {
    if (!this.hasCredentials) {
      // Update local DB
      try {
        await this.sql`UPDATE eway_bills SET status = 'cancelled', updated_at = NOW() WHERE ewb_no = ${ewbNo}`;
      } catch { /* DB update best-effort */ }
      await this.logAction("cancel_ewaybill", "completed", { ewbNo, source: "db-fallback" });
      return {
        mode: "db-fallback",
        success: true,
        message: `E-way bill ${ewbNo} cancelled in local DB. Configure GSTN_API_KEY to cancel on GSTN portal.`,
      };
    }

    const result = await this.gstnReq("POST", "/ewaybill/cancel", { ewbNo, cancelReason: reason });

    if (!result) {
      // API failed — update DB anyway
      try {
        await this.sql`UPDATE eway_bills SET status = 'cancelled', updated_at = NOW() WHERE ewb_no = ${ewbNo}`;
      } catch { /* DB update best-effort */ }
      return {
        mode: "simulated",
        success: true,
        message: `E-way bill ${ewbNo} cancelled in local DB. GSTN API unavailable — may not be cancelled on portal.`,
      };
    }

    try {
      await this.sql`UPDATE eway_bills SET status = 'cancelled', updated_at = NOW() WHERE ewb_no = ${ewbNo}`;
    } catch { /* DB update best-effort */ }

    await this.logAction("cancel_ewaybill", "completed", { ewbNo });
    return { mode: "live", success: true, message: `E-way bill ${ewbNo} cancelled` };
  }

  async getEwaybill(ewbNo: string): Promise<{
    mode: string; data: any; message?: string;
  }> {
    if (!this.hasCredentials) {
      // Try DB first
      try {
        const rows: any[] = await this.sql`SELECT * FROM eway_bills WHERE ewb_no = ${ewbNo} LIMIT 1`;
        if (rows.length > 0) {
          const r = rows[0];
          return {
            mode: "db-fallback",
            data: {
              ewbNo: r.ewb_no, fromGstin: r.from_gstin, toGstin: r.to_gstin,
              invoiceNo: r.invoice_no, invoiceValue: r.invoice_value,
              status: r.status, validUntil: r.valid_until,
              createdAt: r.created_at,
            },
          };
        }
      } catch { /* DB may not exist */ }

      return {
        mode: "simulated",
        data: null,
        message: "⚠️ GSTN credentials not configured. Set GSTN_API_KEY to fetch live e-way bill data.",
      };
    }

    const result = await this.gstnReq("GET", `/ewaybill/${ewbNo}`);

    if (!result) {
      // Try DB fallback
      try {
        const rows: any[] = await this.sql`SELECT * FROM eway_bills WHERE ewb_no = ${ewbNo} LIMIT 1`;
        if (rows.length > 0) {
          const r = rows[0];
          return {
            mode: "db-fallback",
            data: {
              ewbNo: r.ewb_no, fromGstin: r.from_gstin, toGstin: r.to_gstin,
              invoiceNo: r.invoice_no, invoiceValue: r.invoice_value,
              status: r.status, validUntil: r.valid_until,
              createdAt: r.created_at,
            },
          };
        }
      } catch { /* DB fallback best-effort */ }

      return { mode: "simulated", data: null, message: "⚠️ GSTN API unavailable and no local data found." };
    }

    return { mode: "live", data: result.data || result };
  }

  async validateGstin(gstin: string): Promise<{
    mode: string; gstin: string; valid: boolean; legalName: string;
    stateCode: string; registrationDate: string; message?: string;
  }> {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const isValid = gstinRegex.test(gstin.toUpperCase());

    if (!isValid) {
      return {
        mode: "live",
        gstin: gstin.toUpperCase(),
        valid: false,
        legalName: "", stateCode: "", registrationDate: "",
      };
    }

    // Even without API credentials, we can return regex-based validation
    const stateCode = gstin.slice(0, 2);

    if (!this.hasCredentials) {
      return {
        mode: "simulated",
        gstin: gstin.toUpperCase(),
        valid: true,
        legalName: "",
        stateCode,
        registrationDate: "",
        message: "⚠️ GSTN API not configured. Format validation passed (regex). Set GSTN_API_KEY for full GSTIN verification.",
      };
    }

    const result = await this.gstnReq("GET", `/gstin/${gstin.toUpperCase()}`);

    if (!result) {
      return {
        mode: "simulated",
        gstin: gstin.toUpperCase(),
        valid: true,
        legalName: "",
        stateCode,
        registrationDate: "",
        message: "⚠️ GSTN API unavailable. Format validation passed. Full verification unavailable.",
      };
    }

    const d = result.data || result;
    return {
      mode: "live",
      gstin: gstin.toUpperCase(),
      valid: true,
      legalName: d.legalName || d.tradeName || "",
      stateCode: d.stateCode || stateCode,
      registrationDate: d.regDate || d.registrationDate || "",
    };
  }
}

// ─── MCP Entry Point ───
async function main(): Promise<void> {
const SDK = "@modelcontextprotocol/sdk";
  const { Server } = await import(`${SDK}/server/index.js`);
  const { StdioServerTransport } = await import(`${SDK}/server/stdio.js`);
  const { CallToolRequestSchema, ListToolsRequestSchema } = await import(`${SDK}/types.js`);
  
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
  
}

// Run only when executed directly (tsx index.ts), not when imported by the app.
if (isDirectRun(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
