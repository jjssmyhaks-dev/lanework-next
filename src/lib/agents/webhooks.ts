/**
 * Webhook Handlers — process incoming webhooks from external services
 * and emit appropriate agent events.
 */

import { emitEvent, type AgentEventType } from "./events";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "webhooks" });

// ── Shiprocket Webhook ──

export async function handleShiprocketWebhook(body: Record<string, unknown>): Promise<void> {
  const currentStatus = body.current_status as string;
  const awb = body.awb as string;
  const order = body.order_id as string;

  log.info({ awb, order, status: currentStatus }, "Shiprocket webhook received");

  if (!awb && !order) {
    log.warn("Shiprocket webhook missing AWB/order ID");
    return;
  }

  // Map status to event type
  const statusMap: Record<string, AgentEventType> = {
    "delivered": "delivery.completed",
    "rto": "shipment.exception",
    "returned": "shipment.exception",
    "exception": "shipment.exception",
    "in_transit": "shipment.delayed",
    "pending": "shipment.created",
    "out_for_delivery": "shipment.created",
  };

  const eventType = statusMap[currentStatus?.toLowerCase() || ""] || "shipment.created";

  await emitEvent(eventType, {
    trackingNumber: awb,
    orderId: order,
    status: currentStatus,
    carrier: "shiprocket",
    location: body.current_location,
    estimatedDelivery: body.estimated_delivery,
    scans: body.scans,
  }, {
    source: "webhook",
    entityType: "shipment",
    entityId: awb || order,
  });
}

// ── Shopify Webhook ──

export async function handleShopifyWebhook(
  topic: string,
  body: Record<string, unknown>
): Promise<void> {
  log.info({ topic, orderId: body.id }, "Shopify webhook received");

  if (topic === "orders/create") {
    const order = body as Record<string, unknown>;
    const lineItems = order.line_items as Array<Record<string, unknown>> | undefined;
    const customer = order.customer as Record<string, unknown> | undefined;

    await emitEvent("order.new", {
      orderId: String(order.id),
      orderNumber: order.order_number,
      customerName: `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim(),
      totalAmount: order.total_price,
      currency: order.currency,
      shippingAddress: order.shipping_address,
      itemCount: lineItems?.length || 0,
      platform: "shopify",
    }, {
      source: "webhook",
      entityType: "order",
      entityId: String(order.id),
    });
  }

  if (topic === "orders/fulfilled") {
    const fulfillments = body.fulfillments as Array<Record<string, unknown>> | undefined;
    await emitEvent("delivery.completed", {
      orderId: String(body.id),
      trackingNumber: fulfillments?.[0]?.tracking_number,
      platform: "shopify",
    }, {
      source: "webhook",
      entityType: "order",
      entityId: String(body.id),
    });
  }

  if (topic === "orders/cancelled") {
    await emitEvent("order.cancelled", {
      orderId: String(body.id),
      cancelReason: body.cancel_reason,
      platform: "shopify",
    }, {
      source: "webhook",
      entityType: "order",
      entityId: String(body.id),
    });
  }
}

// ── FedEx Webhook ──

export async function handleFedexWebhook(body: Record<string, unknown>): Promise<void> {
  const trackingNumber = body.trackingNumber || body.tracking_number;
  const scanEvent = body.scanEvent as Record<string, unknown> | undefined;
  const status = body.status || scanEvent?.eventType;

  log.info({ trackingNumber, status }, "FedEx webhook received");

  if (!trackingNumber) {
    log.warn("FedEx webhook missing tracking number");
    return;
  }

  const statusMap: Record<string, AgentEventType> = {
    "DL": "delivery.completed",     // Delivered
    "DE": "shipment.exception",     // Exception
    "SE": "shipment.delayed",       // Shipment Exception
    "IT": "shipment.created",       // In Transit
    "OD": "shipment.created",       // Out for Delivery
  };

  const eventType = statusMap[status as string] || "shipment.created";

  await emitEvent(eventType, {
    trackingNumber,
    status,
    carrier: "fedex",
    location: scanEvent?.scanLocation,
    timestamp: scanEvent?.date,
  }, {
    source: "webhook",
    entityType: "shipment",
    entityId: trackingNumber as string,
  });
}

// ── Generic Webhook Router ──

export async function routeWebhook(
  provider: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<void> {
  switch (provider) {
    case "shiprocket":
      await handleShiprocketWebhook(body);
      break;
    case "shopify":
      await handleShopifyWebhook(headers["x-shopify-topic"] || "", body);
      break;
    case "fedex":
      await handleFedexWebhook(body);
      break;
    default:
      log.warn({ provider }, "Unknown webhook provider");
  }
}
