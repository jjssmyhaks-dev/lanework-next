// @ts-nocheck — MCP SDK types resolved at build time in project context
/**
 * WMS MCP Server
 * Generic Warehouse Management System adapter — connects to any WMS via REST API or webhooks
 *
 * Tools:
 * - get_dock_schedule: Dock availability and bookings for a date range
 * - assign_pick_task: Assign a pick task with optimized path
 * - check_inventory: Real-time inventory check by warehouse/zone
 * - receive_shipment: Log incoming shipment receipt
 *
 * ENV: WMS_API_URL, WMS_API_KEY
 */

import { LaneworkMCPServer, isDirectRun } from "../shared/server.ts";
import crypto from "crypto";

export class WmsMCP extends LaneworkMCPServer {
  private apiUrl: string = "";
  private apiKey: string = "";

  constructor() { super("warehouse-operations"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.apiUrl = process.env.WMS_API_URL || this.config.WMS_API_URL || "";
    this.apiKey = process.env.WMS_API_KEY || this.config.WMS_API_KEY || "";
  }

  private async wmsReq(path: string, method = "GET", body?: any): Promise<any> {
    const url = this.apiUrl ? `${this.apiUrl}${path}` : null;
    if (url) {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-api-key": this.apiKey },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`WMS API error: ${res.status}`);
      return res.json();
    }
    // Fallback: operate on Neon DB directly (no external WMS configured)
    return null;
  }

  /** ─── TOOLS ─── */

  async getDockSchedule(params: {
    warehouseId: string;
    dateFrom: string;
    dateTo: string;
  }): Promise<Array<{
    dockId: string; dockName: string; date: string;
    timeSlots: Array<{ time: string; booked: boolean; shipmentId?: string }>;
  }>> {
    const external = await this.wmsReq(`/docks?warehouse=${params.warehouseId}&from=${params.dateFrom}&to=${params.dateTo}`);

    if (external) return external.docks || [];

    // Fallback: query local DB
    const rows = await this.sql`
      SELECT * FROM dock_schedules
      WHERE warehouse_id = ${params.warehouseId}
        AND schedule_date BETWEEN ${params.dateFrom} AND ${params.dateTo}
      ORDER BY schedule_date, time_slot
    `;

    if (rows.length === 0) {
      // Generate default slots
      const docks = ["Dock-A", "Dock-B", "Dock-C", "Dock-D"];
      const getDates = () => {
        const dates: string[] = [];
        const start = new Date(params.dateFrom);
        const end = new Date(params.dateTo);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().slice(0, 10));
        }
        return dates;
      };

      const slots = ["06:00-08:00", "08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00", "18:00-20:00"];
      const result: any[] = [];

      for (const date of getDates()) {
        for (const dock of docks) {
          result.push({
            dockId: crypto.randomUUID().slice(0, 8),
            dockName: dock,
            date,
            timeSlots: slots.map(time => ({ time, booked: false })),
          });
        }
      }
      return result;
    }

    // Group by dock + date
    const grouped: any = {};
    for (const r of rows) {
      const key = `${r.dock_name}-${r.schedule_date?.toISOString().slice(0, 10)}`;
      if (!grouped[key]) grouped[key] = { dockId: r.dock_id, dockName: r.dock_name, date: r.schedule_date?.toISOString().slice(0, 10), timeSlots: [] };
      grouped[key].timeSlots.push({ time: r.time_slot, booked: r.status === "booked", shipmentId: r.shipment_id });
    }
    return Object.values(grouped);
  }

  async assignPickTask(params: {
    warehouseId: string;
    orderId: string;
    items: Array<{ sku: string; name: string; qty: number; location: string }>;
    priority?: "normal" | "high" | "urgent";
  }): Promise<{
    taskId: string;
    status: string;
    pickPath: string[];
    estimatedTimeMin: number;
  }> {
    await this.logAction("assign_pick_task", "started", params);

    const taskId = crypto.randomUUID();
    // Optimize pick path by location (zone/aisle/bin sequence)
    const sorted = [...params.items].sort((a, b) => {
      const locA = a.location || "ZZZ-Z-999";
      const locB = b.location || "ZZZ-Z-999";
      return locA.localeCompare(locB);
    });

    const pickPath = sorted.map(i => i.location || `${i.sku}`);

    await this.sql`
      INSERT INTO warehouse (id, user_id, type, priority, status, metadata, created_at, updated_at)
      VALUES (${taskId}, 'default', 'pick', ${params.priority || "normal"}, 'assigned',
        ${JSON.stringify({ warehouseId: params.warehouseId, orderId: params.orderId, items: params.items, pickPath })}::jsonb,
        NOW(), NOW())
    `;

    await this.logAction("assign_pick_task", "completed", { taskId, items: params.items.length });
    return {
      taskId,
      status: "assigned",
      pickPath,
      estimatedTimeMin: Math.round(params.items.length * 2.5),
    };
  }

  async checkInventory(params: {
    warehouseId?: string;
    zone?: string;
    category?: string;
    lowStock?: boolean;
  }): Promise<Array<{
    sku: string; name: string; qty: number; location: string;
    status: "ok" | "low" | "out";
  }>> {
    let query = this.sql`SELECT * FROM inventory WHERE 1=1`;
    if (params.warehouseId) query = this.sql`SELECT * FROM inventory WHERE warehouse = ${params.warehouseId}`;
    let rows = await query;

    if (params.category) {
      rows = rows.filter((r: any) => (r.category || "").toLowerCase() === params.category!.toLowerCase());
    }
    if (params.lowStock) {
      rows = rows.filter((r: any) => r.quantity <= (r.reorder_point || 10));
    }

    return rows.map((r: any) => {
      const qty = r.quantity || 0;
      return {
        sku: r.sku,
        name: r.name || "",
        qty,
        location: r.warehouse || r.location || "N/A",
        status: qty === 0 ? "out" as const : qty <= (r.reorder_point || 10) ? "low" as const : "ok" as const,
      };
    });
  }

  async receiveShipment(params: {
    trackingNumber: string;
    carrier: string;
    warehouseId: string;
    items: Array<{ sku: string; qty: number }>;
  }): Promise<{ receiptId: string; status: string; itemsReceived: number }> {
    await this.logAction("receive_shipment", "started", params);

    const receiptId = crypto.randomUUID();
    let received = 0;

    for (const item of params.items) {
      await this.sql`
        UPDATE inventory SET quantity = quantity + ${item.qty}, updated_at = NOW()
        WHERE sku = ${item.sku}
      `;
      received += item.qty;

      try {
        await this.sql`
          INSERT INTO inventory_movements (id, adjustment_type, quantity, reference, notes, created_at)
          VALUES (${crypto.randomUUID()}, 'inbound', ${item.qty}, ${item.sku}, ${`Received from ${params.trackingNumber}`}, NOW())
        `;
      } catch (e: any) {
        console.error(`[WMS] Movement log failed for ${item.sku}:`, e.message);
      }
    }

    await this.sql`
      UPDATE shipments SET status = 'received', updated_at = NOW()
      WHERE tracking_number = ${params.trackingNumber}
    `;

    await this.logAction("receive_shipment", "completed", { receiptId, itemsReceived: received });
    return { receiptId, status: "received", itemsReceived: received };
  }
}

