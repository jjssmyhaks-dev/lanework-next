import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createVehicleSchema, validateBody } from "@/lib/validations";
import { parsePagination, paginate } from "@/lib/pagination";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";
    const { limit, offset, page } = parsePagination(request);

    const vehicles = await sql`
      SELECT * FROM fleet_vehicles WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const [countResult] = await sql`SELECT COUNT(*)::int AS count FROM fleet_vehicles WHERE user_id = ${userId}`;

    return NextResponse.json(paginate(vehicles, countResult?.count || 0, { limit, offset, page }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const validation = await validateBody(request, createVehicleSchema);
    if (!validation.success) return validation.error;
    const { plate, type, status, mileageKm } = validation.data;

    const id = crypto.randomUUID();
    const userId = user.id;

    await sql`
      INSERT INTO fleet_vehicles (id, user_id, plate, type, status, mileage_km)
      VALUES (${id}, ${userId}, ${plate}, ${type}, ${status || "active"}, ${mileageKm ?? 0})
    `;

    const [vehicle] = await sql`
      SELECT * FROM fleet_vehicles WHERE id = ${id}
    `;

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
