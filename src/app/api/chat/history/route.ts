import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

const sql = neon(process.env.DATABASE_URL!);

// ── Ensure table exists ──
async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tool_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created
    ON chat_messages (user_id, created_at DESC)`;
}

const chatMessageSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string().max(10000),
    timestamp: z.string().optional(),
    toolResult: z.object({
      type: z.string(),
      data: z.record(z.string(), z.unknown()),
    }).nullable().optional(),
  })).max(50),
});

/**
 * GET /api/chat/history
 * Fetch the last N chat messages for the authenticated user.
 */
export const GET = withAuth(async (request, user) => {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const rows = await sql`
      SELECT id, role, content, tool_result, created_at
      FROM chat_messages
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const messages = rows.reverse().map((r: any) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      timestamp: r.created_at?.toISOString?.() || r.created_at,
      toolResult: r.tool_result || null,
    }));

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

/**
 * POST /api/chat/history
 * Save chat messages for the authenticated user.
 * Replaces all existing messages for this user (full sync).
 */
export const POST = withAuth(async (request, user) => {
  try {
    await ensureTable();
    const validation = await validateBody(request, chatMessageSchema);
    if (!validation.success) return validation.error;
    const { messages } = validation.data;

    const userId = user.id;

    // Delete old messages for this user, then insert new ones
    await sql`DELETE FROM chat_messages WHERE user_id = ${userId}`;

    for (const msg of messages) {
      await sql`
        INSERT INTO chat_messages (id, user_id, role, content, tool_result, created_at)
        VALUES (
          ${msg.id},
          ${userId},
          ${msg.role},
          ${msg.content},
          ${msg.toolResult ? JSON.stringify(msg.toolResult) : null}::jsonb,
          ${msg.timestamp ? new Date(msg.timestamp) : new Date()}
        )
      `;
    }

    return NextResponse.json({ success: true, saved: messages.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

/**
 * DELETE /api/chat/history
 * Clear chat history for the authenticated user.
 */
export const DELETE = withAuth(async (request, user) => {
  try {
    await ensureTable();
    await sql`DELETE FROM chat_messages WHERE user_id = ${user.id}`;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
