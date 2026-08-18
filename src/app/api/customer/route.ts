import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
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
    const { name, customerName, email, phone, status } = body;

    const customerNameVal = name || customerName;
    if (!customerNameVal) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    await sql`
      INSERT INTO customers (id, name, email, phone, status)
      VALUES (${id}, ${customerNameVal}, ${email || null}, ${phone || null}, ${status || "active"})
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
