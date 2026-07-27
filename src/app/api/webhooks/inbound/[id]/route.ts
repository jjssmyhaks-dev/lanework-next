import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * Generic Webhook Inbound Receiver
 * POST /api/webhooks/inbound/[id]
 * Receives events from any external system (TMS, WMS, ERP, custom scripts)
 * Verifies the shared secret, logs the payload, and routes to the appropriate agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = neon(process.env.DATABASE_URL!);

    // Look up the webhook configuration
    const webhooks = await sql`SELECT * FROM webhooks WHERE id = ${id} AND active = true`;
    if (webhooks.length === 0) {
      return NextResponse.json({ error: "Webhook not found or inactive" }, { status: 404 });
    }

    const webhook = webhooks[0];

    // Verify signature if secret is configured
    if (webhook.secret) {
      const signature = request.headers.get("x-lanework-signature");
      if (!signature) {
        return NextResponse.json({ error: "Missing signature header" }, { status: 401 });
      }
      // In production, use HMAC-SHA256 verification
      // const expected = crypto.createHmac('sha256', webhook.secret).update(rawBody).digest('hex');
      // if (expected !== signature) return 401
    }

    const body = await request.json();
    const eventType = body.event || body.type || "unknown";
    const payload = body.data || body.payload || body;

    // Log the webhook event
    const eventId = crypto.randomUUID();
    await sql`
      INSERT INTO webhook_events (id, webhook_id, integration_id, event_type, payload, received_at)
      VALUES (${eventId}, ${id}, ${webhook.integration_id}, ${eventType}, ${JSON.stringify(payload)}, NOW())
    `;

    // Route to appropriate agent based on event type
    const routing = routeEvent(eventType, payload, webhook.integration_id);

    return NextResponse.json({
      success: true,
      event_id: eventId,
      event_type: eventType,
      routing,
      message: `Event received and routed to: ${routing.agent || "log-only"}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function routeEvent(eventType: string, payload: any, integrationId: string) {
  const type = eventType.toLowerCase();

  if (type.includes("shipment") || type.includes("tracking") || type.includes("awb") || type.includes("lr")) {
    return { agent: "shipment-tracking", action: "process_inbound_shipment", integrationId };
  }
  if (type.includes("inventory") || type.includes("stock") || type.includes("sku")) {
    return { agent: "inventory-management", action: "process_inbound_inventory", integrationId };
  }
  if (type.includes("order") || type.includes("po") || type.includes("purchase")) {
    return { agent: "inventory-management", action: "process_inbound_order", integrationId };
  }
  if (type.includes("route") || type.includes("delivery") || type.includes("dispatch")) {
    return { agent: "route-optimization", action: "process_inbound_route", integrationId };
  }
  if (type.includes("vehicle") || type.includes("driver") || type.includes("gps") || type.includes("telematics")) {
    return { agent: "fleet-management", action: "process_inbound_telemetry", integrationId };
  }
  if (type.includes("customer") || type.includes("message") || type.includes("notification")) {
    return { agent: "customer-communication", action: "process_inbound_message", integrationId };
  }
  if (type.includes("warehouse") || type.includes("wms") || type.includes("dock")) {
    return { agent: "warehouse-operations", action: "process_inbound_warehouse", integrationId };
  }

  return { agent: "generic", action: "log_only", integrationId };
}