import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createDriverSchema, validateBody } from "@/lib/validations";
import { parsePagination, paginate } from "@/lib/pagination";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";
    const { limit, offset, page } = parsePagination(request);

    const drivers = await sql`
      SELECT * FROM fleet_drivers WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const [countResult] = await sql`SELECT COUNT(*)::int AS count FROM fleet_drivers WHERE user_id = ${userId}`;

    return NextResponse.json(paginate(drivers, countResult?.count || 0, { limit, offset, page }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const validation = await validateBody(request, createDriverSchema);
    if (!validation.success) return validation.error;
    const { name, license, status, hoursDriven, maxHours, assignedVehicle } = validation.data;

    const id = crypto.randomUUID();
    const userId = user.id;

    await sql`
      INSERT INTO fleet_drivers (id, user_id, name, license, status, hours_driven, max_hours, assigned_vehicle)
      VALUES (${id}, ${userId}, ${name}, ${license}, ${status || "active"}, ${hoursDriven ?? 0}, ${maxHours ?? 8}, ${assignedVehicle || null})
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
