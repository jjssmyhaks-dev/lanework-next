import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";

    const items = await sql`
      SELECT * FROM inventory WHERE user_id = ${userId} ORDER BY created_at DESC
    `;

    return NextResponse.json(items);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sku, name, quantity, reorderPoint, warehouse, location, userId } = body;

    if (!sku || !name || quantity === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: sku, name, quantity" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const user_id = userId || "default";

    await sql`
      INSERT INTO inventory (id, user_id, sku, name, quantity, reorder_point, warehouse, location)
      VALUES (${id}, ${user_id}, ${sku}, ${name}, ${quantity}, ${reorderPoint ?? 0}, ${warehouse || null}, ${location || null})
    `;

    const [item] = await sql`
      SELECT * FROM inventory WHERE id = ${id}
    `;

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
