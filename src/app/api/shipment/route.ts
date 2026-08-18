import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const shipments = await sql`
      SELECT * FROM shipments ORDER BY created_at DESC
    `;

    return NextResponse.json(shipments.map(toApiShape));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    } = body;

    const tn = tracking_number || trackingNumber;
    if (!tn || !carrier || !origin || !destination) {
      return NextResponse.json(
        { error: "Missing required fields: tracking_number, carrier, origin, destination" },
        { status: 400 }
      );
    }

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

    return NextResponse.json(toApiShape(shipment), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
