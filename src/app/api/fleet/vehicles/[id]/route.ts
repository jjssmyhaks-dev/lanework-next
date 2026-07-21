import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [vehicle] = await sql`SELECT * FROM vehicles WHERE id = ${id}`;
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(vehicle);
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
    const { plate, type, status, mileageKm } = body;
    const [existing] = await sql`SELECT * FROM vehicles WHERE id = ${id}`;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [updated] = await sql`
      UPDATE vehicles SET
        plate = ${plate ?? existing.plate}, type = ${type ?? existing.type},
        status = ${status ?? existing.status}, mileage_km = ${mileageKm ?? existing.mileage_km},
        updated_at = NOW()
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
    await sql`DELETE FROM vehicles WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
