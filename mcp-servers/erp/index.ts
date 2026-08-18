// @ts-nocheck — MCP SDK types resolved at build time in project context
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

import { LaneworkMCPServer, isDirectRun } from "../shared/server.ts";
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

  private sapConfigured(): boolean {
    return !!(this.serviceLayerUrl && this.username && this.password);
  }

  private async sapLogin(): Promise<string | null> {
    if (!this.sapConfigured()) return null;
    if (this.sessionId && Date.now() < this.sessionExpiry) return this.sessionId;

    const loginResult = await this.safeApiCall<any>(
      "SAP Login",
      `${this.serviceLayerUrl}/Login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UserName: this.username,
          Password: this.password,
          CompanyDB: this.companyDb,
        }),
      },
    );

    if (!loginResult.ok || !loginResult.data) return null;
    // Extract session from response — safeApiCall uses fetch, we need headers
    // Re-fetch to get headers since safeApiCall strips them
    try {
      const res = await fetch(`${this.serviceLayerUrl}/Login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ UserName: this.username, Password: this.password, CompanyDB: this.companyDb }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        this.sessionId = res.headers.get("set-cookie")?.match(/B1SESSION=([^;]+)/)?.[1] || "";
        this.sessionExpiry = Date.now() + 20 * 60 * 1000;
        return this.sessionId;
      }
    } catch { /* fall through */ }
    return null;
  }

  private async sapReq(method: string, path: string, body?: any, params?: Record<string, string>): Promise<{
    ok: boolean; data: any; status: "live" | "simulated" | "error"; message: string;
  }> {
    if (!this.sapConfigured()) {
      return { ok: false, data: null, status: "simulated", message: "SAP not configured — SAP_SERVICE_LAYER_URL missing" };
    }

    const sessionId = await this.sapLogin();
    if (!sessionId) {
      return { ok: false, data: null, status: "simulated", message: "SAP login failed — check credentials" };
    }

    const url = new URL(`${this.serviceLayerUrl}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    return this.safeApiCall("SAP API", url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: `B1SESSION=${sessionId}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /** ─── TOOLS ─── */

  async syncOrders(dateFrom?: string): Promise<{
    synced: number;
    orders: Array<{ orderNumber: string; customerName: string; items: Array<{ sku: string; name: string; qty: number }>; total: number }>;
    mode: "live" | "db-fallback";
  }> {
    await this.logAction("sync_orders", "started", { dateFrom });

    const from = dateFrom || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    if (!this.sapConfigured()) {
      // DB fallback: return orders from DB orders table
      const dbOrders = await this.sql`SELECT * FROM orders WHERE created_at >= ${from}::timestamp ORDER BY created_at DESC LIMIT 100`;
      const fallbackOrders: Array<any> = [];
      for (const o of dbOrders as any[]) {
        let items: Array<{ sku: string; name: string; qty: number }> = [];
        try { items = typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []); } catch {}
        fallbackOrders.push({
          orderNumber: o.order_number || "", customerName: o.customer_name || "",
          items, total: o.total_amount || 0,
        });
      }
      await this.logAction("sync_orders", "completed", { synced: fallbackOrders.length, source: "db-fallback" });
      return { synced: fallbackOrders.length, orders: fallbackOrders, mode: "db-fallback" };
    }

    const result = await this.sapReq("GET", "/Orders", undefined, {
      "$filter": `DocDate ge '${from}'`,
      "$select": "DocEntry,DocNum,CardCode,CardName,DocTotal,DocDate",
    });

    if (!result.ok || !result.data) {
      await this.logAction("sync_orders", "failed", { reason: result.message });
      // DB fallback
      const dbOrders = await this.sql`SELECT * FROM orders WHERE created_at >= ${from}::timestamp ORDER BY created_at DESC LIMIT 100`;
      const fallbackOrders: Array<any> = [];
      for (const o of dbOrders as any[]) {
        let items: Array<{ sku: string; name: string; qty: number }> = [];
        try { items = typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []); } catch {}
        fallbackOrders.push({
          orderNumber: o.order_number || "", customerName: o.customer_name || "",
          items, total: o.total_amount || 0,
        });
      }
      return { synced: fallbackOrders.length, orders: fallbackOrders, mode: "db-fallback" };
    }

    const orders = (result.data.value || []) as any[];
    const syncedOrders: Array<any> = [];

    for (const order of orders) {
      // Fetch order lines
      const linesResult = await this.sapReq("GET", `/Orders(${order.DocEntry})`, undefined, {
        "$expand": "DocumentLines",
      });

      let items: Array<{ sku: string; name: string; qty: number }> = [];
      if (linesResult.ok && linesResult.data?.DocumentLines) {
        items = (linesResult.data.DocumentLines as any[]).map((line: any) => ({
          sku: line.ItemCode || line.U_sku || "",
          name: line.ItemDescription || "",
          qty: line.Quantity || 1,
        }));
      }

      const total = order.DocTotal || 0;

      const sapItems = items.length > 0 ? [...items, { customer_name: order.CardName || "" }] : [{ customer_name: order.CardName || "" }];

      // Sync to Lanework DB
      await this.sql`
        INSERT INTO orders (id, order_number, status, total_amount, items, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${order.DocNum?.toString() || ""},
          'synced_from_sap', ${total}, ${JSON.stringify(sapItems)}, NOW(), NOW())
        ON CONFLICT (order_number) DO UPDATE SET total_amount = ${total}, items = ${JSON.stringify(sapItems)}, updated_at = NOW()
      `;

      // Also upsert customer (account_number is the unique key, mirrors SAP CardCode)
      await this.sql`
        INSERT INTO customers (id, name, account_number, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${order.CardName || ""}, ${order.CardCode || ""}, NOW(), NOW())
        ON CONFLICT (account_number) DO UPDATE SET name = ${order.CardName || ""}, updated_at = NOW()
      `;

      syncedOrders.push({
        orderNumber: order.DocNum?.toString() || "",
        customerName: order.CardName || "",
        items,
        total,
      });
    }

    await this.logAction("sync_orders", "completed", { synced: syncedOrders.length });
    return { synced: syncedOrders.length, orders: syncedOrders, mode: "live" };
  }

  async pushInventory(): Promise<{
    synced: number; mode: "live" | "db-fallback";
  }> {
    await this.logAction("push_inventory", "started", {});

    if (!this.sapConfigured()) {
      // Update local inventory movements only
      const items = await this.sql`SELECT * FROM inventory WHERE quantity IS NOT NULL`;
      for (const item of items) {
        try {
          await this.sql`
            INSERT INTO inventory_movements (id, adjustment_type, quantity, reference, created_at)
            VALUES (${crypto.randomUUID()}, 'erp_sync_local', ${item.quantity || 0}, ${item.sku}, NOW())
          `;
        } catch (e: any) {
          console.error(`[SAP] Local movement log failed for ${item.sku}:`, e.message);
        }
      }
      await this.logAction("push_inventory", "completed", { synced: items.length, source: "db-fallback" });
      return { synced: items.length, mode: "db-fallback" };
    }

    const items = await this.sql`SELECT * FROM inventory WHERE quantity IS NOT NULL`;
    let synced = 0;

    for (const item of items) {
      try {
        const existingResult = await this.sapReq("GET", "/Items", undefined, {
          "$filter": `ItemCode eq '${item.sku}'`,
        });

        if (existingResult.ok && existingResult.data?.value?.length > 0) {
          await this.sapReq("PATCH", `/Items('${item.sku}')`, {
            QuantityOnStock: item.quantity || 0,
            InventoryUOM: item.unit || "pcs",
          });
        }

        // Log the sync event
        try {
          await this.sql`
            INSERT INTO inventory_movements (id, adjustment_type, quantity, reference, created_at)
            VALUES (${crypto.randomUUID()}, 'erp_sync', ${item.quantity || 0}, ${item.sku}, NOW())
          `;
        } catch (e: any) {
          console.error(`[SAP] Movement log failed for SKU ${item.sku}:`, e.message);
        }

        synced++;
      } catch (e: any) {
        console.error(`[SAP] Failed to sync SKU ${item.sku}:`, e.message);
      }
    }

    await this.logAction("push_inventory", "completed", { synced });
    return { synced, mode: "live" };
  }

  async getBusinessPartner(cardCode: string): Promise<{
    code: string; name: string; type: string; phone: string; email: string;
    address: string; city: string; state: string; gstin: string; balance: number;
    mode: "live" | "db-fallback";
  }> {
    if (!this.sapConfigured()) {
      // DB fallback: look up from customers table
      const [customer] = await this.sql`SELECT * FROM customers WHERE code = ${cardCode}`;
      if (customer) {
        return {
          code: cardCode,
          name: customer.name || "",
          type: customer.type || "customer",
          phone: customer.phone || "",
          email: customer.email || "",
          address: customer.address || "",
          city: customer.city || "",
          state: customer.state || "",
          gstin: customer.gstin || "",
          balance: customer.balance || 0,
          mode: "db-fallback",
        };
      }
      return {
        code: cardCode, name: "", type: "unknown", phone: "", email: "",
        address: "", city: "", state: "", gstin: "", balance: 0,
        mode: "db-fallback",
      };
    }

    const result = await this.sapReq("GET", `/BusinessPartners('${cardCode}')`);

    if (!result.ok || !result.data) {
      // DB fallback
      const [customer] = await this.sql`SELECT * FROM customers WHERE code = ${cardCode}`;
      if (customer) {
        return {
          code: cardCode,
          name: customer.name || "", type: customer.type || "customer",
          phone: customer.phone || "", email: customer.email || "",
          address: customer.address || "", city: customer.city || "",
          state: customer.state || "", gstin: customer.gstin || "", balance: customer.balance || 0,
          mode: "db-fallback",
        };
      }
      return {
        code: cardCode, name: result.message || "Not available", type: "unknown",
        phone: "", email: "", address: "", city: "", state: "", gstin: "", balance: 0,
        mode: "db-fallback",
      };
    }

    const bp = result.data;
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
      mode: "live",
    };
  }

  async syncInvoices(dateFrom?: string): Promise<{
    synced: number;
    invoices: Array<{ invoiceNo: string; customerName: string; total: number; date: string }>;
    mode: "live" | "db-fallback";
  }> {
    await this.logAction("sync_invoices", "started", { dateFrom });

    const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    if (!this.sapConfigured()) {
      // DB fallback: return from invoices table
      const dbInvoices = await this.sql`SELECT * FROM invoices WHERE created_at >= ${from}::timestamp ORDER BY created_at DESC LIMIT 100`;
      const fallbackInvoices: Array<any> = [];
      for (const inv of dbInvoices as any[]) {
        fallbackInvoices.push({
          invoiceNo: inv.invoice_number || "", customerName: inv.customer_name || "",
          total: inv.total_amount || 0, date: inv.invoice_date || (inv.created_at?.toISOString().slice(0, 10) || ""),
        });
      }
      await this.logAction("sync_invoices", "completed", { synced: fallbackInvoices.length, source: "db-fallback" });
      return { synced: fallbackInvoices.length, invoices: fallbackInvoices, mode: "db-fallback" };
    }

    const result = await this.sapReq("GET", "/Invoices", undefined, {
      "$filter": `DocDate ge '${from}'`,
      "$select": "DocEntry,DocNum,CardName,DocTotal,DocDate",
    });

    if (!result.ok || !result.data) {
      await this.logAction("sync_invoices", "failed", { reason: result.message });
      const dbInvoices = await this.sql`SELECT * FROM invoices WHERE created_at >= ${from}::timestamp ORDER BY created_at DESC LIMIT 100`;
      const fallbackInvoices: Array<any> = [];
      for (const inv of dbInvoices as any[]) {
        fallbackInvoices.push({
          invoiceNo: inv.invoice_number || "", customerName: inv.customer_name || "",
          total: inv.total_amount || 0, date: inv.invoice_date || (inv.created_at?.toISOString().slice(0, 10) || ""),
        });
      }
      return { synced: fallbackInvoices.length, invoices: fallbackInvoices, mode: "db-fallback" };
    }

    const invoices = (result.data.value || []) as any[];
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
    return { synced: syncedInvoices.length, invoices: syncedInvoices, mode: "live" };
  }
}

async function main(): Promise<void> {
const SDK = "@modelcontextprotocol/sdk";
  const { Server } = await import(`${SDK}/server/index.js`);
  const { StdioServerTransport } = await import(`${SDK}/server/stdio.js`);
  const { CallToolRequestSchema, ListToolsRequestSchema } = await import(`${SDK}/types.js`);
  
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
  
}

// Run only when executed directly (tsx index.ts), not when imported by the app.
if (isDirectRun(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