async function main(): Promise<void> {
const SDK = "@modelcontextprotocol/sdk";
  const { Server } = await import(`${SDK}/server/index.js`);
  const { StdioServerTransport } = await import(`${SDK}/server/stdio.js`);
  const { CallToolRequestSchema, ListToolsRequestSchema } = await import(`${SDK}/types.js`);
  
  const mcp = new WmsMCP();
  const server = new Server({ name: "lanework-wms", version: "1.0.0" }, { capabilities: { tools: {} } });
  
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: "get_dock_schedule", description: "Dock availability and bookings for a date range", inputSchema: { type: "object", properties: { warehouseId: { type: "string" }, dateFrom: { type: "string" }, dateTo: { type: "string" } }, required: ["warehouseId", "dateFrom", "dateTo"] } },
      { name: "assign_pick_task", description: "Assign a pick task with optimized path based on item locations", inputSchema: { type: "object", properties: { warehouseId: { type: "string" }, orderId: { type: "string" }, items: { type: "array", items: { type: "object", properties: { sku: { type: "string" }, name: { type: "string" }, qty: { type: "number" }, location: { type: "string" } }, required: ["sku", "name", "qty", "location"] } }, priority: { type: "string", enum: ["normal", "high", "urgent"] } }, required: ["warehouseId", "orderId", "items"] } },
      { name: "check_inventory", description: "Real-time inventory check by warehouse, zone, or category", inputSchema: { type: "object", properties: { warehouseId: { type: "string" }, zone: { type: "string" }, category: { type: "string" }, lowStock: { type: "boolean" } }, required: [] } },
      { name: "receive_shipment", description: "Log incoming shipment receipt and update inventory", inputSchema: { type: "object", properties: { trackingNumber: { type: "string" }, carrier: { type: "string" }, warehouseId: { type: "string" }, items: { type: "array", items: { type: "object", properties: { sku: { type: "string" }, qty: { type: "number" } }, required: ["sku", "qty"] } } }, required: ["trackingNumber", "carrier", "warehouseId", "items"] } },
    ],
  }));
  
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    await mcp.init();
    try {
      switch (name) {
        case "get_dock_schedule": return { content: [{ type: "text", text: JSON.stringify(await mcp.getDockSchedule(args as any), null, 2) }] };
        case "assign_pick_task": return { content: [{ type: "text", text: JSON.stringify(await mcp.assignPickTask(args as any), null, 2) }] };
        case "check_inventory": return { content: [{ type: "text", text: JSON.stringify(await mcp.checkInventory(args as any), null, 2) }] };
        case "receive_shipment": return { content: [{ type: "text", text: JSON.stringify(await mcp.receiveShipment(args as any), null, 2) }] };
        default: throw new Error(`Unknown tool: ${name}`);
      }
    } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
  });
  
  const transport = new StdioServerTransport();
  await mcp.init();
  await server.connect(transport);
  console.error("[WmsMCP] Ready — 4 tools available");
  
}

// Run only when executed directly (tsx index.ts), not when imported by the app.
if (isDirectRun(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
