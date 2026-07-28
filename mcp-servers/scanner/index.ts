/**
 * Scanner MCP Server
 * Barcode/QR code scanning for pick verification, receiving, and packing
 *
 * Tools:
 * - verify_pick: Scan SKU barcode → verify against pick list
 * - receive_item: Scan shipment barcode → log receipt
 * - check_sku: Quick SKU lookup by barcode
 * - generate_label: Generate barcode/label for a SKU or shipment
 *
 * Relies on: Device camera via browser (client-side scanning), this server processes scan results
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class ScannerMCP extends LaneworkMCPServer {
  constructor() { super("warehouse-operations"); }

  async init(): Promise<void> {
    await this.loadConfig();
  }

  /** ─── TOOLS ─── */

  async verifyPick(params: {
    orderId: string;
    scannedSku: string;
    scannedQty: number;
    location: string;
    scannedBy: string;
  }): Promise<{
    verified: boolean;
    sku: string;
    name: string;
    expectedQty: number;
    scannedQty: number;
    status: "match" | "mismatch" | "not_in_order" | "extra";
    message: string;
  }> {
    // Check if this SKU is in the order's pick list
    const [order] = await this.sql`SELECT * FROM orders WHERE id = ${params.orderId}`;
    if (!order) return { verified: false, sku: params.scannedSku, name: "", expectedQty: 0, scannedQty: params.scannedQty, status: "not_in_order", message: "Order not found" };

    const items: Array<{ sku: string; name: string; qty: number }> = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
    const match = items.find((i: any) => i.sku === params.scannedSku);

    if (!match) {
      await this.logAction("verify_pick", "completed", { orderId: params.orderId, scannedSku: params.scannedSku, status: "not_in_order" });
      return {
        verified: false, sku: params.scannedSku, name: "",
        expectedQty: 0, scannedQty: params.scannedQty,
        status: "not_in_order",
        message: `⚠️ SKU ${params.scannedSku} is NOT in order ${order.order_number || params.orderId}. Check the pick list.`,
      };
    }

    const isMatch = params.scannedQty === match.qty;

    // Update pick progress
    await this.sql`
      INSERT INTO pick_verifications (id, order_id, sku, expected_qty, scanned_qty, location, scanned_by, verified, created_at)
      VALUES (${crypto.randomUUID()}, ${params.orderId}, ${params.scannedSku}, ${match.qty}, ${params.scannedQty},
        ${params.location}, ${params.scannedBy}, ${isMatch}, NOW())
    `;

    await this.logAction("verify_pick", "completed", { orderId: params.orderId, sku: params.scannedSku, match: isMatch });

    return {
      verified: isMatch,
      sku: params.scannedSku,
      name: match.name || params.scannedSku,
      expectedQty: match.qty,
      scannedQty: params.scannedQty,
      status: isMatch ? "match" : "mismatch",
      message: isMatch
        ? `✅ Verified! ${match.qty}x ${match.name || params.scannedSku} — pick complete`
        : `⚠️ Qty mismatch! Expected ${match.qty}, got ${params.scannedQty}. Rescan or adjust.`,
    };
  }

  async receiveItem(params: {
    scannedBarcode: string; // Could be AWB, tracking#, or SKU
    receivedBy: string;
    location?: string;
  }): Promise<{
    type: "shipment" | "sku";
    id: string;
    name: string;
    status: string;
    message: string;
  }> {
    // Try shipment first
    const [shipment] = await this.sql`SELECT * FROM shipments WHERE tracking_number = ${params.scannedBarcode}`;
    if (shipment) {
      await this.sql`
        UPDATE shipments SET status = 'received', updated_at = NOW()
        WHERE tracking_number = ${params.scannedBarcode}
      `;

      await this.sql`
        INSERT INTO shipment_events (id, tracking_number, status, location, description, created_at)
        VALUES (${crypto.randomUUID()}, ${params.scannedBarcode}, 'received',
          ${params.location || "Warehouse"}, ${`Received by ${params.receivedBy}`}, NOW())
      `;

      await this.logAction("receive_item", "completed", { type: "shipment", trackingNumber: params.scannedBarcode });
      return {
        type: "shipment", id: shipment.tracking_number || shipment.id,
        name: `Shipment ${shipment.tracking_number}`,
        status: "received",
        message: `📦 Shipment ${shipment.tracking_number} received successfully`,
      };
    }

    // Try SKU
    const [item] = await this.sql`SELECT * FROM inventory WHERE sku = ${params.scannedBarcode}`;
    if (item) {
      await this.logAction("receive_item", "completed", { type: "sku", sku: params.scannedBarcode });
      return {
        type: "sku", id: item.sku,
        name: item.name || item.sku,
        status: "ok",
        message: `🏷️ SKU ${item.sku}: ${item.name} — ${item.quantity || 0} units in stock at ${item.warehouse_id || "Main"}`,
      };
    }

    return {
      type: "sku", id: params.scannedBarcode, name: "Unknown",
      status: "not_found",
      message: `❌ Barcode "${params.scannedBarcode}" not found. Is this a new shipment? Create it first in Shipments.`,
    };
  }

  async checkSku(barcode: string): Promise<{
    sku: string; name: string; qty: number;
    warehouse: string; location: string;
    lastMovement: string; reorderPoint: number; needsReorder: boolean;
  }> {
    const [item] = await this.sql`SELECT * FROM inventory WHERE sku = ${barcode}`;
    if (!item) return { sku: barcode, name: "Not found", qty: 0, warehouse: "", location: "", lastMovement: "", reorderPoint: 0, needsReorder: false };

    const [lastMove] = await this.sql`SELECT * FROM inventory_movements WHERE sku = ${barcode} ORDER BY created_at DESC LIMIT 1`;

    return {
      sku: item.sku,
      name: item.name || "",
      qty: item.quantity || 0,
      warehouse: item.warehouse_id || "Main",
      location: item.location || item.warehouse_id || "N/A",
      lastMovement: lastMove?.created_at?.toISOString() || "Never",
      reorderPoint: item.reorder_point || 0,
      needsReorder: (item.quantity || 0) <= (item.reorder_point || 0),
    };
  }

  async generateLabel(params: {
    type: "shipment" | "sku";
    id: string;
    labelSize?: "small" | "medium" | "large";
  }): Promise<{ labelId: string; labelUrl: string; data: string; format: "code128" | "qr" }> {
    const labelId = crypto.randomUUID();
    let data = params.id;

    if (params.type === "shipment") {
      const [shipment] = await this.sql`SELECT * FROM shipments WHERE id = ${params.id} OR tracking_number = ${params.id}`;
      if (shipment) {
        data = JSON.stringify({
          tracking: shipment.tracking_number,
          carrier: shipment.carrier,
          origin: shipment.origin,
          destination: shipment.destination,
          customer: shipment.customer_name,
        });
      }
    } else {
      const [item] = await this.sql`SELECT * FROM inventory WHERE sku = ${params.id}`;
      if (item) {
        data = JSON.stringify({ sku: item.sku, name: item.name, qty: item.quantity });
      }
    }

    // In production, generate actual barcode image. Here return the data that client-side lib (JsBarcode/QRCode.js) uses
    return {
      labelId,
      labelUrl: `/api/labels/${labelId}`,
      data,
      format: params.type === "shipment" ? "code128" : "qr",
    };
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new ScannerMCP();
const server = new Server({ name: "lanework-scanner", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "verify_pick", description: "Scan barcode to verify pick list item", inputSchema: { type: "object", properties: { orderId: { type: "string" }, scannedSku: { type: "string" }, scannedQty: { type: "number" }, location: { type: "string" }, scannedBy: { type: "string" } }, required: ["orderId", "scannedSku", "scannedQty", "location", "scannedBy"] } },
    { name: "receive_item", description: "Scan barcode to receive shipment or check SKU", inputSchema: { type: "object", properties: { scannedBarcode: { type: "string" }, receivedBy: { type: "string" }, location: { type: "string" } }, required: ["scannedBarcode", "receivedBy"] } },
    { name: "check_sku", description: "Quick SKU lookup by barcode", inputSchema: { type: "object", properties: { barcode: { type: "string" } }, required: ["barcode"] } },
    { name: "generate_label", description: "Generate barcode/label for shipment or SKU", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["shipment", "sku"] }, id: { type: "string" }, labelSize: { type: "string", enum: ["small", "medium", "large"] } }, required: ["type", "id"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "verify_pick": return { content: [{ type: "text", text: JSON.stringify(await mcp.verifyPick(args as any), null, 2) }] };
      case "receive_item": return { content: [{ type: "text", text: JSON.stringify(await mcp.receiveItem(args as any), null, 2) }] };
      case "check_sku": return { content: [{ type: "text", text: JSON.stringify(await mcp.checkSku(args.barcode as string), null, 2) }] };
      case "generate_label": return { content: [{ type: "text", text: JSON.stringify(await mcp.generateLabel(args as any), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[ScannerMCP] Ready — 4 tools available");
