/**
 * Shopify & WooCommerce MCP Server
 * Pull D2C orders, sync inventory, trigger fulfillment for Indian sellers
 *
 * Tools:
 * - sync_orders_shopify: Pull recent orders from Shopify → Lanework DB
 * - sync_orders_woo: Pull recent orders from WooCommerce → Lanework DB
 * - sync_inventory: Push Lanework inventory → Shopify/WooCommerce
 * - get_order_status: Check order fulfillment status
 *
 * ENV: SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN, WOO_STORE_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class ShopifyMCP extends LaneworkMCPServer {
  private shopifyUrl: string = "";
  private shopifyToken: string = "";
  private wooUrl: string = "";
  private wooKey: string = "";
  private wooSecret: string = "";

  constructor() { super("inventory-management"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.shopifyUrl = process.env.SHOPIFY_STORE_URL || this.config.SHOPIFY_STORE_URL || "";
    this.shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN || this.config.SHOPIFY_ACCESS_TOKEN || "";
    this.wooUrl = process.env.WOO_STORE_URL || this.config.WOO_STORE_URL || "";
    this.wooKey = process.env.WOO_CONSUMER_KEY || this.config.WOO_CONSUMER_KEY || "";
    this.wooSecret = process.env.WOO_CONSUMER_SECRET || this.config.WOO_CONSUMER_SECRET || "";
  }

  /** ─── SHOPIFY ─── */
  private async shopifyReq(path: string): Promise<any> {
    const url = `https://${this.shopifyUrl}/admin/api/2024-01${path}`;
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": this.shopifyToken, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
    return res.json();
  }

  /** ─── WOOCOMMERCE ─── */
  private async woocommerceReq(path: string): Promise<any> {
    const url = `${this.wooUrl}/wp-json/wc/v3${path}`;
    const auth = Buffer.from(`${this.wooKey}:${this.wooSecret}`).toString("base64");
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
    return res.json();
  }

  /** ─── TOOLS ─── */

  async syncOrdersShopify(limit: number = 50): Promise<{ synced: number; platform: string }> {
    if (!this.shopifyUrl || !this.shopifyToken) {
      return { synced: 0, platform: "shopify_skipped" };
    }
    await this.logAction("sync_orders_shopify", "started", { limit });

    const data = await this.shopifyReq(`/orders.json?limit=${limit}&status=any&financial_status=paid`);
    const orders = data.orders || [];

    for (const order of orders) {
      const items = (order.line_items || []).map((li: any) => ({
        sku: li.sku || li.product_id?.toString() || "",
        name: li.name || li.title || "",
        qty: li.quantity || 1,
      }));

      await this.sql`
        INSERT INTO orders (id, order_number, customer_name, status, total_amount, items, platform, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${order.order_number?.toString() || order.name || ""},
          ${(order.customer?.first_name || "") + " " + (order.customer?.last_name || "")},
          ${order.fulfillment_status || "unfulfilled"}, ${order.total_price || 0},
          ${JSON.stringify(items)}, 'shopify', NOW(), NOW())
        ON CONFLICT (order_number) DO UPDATE SET status = ${order.fulfillment_status || "unfulfilled"}, updated_at = NOW()
      `;

      // Upsert customer
      if (order.customer?.email) {
        await this.sql`
          INSERT INTO customers (id, name, email, phone, code, created_at, updated_at)
          VALUES (${crypto.randomUUID()},
            ${(order.customer.first_name || "") + " " + (order.customer.last_name || "")},
            ${order.customer.email || ""}, ${order.customer.phone || ""},
            ${order.customer.id?.toString() || ""}, NOW(), NOW())
          ON CONFLICT (code) DO UPDATE SET name = ${(order.customer.first_name || "") + " " + (order.customer.last_name || "")}, updated_at = NOW()
        `;
      }
    }

    await this.logAction("sync_orders_shopify", "completed", { synced: orders.length });
    return { synced: orders.length, platform: "shopify" };
  }

  async syncOrdersWooCommerce(limit: number = 50): Promise<{ synced: number; platform: string }> {
    if (!this.wooUrl || !this.wooKey || !this.wooSecret) {
      return { synced: 0, platform: "woocommerce_skipped" };
    }
    await this.logAction("sync_orders_woocommerce", "started", { limit });

    const orders = await this.woocommerceReq(`/orders?per_page=${limit}&status=processing,pending`);

    for (const order of orders) {
      const items = (order.line_items || []).map((li: any) => ({
        sku: li.sku || li.product_id?.toString() || "",
        name: li.name || "",
        qty: li.quantity || 1,
      }));

      await this.sql`
        INSERT INTO orders (id, order_number, customer_name, status, total_amount, items, platform, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${order.number?.toString() || order.id?.toString() || ""},
          ${(order.billing?.first_name || "") + " " + (order.billing?.last_name || "")},
          ${order.status || "processing"}, ${order.total || 0},
          ${JSON.stringify(items)}, 'woocommerce', NOW(), NOW())
        ON CONFLICT (order_number) DO UPDATE SET status = ${order.status || "processing"}, updated_at = NOW()
      `;
    }

    await this.logAction("sync_orders_woocommerce", "completed", { synced: orders.length });
    return { synced: orders.length, platform: "woocommerce" };
  }

  async syncInventory(): Promise<{ synced: number; updated: number }> {
    await this.logAction("sync_inventory", "started", {});
    const items = await this.sql`SELECT * FROM inventory WHERE quantity IS NOT NULL`;
    let synced = 0;

    // Push to Shopify
    if (this.shopifyUrl && this.shopifyToken) {
      for (const item of items) {
        try {
          const products = await this.shopifyReq(`/products.json?sku=${item.sku}`);
          if (products.products?.length > 0) {
            const product = products.products[0];
            const variant = product.variants?.find((v: any) => v.sku === item.sku);
            if (variant) {
              await fetch(`https://${this.shopifyUrl}/admin/api/2024-01/inventory_levels/set.json`, {
                method: "POST",
                headers: { "X-Shopify-Access-Token": this.shopifyToken, "Content-Type": "application/json" },
                body: JSON.stringify({
                  inventory_item_id: variant.inventory_item_id,
                  location_id: variant.inventory_management?.split(":")[2] || "",
                  available: item.quantity,
                }),
              });
            }
          }
          synced++;
        } catch {}
      }
    }

    // Push to WooCommerce
    if (this.wooUrl && this.wooKey) {
      for (const item of items) {
        try {
          const products = await this.woocommerceReq(`/products?sku=${item.sku}`);
          if (products.length > 0) {
            await fetch(`${this.wooUrl}/wp-json/wc/v3/products/${products[0].id}`, {
              method: "PUT",
              headers: {
                Authorization: `Basic ${Buffer.from(`${this.wooKey}:${this.wooSecret}`).toString("base64")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ stock_quantity: item.quantity, stock_status: item.quantity > 0 ? "instock" : "outofstock" }),
            });
          }
          synced++;
        } catch {}
      }
    }

    await this.logAction("sync_inventory", "completed", { synced });
    return { synced, updated: synced };
  }

  async getOrderStatus(orderNumber: string): Promise<{ orderNumber: string; status: string; platform: string; trackingNumber?: string }> {
    const [order] = await this.sql`SELECT * FROM orders WHERE order_number = ${orderNumber}`;
    if (!order) return { orderNumber, status: "not_found", platform: "unknown" };

    // Check Shiprocket for tracking
    let trackingNumber: string | undefined;
    try {
      const [shipment] = await this.sql`SELECT * FROM shipments WHERE tracking_number IN (
        SELECT items::jsonb->0->>'sku' FROM orders WHERE order_number = ${orderNumber}
      )`;
      trackingNumber = shipment?.tracking_number;
    } catch {}

    return {
      orderNumber, status: order.status || "unknown", platform: order.platform || "unknown",
      trackingNumber,
    };
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new ShopifyMCP();
const server = new Server({ name: "lanework-shopify-woo", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "sync_orders_shopify", description: "Pull recent orders from Shopify → Lanework", inputSchema: { type: "object", properties: { limit: { type: "number" } }, required: [] } },
    { name: "sync_orders_woo", description: "Pull recent orders from WooCommerce → Lanework", inputSchema: { type: "object", properties: { limit: { type: "number" } }, required: [] } },
    { name: "sync_inventory", description: "Push Lanework inventory levels to Shopify + WooCommerce", inputSchema: { type: "object", properties: {}, required: [] } },
    { name: "get_order_status", description: "Check order fulfillment status", inputSchema: { type: "object", properties: { orderNumber: { type: "string" } }, required: ["orderNumber"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "sync_orders_shopify": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncOrdersShopify((args.limit as number) || 50), null, 2) }] };
      case "sync_orders_woo": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncOrdersWooCommerce((args.limit as number) || 50), null, 2) }] };
      case "sync_inventory": return { content: [{ type: "text", text: JSON.stringify(await mcp.syncInventory(), null, 2) }] };
      case "get_order_status": return { content: [{ type: "text", text: JSON.stringify(await mcp.getOrderStatus(args.orderNumber as string), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[ShopifyMCPS] Ready — 4 tools available");
