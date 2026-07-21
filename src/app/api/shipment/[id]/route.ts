import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [shipment] = await sql`SELECT * FROM shipments WHERE id = ${id}`;
    if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(shipment);
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
  try {
    const body = await request.json();
    const { trackingNumber, carrier, origin, destination, eta, status } = body;
    const [existing] = await sql`SELECT * FROM shipments WHERE id = ${id}`;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [updated] = await sql`
      UPDATE shipments SET
        tracking_number = ${trackingNumber ?? existing.tracking_number},
        carrier = ${carrier ?? existing.carrier}, origin = ${origin ?? existing.origin},
        destination = ${destination ?? existing.destination}, eta = ${eta ?? existing.eta},
        status = ${status ?? existing.status}, updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await sql`DELETE FROM shipments WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
