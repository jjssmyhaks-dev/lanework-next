import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";

    const customers = await sql`
      SELECT * FROM customers ORDER BY created_at DESC
    `;

    return NextResponse.json(customers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, channel, status, userId } = body;

    if (!customerName) {
      return NextResponse.json(
        { error: "Missing required field: customerName" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const user_id = userId || "default";

    await sql`
      INSERT INTO customers (id, customer_name, channel, status)
      VALUES (${id}, ${customerName}, ${channel || null}, ${status || "active"})
    `;

    const [customer] = await sql`
      SELECT * FROM customers WHERE id = ${id}
    `;

    return NextResponse.json(customer, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
