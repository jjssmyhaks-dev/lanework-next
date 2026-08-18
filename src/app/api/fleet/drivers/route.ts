import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";

    const drivers = await sql`
      SELECT * FROM fleet_drivers WHERE user_id = ${userId} ORDER BY created_at DESC
    `;

    return NextResponse.json(drivers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    const { name, license, status, hoursDriven, maxHours, assignedVehicle, userId } = body;

    if (!name || !license) {
      return NextResponse.json(
        { error: "Missing required fields: name, license" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const user_id = userId || "default";

    await sql`
      INSERT INTO fleet_drivers (id, user_id, name, license, status, hours_driven, max_hours, assigned_vehicle)
      VALUES (${id}, ${user_id}, ${name}, ${license}, ${status || "active"}, ${hoursDriven ?? 0}, ${maxHours ?? 8}, ${assignedVehicle || null})
    `;

    const [driver] = await sql`
      SELECT * FROM fleet_drivers WHERE id = ${id}
    `;

    return NextResponse.json(driver, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
