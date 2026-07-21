import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [route] = await sql`SELECT * FROM routes WHERE id = ${id}`;
    if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(route);
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
    const { name, origin, destination, stops, distanceKm, estimatedMinutes, status } = body;
    const [existing] = await sql`SELECT * FROM routes WHERE id = ${id}`;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [updated] = await sql`
      UPDATE routes SET
        name = ${name ?? existing.name}, origin = ${origin ?? existing.origin},
        destination = ${destination ?? existing.destination},
        stops = ${stops ?? existing.stops}, distance_km = ${distanceKm ?? existing.distance_km},
        estimated_minutes = ${estimatedMinutes ?? existing.estimated_minutes},
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
    await sql`DELETE FROM routes WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
