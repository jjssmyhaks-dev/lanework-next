import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toApiShape(row: Record<string, unknown>) {
  const constraints = (row.constraints || {}) as Record<string, unknown>;
  return {
    ...row,
    origin: constraints.origin || "",
    destination: constraints.destination || "",
    stops: row.total_stops ?? 0,
    distance_km: row.total_distance_km ?? 0,
    estimated_minutes: row.total_duration_minutes ?? 0,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const [route] = await sql`SELECT * FROM routes WHERE id = ${id}`;
    if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toApiShape(route));
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
    const { name, origin, destination, stops, distanceKm, estimatedMinutes, status, distance_km, estimated_minutes } = body;
    const [existing] = await sql`SELECT * FROM routes WHERE id = ${id}`;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const constraints = { ...((existing.constraints || {}) as Record<string, unknown>) };
    if (origin != null) constraints.origin = origin;
    if (destination != null) constraints.destination = destination;

    const [updated] = await sql`
      UPDATE routes SET
        name = ${name ?? existing.name},
        status = ${status ?? existing.status},
        total_distance_km = ${distanceKm ?? distance_km ?? existing.total_distance_km},
        total_duration_minutes = ${estimatedMinutes ?? estimated_minutes ?? existing.total_duration_minutes},
        total_stops = ${stops ?? existing.total_stops},
        constraints = ${JSON.stringify(constraints)}::jsonb,
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
    await sql`DELETE FROM routes WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
