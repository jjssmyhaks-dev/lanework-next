import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function addressString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return String(obj.address || obj.city || obj.name || "") || JSON.stringify(val);
  }
  return String(val);
}

function toApiShape(row: Record<string, unknown>) {
  return {
    ...row,
    origin: addressString(row.origin),
    destination: addressString(row.destination),
    eta: row.estimated_delivery || null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const [shipment] = await sql`SELECT * FROM shipments WHERE id = ${id}`;
    if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toApiShape(shipment));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = await request.json();
    const { trackingNumber, tracking_number, carrier, origin, destination, eta, estimatedDelivery, estimated_delivery, status, customerName, customer_name, customerPhone, customer_phone } = body;
    const [existing] = await sql`SELECT * FROM shipments WHERE id = ${id}`;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const etaVal = estimated_delivery ?? estimatedDelivery ?? eta ?? existing.estimated_delivery;
    const originVal = origin != null ? JSON.stringify({ address: addressString(origin) }) : undefined;
    const destVal = destination != null ? JSON.stringify({ address: addressString(destination) }) : undefined;

    const [updated] = await sql`
      UPDATE shipments SET
        tracking_number = ${tracking_number ?? trackingNumber ?? existing.tracking_number},
        carrier = ${carrier ?? existing.carrier},
        status = ${status ?? existing.status},
        origin = ${originVal ?? existing.origin}::jsonb,
        destination = ${destVal ?? existing.destination}::jsonb,
        estimated_delivery = ${etaVal ?? existing.estimated_delivery},
        customer_name = ${customer_name ?? customerName ?? existing.customer_name},
        customer_phone = ${customer_phone ?? customerPhone ?? existing.customer_phone},
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    return NextResponse.json(toApiShape(updated));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await sql`DELETE FROM shipments WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
