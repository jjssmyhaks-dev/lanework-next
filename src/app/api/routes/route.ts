import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createRouteSchema, validateBody } from "@/lib/validations";
import { parsePagination, paginate } from "@/lib/pagination";

const sql = neon(process.env.DATABASE_URL!);

/** Map a DB row to the UI shape (origin/destination/stops/distance_km/estimated_minutes) */
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

export const GET = withAuth(async (request) => {
  try {
    const { limit, offset, page } = parsePagination(request);
    const routes = await sql`
      SELECT * FROM routes ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const [countResult] = await sql`SELECT COUNT(*)::int AS count FROM routes`;

    return NextResponse.json(paginate(routes.map(toApiShape), countResult?.count || 0, { limit, offset, page }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    const validation = await validateBody(request, createRouteSchema);
    if (!validation.success) return validation.error;
    const { name, origin, destination, stops, distanceKm, estimatedMinutes, status, distance_km, estimated_minutes, total_stops } = validation.data;

    const id = crypto.randomUUID();
    const distanceVal = distanceKm ?? distance_km ?? 0;
    const minutesVal = estimatedMinutes ?? estimated_minutes ?? 0;
    const stopsVal = stops ?? total_stops ?? 0;

    await sql`
      INSERT INTO routes (id, name, status, total_distance_km, total_duration_minutes, total_stops, constraints)
      VALUES (
        ${id},
        ${name},
        ${status || "active"},
        ${distanceVal},
        ${minutesVal},
        ${stopsVal},
        ${JSON.stringify({ origin: origin || "", destination: destination || "" })}::jsonb
      )
    `;

    const [route] = await sql`
      SELECT * FROM routes WHERE id = ${id}
    `;

    return NextResponse.json(toApiShape(route), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
