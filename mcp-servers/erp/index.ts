/**
 * ERP / SAP B1 MCP Server
 * Full ERP integration for mid-market / larger MSMEs running SAP Business One
 *
 * Tools:
 * - sync_orders: Pull orders from SAP → push to Lanework shipments
 * - push_inventory: Push Lanework inventory levels to SAP
 * - get_business_partner: Fetch customer/vendor details from SAP
 * - sync_invoices: Pull invoices from SAP → create e-way bills
 *
 * ENV: SAP_SERVICE_LAYER_URL, SAP_USERNAME, SAP_PASSWORD, SAP_COMPANY_DB
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class ErpMCP extends LaneworkMCPServer {
  private serviceLayerUrl: string = "";
  private username: string = "";
  private password: string = "";
  private companyDb: string = "";
  private sessionId: string = "";
  private sessionExpiry: number = 0;

  constructor() { super("customer-communication"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.serviceLayerUrl = this.getEnv("SAP_SERVICE_LAYER_URL", "");
    this.username = this.getEnv("SAP_USERNAME", "");
    this.password = this.getEnv("SAP_PASSWORD", "");
    this.companyDb = process.env.SAP_COMPANY_DB || this.config.SAP_COMPANY_DB || "SBODemoIN";
  }

  private async sapLogin(): Promise<string> {
    if (this.sessionId && Date.now() < this.sessionExpiry) return this.sessionId;

    const res = await fetch(`${this.serviceLayerUrl}/Login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        UserName: this.username,
        Password: this.password,
        CompanyDB: this.companyDb,
      }),
    });

    if (!res.ok) throw new Error(`SAP login failed: ${res.status}`);
    this.sessionId = res.headers.get("set-cookie")?.match(/B1SESSION=([^;]+)/)?.[1] || "";
    this.sessionExpiry = Date.now() + 20 * 60 * 1000;
    return this.sessionId;
  }

  private async sapReq(method: string, path: string, body?: any, params?: Record<string, string>): Promise<any> {
    await this.sapLogin();
    const url = new URL(`${this.serviceLayerUrl}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: `B1SESSION=${this.sessionId}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new Error(`SAP API error: ${res.status} — ${await res.text()}`);
    return res.json();
  }

  /** ─── TOOLS ─── */

  async syncOrders(dateFrom?: string): Promise<{
    synced: number;
    orders: Array<{ orderNumber: string; customerName: string; items: Array<{ sku: string; name: string; qty: number }>; total: number }>;
  }> {
    await this.logAction("sync_orders", "started", { dateFrom });

    const from = dateFrom || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const data = await this.sapReq("GET", "/Orders", undefined, {
      "$filter": `DocDate ge '${from}'`,
      "$select": "DocEntry,DocNum,CardCode,CardName,DocTotal,DocDate",
    });

    const orders = (data.value || []) as any[];
    const syncedOrders: Array<any> = [];

    for (const order of orders) {
      // Fetch order lines
      const lines = await this.sapReq("GET", `/Orders(${order.DocEntry})`, undefined, {
        "$expand": "DocumentLines",
      });

      const items = ((lines.DocumentLines || []) as any[]).map((line: any) => ({
        sku: line.ItemCode || line.U_sku || "",
        name: line.ItemDescription || "",
        qty: line.Quantity || 1,
      }));

      const total = order.DocTotal || 0;

      // Sync to Lanework DB
      await this.sql`
        INSERT INTO orders (id, order_number, customer_name, status, total_amount, items, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${order.DocNum?.toString() || ""}, ${order.CardName || ""},
          'synced_from_sap', ${total}, ${JSON.stringify(items)}, NOW(), NOW())
        ON CONFLICT (order_number) DO UPDATE SET total_amount = ${total}, items = ${JSON.stringify(items)}, updated_at = NOW()
      `;

      // Also upsert customer
      await this.sql`
        INSERT INTO customers (id, name, code, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${order.CardName || ""}, ${order.CardCode || ""}, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET name = ${order.CardName || ""}, updated_at = NOW()
      `;

      syncedOrders.push({
        orderNumber: order.DocNum?.toString() || "",
        customerName: order.CardName || "",
        items,
        total,
      });
    }

    await this.logAction("sync_orders", "completed", { synced: syncedOrders.length });
    return { synced: syncedOrders.length, orders: syncedOrders };
  }

  async pushInventory(): Promise<{ synced: number }> {
    await this.logAction("push_inventory", "started", {});

    const items = await this.sql`SELECT * FROM inventory WHERE quantity IS NOT NULL`;
    let synced = 0;

    for (const item of items) {
      try {
        // Check if item exists in SAP
        const existing = await this.sapReq("GET", "/Items", undefined, {
          "$filter": `ItemCode eq '${item.sku}'`,
        });

        if (existing.value?.length > 0) {
          // Update stock via Goods Receipt or Inventory Counting
          await this.sapReq("PATCH", `/Items('${item.sku}')`, {
            QuantityOnStock: item.quantity || 0,
            InventoryUOM: item.unit || "pcs",
          });
        }

        // Log the sync event
        await this.sql`
          INSERT INTO inventory_movements (id, sku, type, quantity, warehouse_id, created_at)
          VALUES (${crypto.randomUUID()}, ${item.sku}, 'erp_sync', ${item.quantity || 0}, 'SAP', NOW())
        `;

        synced++;
      } catch (e: any) {
        console.error(`[SAP] Failed to sync SKU ${item.sku}:`, e.message);
      }
    }

    await this.logAction("push_inventory", "completed", { synced });
    return { synced };
  }

  async getBusinessPartner(cardCode: string): Promise<{
    code: string; name: string; type: string; phone: string; email: string;
    address: string; city: string; state: string; gstin: string; balance: number;
  }> {
    const data = await this.sapReq("GET", `/BusinessPartners('${cardCode}')`);
    const bp = data;

    return {
      code: bp.CardCode || cardCode,
      name: bp.CardName || "",
      type: bp.CardType === "cCustomer" ? "customer" : bp.CardType === "cSupplier" ? "supplier" : "lead",
      phone: bp.Phone1 || bp.Cellular || "",
      email: bp.EmailAddress || "",
      address: `${bp.BillToStreet || bp.Address || ""}, ${bp.BillToBlock || ""}`,
      city: bp.BillToCity || bp.City || "",
      state: bp.BillToState || "",
      gstin: bp.FederalTaxID || bp.U_GSTIN || "",
      balance: bp.Balance || bp.CurrentAccountBalance || 0,
    };
  }

  async syncInvoices(dateFrom?: string): Promise<{
    synced: number;
    invoices: Array<{ invoiceNo: string; customerName: string; total: number; date: string }>;
  }> {
    await this.logAction("sync_invoices", "started", { dateFrom });

    const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const data = await this.sapReq("GET", "/Invoices", undefined, {
      "$filter": `DocDate ge '${from}'`,
      "$select": "DocEntry,DocNum,CardName,DocTotal,DocDate",
    });

    const invoices = (data.value || []) as any[];
    const syncedInvoices: Array<any> = [];

    for (const inv of invoices) {
      syncedInvoices.push({
        invoiceNo: inv.DocNum?.toString() || "",
        customerName: inv.CardName || "",
        total: inv.DocTotal || 0,
        date: inv.DocDate || "",
      });

      // Store invoice in DB
      await this.sql`
        INSERT INTO invoices (id, invoice_number, customer_name, total_amount, invoice_date, source, created_at)
        VALUES (${crypto.randomUUID()}, ${inv.DocNum?.toString() || ""}, ${inv.CardName || ""},
          ${inv.DocTotal || 0}, ${inv.DocDate || from}, 'sap', NOW())
        ON CONFLICT (invoice_number) DO NOTHING
      `;
    }

    await this.logAction("sync_invoices", "completed", { synced: syncedInvoices.length });
    return { synced: syncedInvoices.length, invoices: syncedInvoices };
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new ErpMCP();
const server = new Server({ name: "lanework-erp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "sync_orders", description: "Pull orders from SAP B1 to Lanework shipments", inputSchema: { type: "object", properties: { dateFrom: { type: "string" } }, required: [] } },
    { name: "push_inventory", description: "Push Lanework inventory levels to SAP B1", inputSchema: { type: "object", properties: {}, required: [] } },
    { name: "get_business_partner", description: "Fetch customer/vendor details from SAP", inputSchema: { type: "object", properties: { cardCode: { type: "string" } }, required: ["cardCode"] } },
    { name: "sync_invoices", description: "Pull invoices from SAP to create e-way bills", inputSchema: { type: "object", properties: { dateFrom: { type: "string" } }, required: [] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "sync_orders": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncOrders(args.dateFrom as string), null, 2) }] };
      case "push_inventory": return { content: [{ type: "text", text: JSON.stringify(await mcp.pushInventory(), null, 2) }] };
      case "get_business_partner": return { content: [{ type: "text", text: JSON.stringify(await mcp.getBusinessPartner(args.cardCode as string), null, 2) }] };
      case "sync_invoices": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncInvoices(args.dateFrom as string), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[ErpMCP] Ready — 4 tools available");
