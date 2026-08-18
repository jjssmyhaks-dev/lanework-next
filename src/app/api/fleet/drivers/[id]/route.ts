import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withAuth(async (_request, _user, ctx) => {
  const { id } = await (ctx!.params! as any);
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const [driver] = await sql`SELECT * FROM fleet_drivers WHERE id = ${id}`;
    if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(driver);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, _user, ctx) => {
  const { id } = await (ctx!.params! as any);
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = await request.json();
    const { name, license, status, hoursDriven, maxHours, assignedVehicle } = body;
    const [existing] = await sql`SELECT * FROM fleet_drivers WHERE id = ${id}`;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [updated] = await sql`
      UPDATE fleet_drivers SET
        name = ${name ?? existing.name},
        license = ${license ?? existing.license},
        status = ${status ?? existing.status},
        hours_driven = ${hoursDriven ?? existing.hours_driven},
        max_hours = ${maxHours ?? existing.max_hours},
        assigned_vehicle = ${assignedVehicle ?? existing.assigned_vehicle},
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (_request, _user, ctx) => {
  const { id } = await (ctx!.params! as any);
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await sql`DELETE FROM fleet_drivers WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
