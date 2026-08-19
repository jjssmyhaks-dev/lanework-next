import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createInventorySchema, validateBody } from "@/lib/validations";
import { parsePagination, paginate } from "@/lib/pagination";
import { auditLog, extractRequestMeta } from "@/lib/audit";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";
    const { limit, offset, page } = parsePagination(request);

    const items = await sql`
      SELECT * FROM inventory WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const [countResult] = await sql`SELECT COUNT(*)::int AS count FROM inventory WHERE user_id = ${userId}`;

    return NextResponse.json(paginate(items, countResult?.count || 0, { limit, offset, page }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const validation = await validateBody(request, createInventorySchema);
    if (!validation.success) return validation.error;
    const { sku, name, quantity, reorderPoint, warehouse, location } = validation.data;

    const id = crypto.randomUUID();
    const user_id = user.id || "default";

    await sql`
      INSERT INTO inventory (id, user_id, sku, name, quantity, reorder_point, warehouse, location)
      VALUES (${id}, ${user_id}, ${sku}, ${name}, ${quantity}, ${reorderPoint ?? 0}, ${warehouse || null}, ${location || null})
    `;

    const [item] = await sql`
      SELECT * FROM inventory WHERE id = ${id}
    `;

    logger.info("Inventory item created", { id, sku, name, userId: user.id });
    auditLog({
      userId: user.id,
      action: "create",
      entityType: "inventory",
      entityId: id,
      newValues: { sku, name, quantity, warehouse },
      ...extractRequestMeta(request),
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    logger.error("Inventory creation failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
