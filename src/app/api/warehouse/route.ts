import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";

    const tasks = await sql`
      SELECT * FROM warehouse WHERE user_id = ${userId} ORDER BY created_at DESC
    `;

    return NextResponse.json(tasks);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    const { type, priority, assignedTo, dock, metadata, userId } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Missing required field: type" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const user_id = userId || "default";

    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    await sql`
      INSERT INTO warehouse (id, user_id, type, priority, assigned_to, dock, metadata)
      VALUES (${id}, ${user_id}, ${type}, ${priority || "medium"}, ${assignedTo || null}, ${dock || null}, ${metadataJson})
    `;

    const [task] = await sql`
      SELECT * FROM warehouse WHERE id = ${id}
    `;

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
