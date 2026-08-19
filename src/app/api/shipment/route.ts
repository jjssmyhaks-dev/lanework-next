import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createShipmentSchema, validateBody } from "@/lib/validations";
import { parsePagination, paginate } from "@/lib/pagination";
import { auditLog, extractRequestMeta } from "@/lib/audit";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);

/** Extract a plain string address from a jsonb origin/destination cell */
function addressString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return String(obj.address || obj.city || obj.name || "") || JSON.stringify(val);
  }
  return String(val);
}

/** Map a DB row to the shape the UI expects (string origin/destination, eta alias) */
function toApiShape(row: Record<string, unknown>) {
  return {
    ...row,
    origin: addressString(row.origin),
    destination: addressString(row.destination),
    eta: row.estimated_delivery || null,
  };
}

export const GET = withAuth(async (request) => {
  try {
    const { limit, offset, page } = parsePagination(request);
    const shipments = await sql`
      SELECT * FROM shipments ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const [countResult] = await sql`SELECT COUNT(*)::int AS count FROM shipments`;

    return NextResponse.json(paginate(shipments.map(toApiShape), countResult?.count || 0, { limit, offset, page }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const validation = await validateBody(request, createShipmentSchema);
    if (!validation.success) return validation.error;
    const {
      trackingNumber,
      tracking_number,
      carrier,
      origin,
      destination,
      eta,
      estimatedDelivery,
      estimated_delivery,
      status,
      customerName,
      customer_name,
      customerPhone,
      customer_phone,
    } = validation.data;

    const tn = tracking_number || trackingNumber!;

    const id = crypto.randomUUID();
    const etaVal = estimated_delivery || estimatedDelivery || eta || null;

    await sql`
      INSERT INTO shipments (id, tracking_number, carrier, status, origin, destination, estimated_delivery, customer_name, customer_phone)
      VALUES (
        ${id},
        ${tn},
        ${carrier},
        ${status || "pending"},
        ${JSON.stringify({ address: origin })}::jsonb,
        ${JSON.stringify({ address: destination })}::jsonb,
        ${etaVal || null},
        ${customer_name || customerName || null},
        ${customer_phone || customerPhone || null}
      )
    `;

    const [shipment] = await sql`
      SELECT * FROM shipments WHERE id = ${id}
    `;

    logger.info("Shipment created", { id, trackingNumber: tn, carrier, userId: user.id });

    // Audit log (best-effort, non-blocking)
    auditLog({
      userId: user.id,
      action: "create",
      entityType: "shipment",
      entityId: id,
      newValues: { trackingNumber: tn, carrier, status: status || "pending", origin, destination },
      ...extractRequestMeta(request),
    });

    return NextResponse.json(toApiShape(shipment), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    logger.error("Shipment creation failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
