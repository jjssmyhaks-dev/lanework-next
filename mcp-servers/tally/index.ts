/**
 * TallyPrime MCP Server
 * Sync inventory & orders with Tally — India's universal accounting system for MSMEs
 *
 * Tools:
 * - sync_inventory: Read stock from Tally, write to Neon inventory table
 * - sync_orders: Push orders to Tally as sales vouchers
 * - get_ledger: Fetch any Tally ledger by name
 * - check_stock: Quick SKU stock check with reorder recommendation
 *
 * ENV: TALLY_REST_URL (default http://localhost:9000), TALLY_COMPANY
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class TallyMCP extends LaneworkMCPServer {
  private restUrl: string = "";
  private company: string = "";

  constructor() { super("inventory-management"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.restUrl = process.env.TALLY_REST_URL || this.config.TALLY_REST_URL || "http://localhost:9000";
    this.company = process.env.TALLY_COMPANY || this.config.TALLY_COMPANY || "Lanework";
  }

  /** Send XML request to Tally REST API */
  private async tallyRequest(xml: string): Promise<string> {
    const res = await fetch(this.restUrl, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
    });
    if (!res.ok) throw new Error(`Tally API error: ${res.status}`);
    return res.text();
  }

  /** Generate unique voucher number */
  private voucherNumber(prefix: string): string {
    return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  }

  /** ─── TOOLS ─── */

  async syncInventory(): Promise<{ synced: number; items: Array<{ sku: string; name: string; qty: number }> }> {
    await this.logAction("sync_inventory", "started", {});

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Stock Summary</REPORTNAME>
        <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

    const raw = await this.tallyRequest(xml);
    const items: Array<{ sku: string; name: string; qty: number }> = [];
    const matches = raw.matchAll(/<STOCKITEMNAME[^>]*>([^<]+)<\/STOCKITEMNAME>[\s\S]*?<CLOSINGBALANCE[^>]*>([^<]+)<\/CLOSINGBALANCE>/g);

    for (const m of matches) {
      const name = m[1].trim();
      const qty = parseFloat(m[2]) || 0;
      const sku = `SKU-${name.replace(/\s+/g, "-").toUpperCase()}`;
      items.push({ sku, name, qty });

      await this.sql`
        INSERT INTO inventory (id, sku, name, quantity, unit, reorder_point, reorder_quantity, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${sku}, ${name}, ${qty}, 'pcs', ${Math.ceil(qty * 0.2)}, ${Math.ceil(qty * 0.5)}, NOW(), NOW())
        ON CONFLICT (sku) DO UPDATE SET quantity = ${qty}, name = ${name}, updated_at = NOW()
      `;
    }

    await this.logAction("sync_inventory", "completed", { synced: items.length });
    return { synced: items.length, items };
  }

  async syncOrders(orders: Array<{ orderNumber: string; customerName: string; items: Array<{ sku: string; name: string; qty: number; rate: number }>; date?: string }>): Promise<{ synced: number; vouchers: string[] }> {
    await this.logAction("sync_orders", "started", { count: orders.length });
    const vouchers: string[] = [];

    for (const order of orders) {
      const vchNo = this.voucherNumber("SL");
      const date = order.date || new Date().toISOString().slice(0, 10);

      const itemXml = order.items.map((item, i) =>
        `<ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${item.name}</STOCKITEMNAME>
          <RATE>${item.rate}/-</RATE>
          <AMOUNT>-${item.qty * item.rate}</AMOUNT>
          <ACTUALQTY>${item.qty} pcs</ACTUALQTY>
          <BILLEDQTY>${item.qty} pcs</BILLEDQTY>
        </ALLINVENTORYENTRIES.LIST>`
      ).join("");

      const total = order.items.reduce((sum, i) => sum + i.qty * i.rate, 0);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${vchNo}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${order.customerName}</PARTYLEDGERNAME>
            <EFFECTIVEDATE>${date}</EFFECTIVEDATE>
            ${itemXml}
            <NARRATION>Lanework Auto-Sync: ${order.orderNumber}</NARRATION>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

      await this.tallyRequest(xml);
      vouchers.push(vchNo);

      // Sync to orders table
      await this.sql`
        INSERT INTO orders (id, order_number, customer_name, status, total_amount, items, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${order.orderNumber}, ${order.customerName}, 'completed', ${total},
          ${JSON.stringify(order.items)}, NOW(), NOW())
        ON CONFLICT (order_number) DO UPDATE SET status = 'completed', updated_at = NOW()
      `;
    }

    await this.logAction("sync_orders", "completed", { synced: orders.length, vouchers });
    return { synced: orders.length, vouchers };
  }

  async getLedger(name: string): Promise<{ name: string; openingBalance: number; closingBalance: number; transactions: Array<{ date: string; voucherType: string; amount: number }> }> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Ledger</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <LEDGERNAME>${name}</LEDGERNAME>
          <ISLEDGER>Yes</ISLEDGER>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

    const raw = await this.tallyRequest(xml);

    const obMatch = raw.match(/<OPENINGBALANCE[^>]*>([^<]+)<\/OPENINGBALANCE>/);
    const cbMatch = raw.match(/<CLOSINGBALANCE[^>]*>([^<]+)<\/CLOSINGBALANCE>/);
    const txnMatches = raw.matchAll(/<VOUCHERDATE[^>]*>([^<]+)<\/VOUCHERDATE>[\s\S]*?<VOUCHERTYPENAME[^>]*>([^<]+)<\/VOUCHERTYPENAME>[\s\S]*?<AMOUNT[^>]*>(-?[\d.]+)<\/AMOUNT>/g);

    const transactions: Array<{ date: string; voucherType: string; amount: number }> = [];
    for (const m of txnMatches) {
      transactions.push({ date: m[1].trim(), voucherType: m[2].trim(), amount: parseFloat(m[3]) || 0 });
    }

    return {
      name,
      openingBalance: parseFloat(obMatch?.[1] || "0") || 0,
      closingBalance: parseFloat(cbMatch?.[1] || "0") || 0,
      transactions,
    };
  }

  async checkStock(sku: string): Promise<{ sku: string; name: string; currentQty: number; reorderPoint: number; reorderQty: number; shouldReorder: boolean; message: string }> {
    const rows = await this.sql`SELECT * FROM inventory WHERE sku = ${sku}`;
    if (rows.length === 0) {
      return { sku, name: "", currentQty: 0, reorderPoint: 0, reorderQty: 0, shouldReorder: false, message: "SKU not found in inventory" };
    }

    const item = rows[0];
    const qty = item.quantity || 0;
    const rp = item.reorder_point || 0;
    const rq = item.reorder_quantity || 0;
    const should = qty <= rp;

    return {
      sku,
      name: item.name || "",
      currentQty: qty,
      reorderPoint: rp,
      reorderQty: rq,
      shouldReorder: should,
      message: should ? `⚠️ Stock low — reorder ${rq} units now` : `✅ Stock sufficient (${qty} units)`,
    };
  }
}

