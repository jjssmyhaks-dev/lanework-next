/**
 * POST /api/chat — Chat orchestrator endpoint.
 *
 * Receives { message, threadId? }, routes to MCP tools, returns
 * structured response with tool calls and mode indicators.
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { orchestrate } from "@/lib/chat/orchestrator";

const sql = neon(process.env.DATABASE_URL!);

// ── Ensure tables exist (idempotent) ──
async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT DEFAULT 'New conversation',
    status TEXT DEFAULT 'active',
    pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS chat_tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    integration TEXT NOT NULL,
    action TEXT NOT NULL,
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',
    mode TEXT DEFAULT 'simulated',
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id, updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_tool_calls_message ON chat_tool_calls(message_id)`;
}

export const POST = withAuth(async (request, user) => {
  try {
    // Rate limit: 20 messages/min per IP (stricter than integrations, looser than AI)
    const rl = rateLimit(request, { maxRequests: 20, windowMs: 60_000, group: "chat" });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    await ensureTables();

    const body = await request.json();
    const { message, threadId } = body as { message: string; threadId?: string };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 });
    }

    const userId = user.id;

    // ── Get or create thread ──
    let activeThreadId = threadId;
    if (!activeThreadId) {
      // Find most recent active thread
      const [existing] = await sql`
        SELECT id FROM chat_threads
        WHERE user_id = ${userId} AND status = 'active'
        ORDER BY updated_at DESC LIMIT 1
      `;
      activeThreadId = existing?.id;
    }

    if (!activeThreadId) {
      // Create new thread — auto-title from first message
      const title = message.slice(0, 80) + (message.length > 80 ? "..." : "");
      const [newThread] = await sql`
        INSERT INTO chat_threads (id, user_id, title, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}, ${title}, NOW(), NOW())
        RETURNING id
      `;
      activeThreadId = newThread.id;
    }

    // ── Save user message ──
    const userMsgId = crypto.randomUUID();
    await sql`
      INSERT INTO chat_messages (id, thread_id, role, content, created_at)
      VALUES (${userMsgId}, ${activeThreadId}, 'user', ${message}, NOW())
    `;

    // ── Run orchestrator ──
    const result = await orchestrate(message, userId);

    // ── Save assistant message ──
    const assistantMsgId = crypto.randomUUID();
    const toolCallsSummary = result.toolCalls.map((tc) => ({
      integration: tc.integration,
      action: tc.action,
      mode: tc.mode,
      durationMs: tc.durationMs,
    }));

    // If orchestrator returned empty reply (general intent), use a fallback
    const reply = result.reply || "I'm not sure how to help with that. I can track shipments, check inventory, optimize routes, validate GSTINs, check weather, and more. Try asking about a specific task!";

    await sql`
      INSERT INTO chat_messages (id, thread_id, role, content, tool_calls, created_at)
      VALUES (${assistantMsgId}, ${activeThreadId}, 'assistant', ${reply}, ${JSON.stringify(toolCallsSummary)}::jsonb, NOW())
    `;

    // ── Save tool call details ──
    for (const tc of result.toolCalls) {
      await sql`
        INSERT INTO chat_tool_calls (id, message_id, integration, action, input, output, mode, duration_ms, error_message, created_at)
        VALUES (
          gen_random_uuid(), ${assistantMsgId},
          ${tc.integration}, ${tc.action},
          ${JSON.stringify(tc.input)}::jsonb, ${JSON.stringify(tc.output)}::jsonb,
          ${tc.mode}, ${tc.durationMs}, ${tc.errorMessage || null},
          NOW()
        )
      `;
    }

    // ── Update thread timestamp ──
    await sql`UPDATE chat_threads SET updated_at = NOW() WHERE id = ${activeThreadId}`;

    return NextResponse.json({
      threadId: activeThreadId,
      message: {
        id: assistantMsgId,
        role: "assistant",
        content: reply,
        toolCalls: toolCallsSummary,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[Chat API]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
