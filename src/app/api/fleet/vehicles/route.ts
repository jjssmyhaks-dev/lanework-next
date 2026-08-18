import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";

    const vehicles = await sql`
      SELECT * FROM fleet_vehicles WHERE user_id = ${userId} ORDER BY created_at DESC
    `;

    return NextResponse.json(vehicles);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    const { plate, type, status, mileageKm, userId } = body;

    if (!plate || !type) {
      return NextResponse.json(
        { error: "Missing required fields: plate, type" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const user_id = userId || "default";

    await sql`
      INSERT INTO fleet_vehicles (id, user_id, plate, type, status, mileage_km)
      VALUES (${id}, ${user_id}, ${plate}, ${type}, ${status || "active"}, ${mileageKm ?? 0})
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