// ─── MCP Entry Point ───
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new TallyMCP();
const server = new Server({ name: "lanework-tally", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "sync_inventory", description: "Pull stock from TallyPrime and sync to Lanework inventory", inputSchema: { type: "object", properties: {}, required: [] } },
    { name: "sync_orders", description: "Push orders to TallyPrime as sales vouchers", inputSchema: { type: "object", properties: { orders: { type: "array", items: { type: "object", properties: { orderNumber: { type: "string" }, customerName: { type: "string" }, items: { type: "array", items: { type: "object", properties: { sku: { type: "string" }, name: { type: "string" }, qty: { type: "number" }, rate: { type: "number" } }, required: ["sku", "name", "qty", "rate"] } } }, required: ["orderNumber", "customerName", "items"] } } }, required: ["orders"] } },
    { name: "get_ledger", description: "Fetch any Tally ledger by name", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
    { name: "check_stock", description: "Quick stock check for a SKU with reorder recommendation", inputSchema: { type: "object", properties: { sku: { type: "string" } }, required: ["sku"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "sync_inventory": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncInventory(), null, 2) }] };
      case "sync_orders": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncOrders(args.orders as any), null, 2) }] };
      case "get_ledger": return { content: [{ type: "text", text: JSON.stringify(await mcp.getLedger(args.name as string), null, 2) }] };
      case "check_stock": return { content: [{ type: "text", text: JSON.stringify(await mcp.checkStock(args.sku as string), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[TallyMCP] Ready — 4 tools available");
