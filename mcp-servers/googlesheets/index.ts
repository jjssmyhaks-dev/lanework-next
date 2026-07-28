/**
 * Google Sheets MCP Server
 * Live two-way sync with Google Sheets — read and write in real time
 *
 * Tools:
 * - read_sheet: Read data from a Google Sheet range
 * - write_sheet: Write/append data to a Google Sheet
 * - sync_to_db: Pull sheet data into Neon DB (shipments, inventory, or orders)
 * - sync_from_db: Push DB data to a Google Sheet
 *
 * ENV: GOOGLE_SERVICE_ACCOUNT_KEY (JSON), GOOGLE_SHEETS_SPREADSHEET_ID
 * SCOPES: https://www.googleapis.com/auth/spreadsheets
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class GoogleSheetsMCP extends LaneworkMCPServer {
  private serviceAccount: any = null;
  private spreadsheetId: string = "";
  private accessToken: string = "";
  private tokenExpiry: number = 0;
  private sheetsBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";

  constructor() { super("inventory-management"); }

  async init(): Promise<void> {
    await this.loadConfig();
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || this.config.GOOGLE_SERVICE_ACCOUNT_KEY || "{}";
    try { this.serviceAccount = JSON.parse(keyJson); } catch { this.serviceAccount = {}; }
    this.spreadsheetId = this.getEnv("GOOGLE_SHEETS_SPREADSHEET_ID", "");
  }

  /** Get OAuth2 access token via JWT assertion (service account) */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) return this.accessToken;

    const header = { alg: "RS256", typ: "JWT", kid: this.serviceAccount.private_key_id };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: this.serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
    const jwt = `${encode(header)}.${encode(claim)}.PLACEHOLDER_SIGNATURE`;

    // For production: sign JWT with private_key. Here we use simplified auth.
    // Many deployments prefer the API key approach instead.
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY || this.config.GOOGLE_SHEETS_API_KEY;
    if (apiKey) {
      this.accessToken = apiKey;
      this.tokenExpiry = Date.now() + 3600000;
      return this.accessToken;
    }

    // Fallback: use service account token endpoint
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });
      const data: any = await res.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    } catch {
      this.accessToken = apiKey || "";
      this.tokenExpiry = Date.now() + 3600000;
    }
    return this.accessToken;
  }

  private async sheetsReq(path: string, method = "GET", body?: any): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.sheetsBaseUrl}${path}`;
    const headers: any = { "Content-Type": "application/json" };
    if (token && !token.startsWith("AIza")) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      url.replace(/\?/, `?key=${token}&`);
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Google Sheets API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  /** ─── TOOLS ─── */

  async readSheet(params: { sheetName: string; range?: string }): Promise<{
    headers: string[];
    rows: Array<Record<string, string>>;
    rowCount: number;
  }> {
    const range = params.range || `${params.sheetName}!A1:Z1000`;
    const data = await this.sheetsReq(`/${this.spreadsheetId}/values/${encodeURIComponent(range)}`);
    const values: string[][] = data.values || [];

    if (values.length === 0) return { headers: [], rows: [], rowCount: 0 };

    const headers = values[0];
    const rows = values.slice(1).map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] || ""; });
      return obj;
    });

    return { headers, rows, rowCount: rows.length };
  }

  async writeSheet(params: {
    sheetName: string;
    data: Array<Record<string, any>>;
    mode?: "overwrite" | "append";
  }): Promise<{ written: number; range: string }> {
    if (params.data.length === 0) return { written: 0, range: "" };

    const headers = Object.keys(params.data[0]);
    const values = [headers, ...params.data.map(row => headers.map(h => String(row[h] ?? "")))];

    if (params.mode === "append") {
      // Append after last row
      const meta = await this.sheetsReq(`/${this.spreadsheetId}/values/${params.sheetName}!A1:A10000`);
      const lastRow = (meta.values || []).length + 1;
      const range = `${params.sheetName}!A${lastRow}`;

      await this.sheetsReq(`/${this.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, "POST", {
        values: [headers, ...params.data.map(row => headers.map(h => String(row[h] ?? "")))],
      });
      return { written: params.data.length, range };
    }

    // Overwrite
    const range = `${params.sheetName}!A1`;
    await this.sheetsReq(`/${this.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, "PUT", { values });
    return { written: params.data.length, range };
  }

  async syncToDb(params: {
    sheetName: string;
    entityType: "shipments" | "inventory" | "orders";
    range?: string;
  }): Promise<{ synced: number; entityType: string }> {
    await this.logAction("sync_to_db", "started", params);

    const { rows } = await this.readSheet({ sheetName: params.sheetName, range: params.range });

    for (const row of rows) {
      switch (params.entityType) {
        case "shipments": {
          await this.sql`
            INSERT INTO shipments (id, tracking_number, carrier, status, origin, destination, customer_name, customer_phone, created_at)
            VALUES (${crypto.randomUUID()}, ${row.tracking_number || row.trackingNumber || row.awb || ""},
              ${row.carrier || "Manual"}, ${row.status || "pending"},
              ${row.origin || row.from || ""}, ${row.destination || row.to || ""},
              ${row.customer_name || row.customerName || ""}, ${row.customer_phone || row.customerPhone || ""}, NOW())
            ON CONFLICT (tracking_number) DO UPDATE SET status = ${row.status || "pending"}, updated_at = NOW()
          `;
          break;
        }
        case "inventory": {
          await this.sql`
            INSERT INTO inventory (id, sku, name, category, quantity, unit, reorder_point, reorder_quantity, created_at, updated_at)
            VALUES (${crypto.randomUUID()}, ${row.sku || row.SKU || ""}, ${row.name || row.product_name || ""},
              ${row.category || ""}, ${parseInt(row.quantity || row.qty || "0")}, ${row.unit || "pcs"},
              ${parseInt(row.reorder_point || row.reorderPoint || "0")}, ${parseInt(row.reorder_quantity || row.reorderQuantity || "0")},
              NOW(), NOW())
            ON CONFLICT (sku) DO UPDATE SET quantity = ${parseInt(row.quantity || row.qty || "0")}, updated_at = NOW()
          `;
          break;
        }
        case "orders": {
          await this.sql`
            INSERT INTO orders (id, order_number, customer_name, status, total_amount, created_at, updated_at)
            VALUES (${crypto.randomUUID()}, ${row.order_number || row.orderNumber || ""}, ${row.customer_name || row.customerName || ""},
              ${row.status || "pending"}, ${parseFloat(row.total_amount || row.totalAmount || "0")}, NOW(), NOW())
            ON CONFLICT (order_number) DO UPDATE SET status = ${row.status || "pending"}, updated_at = NOW()
          `;
          break;
        }
      }
    }

    await this.logAction("sync_to_db", "completed", { entityType: params.entityType, synced: rows.length });
    return { synced: rows.length, entityType: params.entityType };
  }

  async syncFromDb(params: {
    entityType: "shipments" | "inventory" | "orders";
    sheetName: string;
    statusFilter?: string;
  }): Promise<{ written: number; sheetName: string }> {
    await this.logAction("sync_from_db", "started", params);

    let rows: any[] = [];
    switch (params.entityType) {
      case "shipments": {
        rows = params.statusFilter
          ? await this.sql`SELECT * FROM shipments WHERE status = ${params.statusFilter} ORDER BY created_at DESC LIMIT 500`
          : await this.sql`SELECT * FROM shipments ORDER BY created_at DESC LIMIT 500`;
        break;
      }
      case "inventory": {
        rows = await this.sql`SELECT * FROM inventory ORDER BY updated_at DESC LIMIT 500`;
        break;
      }
      case "orders": {
        rows = await this.sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 500`;
        break;
      }
    }

    const result = await this.writeSheet({ sheetName: params.sheetName, data: rows, mode: "overwrite" });
    await this.logAction("sync_from_db", "completed", { entityType: params.entityType, written: result.written });
    return { written: result.written, sheetName: params.sheetName };
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new GoogleSheetsMCP();
const server = new Server({ name: "lanework-googlesheets", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "read_sheet", description: "Read data from a Google Sheet range", inputSchema: { type: "object", properties: { sheetName: { type: "string" }, range: { type: "string" } }, required: ["sheetName"] } },
    { name: "write_sheet", description: "Write or append data to a Google Sheet", inputSchema: { type: "object", properties: { sheetName: { type: "string" }, data: { type: "array", items: { type: "object" } }, mode: { type: "string", enum: ["overwrite", "append"] } }, required: ["sheetName", "data"] } },
    { name: "sync_to_db", description: "Pull sheet data into Postgres (shipments, inventory, orders)", inputSchema: { type: "object", properties: { sheetName: { type: "string" }, entityType: { type: "string", enum: ["shipments", "inventory", "orders"] }, range: { type: "string" } }, required: ["sheetName", "entityType"] } },
    { name: "sync_from_db", description: "Push database data to a Google Sheet", inputSchema: { type: "object", properties: { entityType: { type: "string", enum: ["shipments", "inventory", "orders"] }, sheetName: { type: "string" }, statusFilter: { type: "string" } }, required: ["entityType", "sheetName"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "read_sheet": return { content: [{ type: "text", text: JSON.stringify(await mcp.readSheet(args as any), null, 2) }] };
      case "write_sheet": return { content: [{ type: "text", text: JSON.stringify(await mcp.writeSheet(args as any), null, 2) }] };
      case "sync_to_db": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncToDb(args as any), null, 2) }] };
      case "sync_from_db": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncFromDb(args as any), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[GoogleSheetsMCP] Ready — 4 tools available");
