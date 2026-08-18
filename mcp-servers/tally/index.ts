// @ts-nocheck — MCP SDK types resolved at build time in project context
/**
 * TallyPrime MCP Server — India's universal accounting system for MSMEs
 * Tools: sync_inventory, sync_orders, get_ledger, check_stock
 * ENV: TALLY_REST_URL (default http://localhost:9000), TALLY_COMPANY
 * Fallback: Reads from Neon DB inventory/orders tables when Tally not reachable
 */

import { LaneworkMCPServer, isDirectRun } from "../shared/server.ts";
import crypto from "crypto";

export class TallyMCP extends LaneworkMCPServer {
  constructor() { super("inventory-management"); }

  async init(): Promise<void> { await this.loadConfig(); }

  private get restUrl(): string { return process.env.TALLY_REST_URL || this.config.TALLY_REST_URL || "http://localhost:9000"; }
  private get company(): string { return process.env.TALLY_COMPANY || this.config.TALLY_COMPANY || "Lanework"; }

  private voucherNumber(prefix: string): string { return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`; }

  /** ─── TOOLS ─── */

  async syncInventory(): Promise<{ mode: string; synced: number; items: Array<{ sku: string; name: string; qty: number }> }> {
    await this.logAction("sync_inventory", "started", {});

    // Try live Tally REST API
    const xml = `<?xml version="1.0" encoding="UTF-8"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Stock Summary</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    const result = await this.safeApiCall<any>("TallyPrime Inventory", this.restUrl, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
      requiresEnv: ["TALLY_REST_URL"],
    });

    if (result.status === "live" && result.data) {
      const items: Array<{ sku: string; name: string; qty: number }> = [];
      const raw = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
      const matches = raw.matchAll(/<STOCKITEMNAME[^>]*>([^<]+)<\/STOCKITEMNAME>[\s\S]*?<CLOSINGBALANCE[^>]*>([^<]+)<\/CLOSINGBALANCE>/g);
      for (const m of matches) {
        items.push({ sku: `SKU-${m[1].trim().replace(/\s+/g, "-").toUpperCase()}`, name: m[1].trim(), qty: parseFloat(m[2]) || 0 });
      }
      // Upsert to Neon
      for (const item of items) {
        await this.sql`INSERT INTO inventory (id, sku, name, quantity, updated_at) VALUES (${crypto.randomUUID()}, ${item.sku}, ${item.name}, ${item.qty}, NOW()) ON CONFLICT (sku) DO UPDATE SET quantity = ${item.qty}, name = ${item.name}, updated_at = NOW()`;
      }
      await this.logAction("sync_inventory", "completed", { synced: items.length });
      return { mode: "live", synced: items.length, items };
    }

