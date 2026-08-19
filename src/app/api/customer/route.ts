import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createCustomerSchema, validateBody } from "@/lib/validations";
import { parsePagination, paginate } from "@/lib/pagination";
import { auditLog, extractRequestMeta } from "@/lib/audit";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request) => {
  try {
    const { limit, offset, page } = parsePagination(request);
    const customers = await sql`
      SELECT * FROM customers ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const [countResult] = await sql`SELECT COUNT(*)::int AS count FROM customers`;

    return NextResponse.json(paginate(customers, countResult?.count || 0, { limit, offset, page }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
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

    logger.info({ id, name: customerNameVal, userId: user.id }, "Customer created");
    auditLog({
      userId: user.id,
      action: "create",
      entityType: "customer",
      entityId: id,
      newValues: { name: customerNameVal, email, phone },
      ...extractRequestMeta(request),
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    logger.error({ error: message }, "Customer creation failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
