import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createCustomerSchema, validateBody } from "@/lib/validations";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async () => {
  try {
    const customers = await sql`
      SELECT * FROM customers ORDER BY created_at DESC
    `;

    return NextResponse.json(customers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    const validation = await validateBody(request, createCustomerSchema);
    if (!validation.success) return validation.error;
    const { name, customerName, email, phone, status } = validation.data;

    const customerNameVal = name || customerName!;

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
});
