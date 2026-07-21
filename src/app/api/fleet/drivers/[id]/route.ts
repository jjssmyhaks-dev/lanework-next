import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [driver] = await sql`SELECT * FROM drivers WHERE id = ${id}`;
    if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(driver);
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
    const { name, license, status, hoursDriven, maxHours, assignedVehicle } = body;
    const [existing] = await sql`SELECT * FROM drivers WHERE id = ${id}`;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [updated] = await sql`
      UPDATE drivers SET
        name = ${name ?? existing.name}, license = ${license ?? existing.license},
        status = ${status ?? existing.status}, hours_driven = ${hoursDriven ?? existing.hours_driven},
        max_hours = ${maxHours ?? existing.max_hours}, assigned_vehicle = ${assignedVehicle ?? existing.assigned_vehicle},
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
    await sql`DELETE FROM drivers WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
