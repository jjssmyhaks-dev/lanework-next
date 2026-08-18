import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (_request, _user, ctx) => {
  const { id } = await (ctx!.params! as any);
  try {
    const [item] = await sql`SELECT * FROM inventory WHERE id = ${id}`;
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, _user, ctx) => {
  const { id } = await (ctx!.params! as any);
  try {
    const body = await request.json();
    const { sku, name, quantity, reorderPoint, warehouse, location } = body;
    const [existing] = await sql`SELECT * FROM inventory WHERE id = ${id}`;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [updated] = await sql`
      UPDATE inventory SET
        sku = ${sku ?? existing.sku}, name = ${name ?? existing.name},
        quantity = ${quantity ?? existing.quantity}, reorder_point = ${reorderPoint ?? existing.reorder_point},
        warehouse = ${warehouse ?? existing.warehouse}, location = ${location ?? existing.location},
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
  try {
    await sql`DELETE FROM inventory WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
