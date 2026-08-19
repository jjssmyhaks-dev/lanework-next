import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createWarehouseSchema, validateBody } from "@/lib/validations";
import { parsePagination, paginate } from "@/lib/pagination";
import { auditLog, extractRequestMeta } from "@/lib/audit";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";
    const { limit, offset, page } = parsePagination(request);

    const tasks = await sql`
      SELECT * FROM warehouse WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    const [countResult] = await sql`SELECT COUNT(*)::int AS count FROM warehouse WHERE user_id = ${userId}`;

    return NextResponse.json(paginate(tasks, countResult?.count || 0, { limit, offset, page }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const validation = await validateBody(request, createWarehouseSchema);
    if (!validation.success) return validation.error;
    const { type, priority, assignedTo, dock, metadata } = validation.data;

    const id = crypto.randomUUID();
    const user_id = user.id;

    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    await sql`
      INSERT INTO warehouse (id, user_id, type, priority, assigned_to, dock, metadata)
      VALUES (${id}, ${user_id}, ${type}, ${priority || "medium"}, ${assignedTo || null}, ${dock || null}, ${metadataJson})
    `;

    const [task] = await sql`
      SELECT * FROM warehouse WHERE id = ${id}
    `;

    logger.info({ id, type, userId: user_id }, "Warehouse task created");
    auditLog({
      userId: user_id,
      action: "create",
      entityType: "warehouse_task",
      entityId: id,
      newValues: { type, priority, dock },
      ...extractRequestMeta(request),
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    logger.error({ error: message }, "Warehouse task creation failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