    // Fallback: read from Neon inventory table
    const dbItems = await this.sql`SELECT sku, name, quantity FROM inventory ORDER BY name ASC`;
    const items = dbItems.map((i: any) => ({ sku: i.sku, name: i.name, qty: i.quantity || 0 }));
    await this.logAction("sync_inventory", "completed", { mode: "db-fallback", synced: items.length });
    return { mode: result.message, synced: items.length, items };
  }

  async syncOrders(): Promise<{ mode: string; pushed: number; vouchers: string[] }> {
    await this.logAction("sync_orders", "started", {});
    const orders = await this.sql`SELECT * FROM orders WHERE status = 'completed' ORDER BY created_at DESC LIMIT 20`;

    if (!this.hasEnv("TALLY_REST_URL")) {
      return { mode: "⚠️ TALLY_REST_URL not set — orders remain in DB", pushed: 0, vouchers: [] };
    }

    const vouchers: string[] = [];
    for (const o of orders) {
      const vno = this.voucherNumber("SL");
      const xml = `<?xml version="1.0" encoding="UTF-8"?><ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER><DATE>${new Date().toISOString().slice(0, 10)}</DATE><VOUCHERTYPENAME>Sales</VOUCHERTYPENAME><VOUCHERNUMBER>${vno}</VOUCHERNUMBER><PARTYLEDGERNAME>${o.customer_name || "Cash"}</PARTYLEDGERNAME></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
      try {
        await fetch(this.restUrl, { method: "POST", headers: { "Content-Type": "application/xml" }, body: xml, signal: AbortSignal.timeout(8000) });
        vouchers.push(vno);
      } catch { break; }
    }

    await this.logAction("sync_orders", "completed", { pushed: vouchers.length });
    return { mode: vouchers.length > 0 ? "live" : "partial", pushed: vouchers.length, vouchers };
  }

  async getLedger(ledgerName: string): Promise<{ name: string; balance: string; mode: string }> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Ledger</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><LEDGERNAME>${ledgerName}</LEDGERNAME></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    const result = await this.safeApiCall<any>("Tally Ledger", this.restUrl, {
      method: "POST", headers: { "Content-Type": "application/xml" }, body: xml, requiresEnv: ["TALLY_REST_URL"],
    }, { balance: "0.00" });

    if (result.status === "live" && result.data) {
      const raw = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
      const match = raw.match(/<CLOSINGBALANCE[^>]*>([^<]+)<\/CLOSINGBALANCE>/);
      return { name: ledgerName, balance: match ? match[1] : "0.00", mode: "live" };
    }
    return { name: ledgerName, balance: "0.00", mode: result.message };
  }

  async checkStock(sku: string): Promise<{ sku: string; name: string; qty: number; reorderPoint: number; needsReorder: boolean }> {
    const [item] = await this.sql`SELECT * FROM inventory WHERE sku = ${sku}`;
    if (!item) return { sku, name: "Not found", qty: 0, reorderPoint: 0, needsReorder: false };
    return { sku: item.sku, name: item.name || "", qty: item.quantity || 0, reorderPoint: item.reorder_point || 0, needsReorder: (item.quantity || 0) <= (item.reorder_point || 0) };
  }
}

async function main(): Promise<void> {
const SDK = "@modelcontextprotocol/sdk";
  const { Server } = await import(`${SDK}/server/index.js`);
  const { StdioServerTransport } = await import(`${SDK}/server/stdio.js`);
  const { CallToolRequestSchema, ListToolsRequestSchema } = await import(`${SDK}/types.js`);
  
  const mcp = new TallyMCP();
  const server = new Server({ name: "lanework-tally", version: "1.0.0" }, { capabilities: { tools: {} } });
  
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: "sync_inventory", description: "Sync stock levels from TallyPrime → Lanework DB. Falls back to DB cache when Tally not reachable.", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "sync_orders", description: "Push completed orders to Tally as sales vouchers", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "get_ledger", description: "Fetch a Tally ledger balance by name", inputSchema: { type: "object", properties: { ledgerName: { type: "string" } }, required: ["ledgerName"] } },
      { name: "check_stock", description: "Quick SKU stock check with reorder recommendation", inputSchema: { type: "object", properties: { sku: { type: "string" } }, required: ["sku"] } },
    ],
  }));
  
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    await mcp.init();
    try {
      switch (name) {
        case "sync_inventory": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncInventory(), null, 2) }] };
        case "sync_orders": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncOrders(), null, 2) }] };
        case "get_ledger": return { content: [{ type: "text", text: JSON.stringify(await mcp.getLedger(args.ledgerName as string), null, 2) }] };
        case "check_stock": return { content: [{ type: "text", text: JSON.stringify(await mcp.checkStock(args.sku as string), null, 2) }] };
        default: throw new Error(`Unknown tool: ${name}`);
      }
    } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
  });
  
  const transport = new StdioServerTransport();
  await mcp.init();
  await server.connect(transport);
  console.error("[TallyMCP] Ready — 4 tools | Live API + DB fallback");
  
}

// Run only when executed directly (tsx index.ts), not when imported by the app.
if (isDirectRun(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
