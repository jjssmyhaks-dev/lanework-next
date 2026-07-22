import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";

    const shipments = await sql`
      SELECT * FROM shipments ORDER BY created_at DESC
    `;

    return NextResponse.json(shipments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trackingNumber, carrier, origin, destination, eta, userId } = body;

    if (!trackingNumber || !carrier || !origin || !destination) {
      return NextResponse.json(
        { error: "Missing required fields: trackingNumber, carrier, origin, destination" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const user_id = userId || "default";

    await sql`
      INSERT INTO shipments (id, tracking_number, carrier, origin, destination, eta)
      VALUES (${id}, ${trackingNumber}, ${carrier}, ${origin}, ${destination}, ${eta || null})
    `;

    const [shipment] = await sql`
      SELECT * FROM shipments WHERE id = ${id}
    `;

    return NextResponse.json(shipment, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
