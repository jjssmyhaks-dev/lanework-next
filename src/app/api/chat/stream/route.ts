/**
 * POST /api/chat/stream — SSE streaming chat endpoint.
 *
 * Same as /api/chat but streams the response as Server-Sent Events.
 * The client receives: tool_call events as they execute, then token-by-token
 * text delivery for the reply.
 *
 * Event types:
 *   tool_call     — MCP tool was invoked (integration, action, mode, duration)
 *   token         — A chunk of the reply text
 *   done          — Stream complete (includes full message)
 *   error         — Something went wrong
 */

import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { orchestrate } from "@/lib/chat/orchestrator";
import { requireChatLimit } from "@/lib/feature-gate";
import { guardInput } from "@/lib/guardrails/input-guard";
import { guardOutput } from "@/lib/guardrails/output-guard";
import { checkBudget, recordCost } from "@/lib/guardrails/cost-guard";
import { logInjectionAttempt, logRateLimitHit } from "@/lib/security/audit-events";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);

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
}

/** Split text into natural chunks for streaming (words/phrases, not chars) */
function* chunkText(text: string, chunkSize = 3): Generator<string> {
  const words = text.split(/(\s+)/);
  let buffer = "";
  let count = 0;

  for (const word of words) {
    buffer += word;
    count++;
    if (count >= chunkSize || word.includes("\n")) {
      yield buffer;
      buffer = "";
      count = 0;
    }
  }

  if (buffer) yield buffer;
}

export async function POST(request: NextRequest) {
  // Auth check
  let user: any;
  try {
    // Inline auth check since we're not using withAuth (need Request object)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { verifyToken } = await import("@/lib/auth");
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    user = payload;
  } catch {
    return new Response(JSON.stringify({ error: "Auth failed" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit
  const rl = rateLimit(request, { maxRequests: 15, windowMs: 60_000, group: "chat_stream" });
  if (!rl.allowed) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    await logRateLimitHit(ip, "chat_stream", 15);
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  try {
    await ensureTables();

    const body = await request.json();
    const { message, threadId } = body as { message: string; threadId?: string };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Message required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Input guard
    const inputGuard = guardInput(message);
    if (!inputGuard.safe) {
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() || "unknown";
      await logInjectionAttempt(user.id, ip, inputGuard.reasons.join("; "), message);
      return new Response(JSON.stringify({ error: "Message flagged by safety system" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Budget check
    const budget = await checkBudget(user.id);
    if (!budget.allowed) {
      return new Response(JSON.stringify({ error: budget.message, blocked: true }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Chat limit
    const chatGate = await requireChatLimit(user.id);
    if (chatGate.denied) {
      const res = chatGate.response;
      const body = await res.json();
      return new Response(JSON.stringify(body), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Thread
    let activeThreadId = threadId;
    if (!activeThreadId) {
      const [existing] = await sql`
        SELECT id FROM chat_threads WHERE user_id = ${user.id} AND status = 'active' ORDER BY updated_at DESC LIMIT 1
      `;
      activeThreadId = existing?.id;
    }
    if (!activeThreadId) {
      const title = message.slice(0, 80) + (message.length > 80 ? "..." : "");
      const [newThread] = await sql`
        INSERT INTO chat_threads (id, user_id, title, created_at, updated_at)
        VALUES (gen_random_uuid(), ${user.id}, ${title}, NOW(), NOW()) RETURNING id
      `;
      activeThreadId = newThread.id;
    }

    // Save user message
    const userMsgId = crypto.randomUUID();
    await sql`
      INSERT INTO chat_messages (id, thread_id, role, content, created_at)
      VALUES (${userMsgId}, ${activeThreadId}, 'user', ${message}, NOW())
    `;

    // Run orchestrator
    const result = await orchestrate(message, user.id);
    const rawReply = result.reply || "I'm not sure how to help with that.";

    // Output guard
    const outputGuard = guardOutput(rawReply, {
      integration: result.toolCalls[0]?.integration,
      action: result.toolCalls[0]?.action,
    });
    const reply = outputGuard.sanitized;

    // Record cost
    await recordCost(user.id, 300, 200, {
      integration: result.toolCalls[0]?.integration,
      action: result.toolCalls[0]?.action,
      threadId: activeThreadId as string,
    });

    // Save tool calls for SSE events
    const toolCallsSummary = result.toolCalls.map((tc) => ({
      integration: tc.integration,
      action: tc.action,
      mode: tc.mode,
      durationMs: tc.durationMs,
    }));

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const send = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        // 1. Send tool calls first
        for (const tc of toolCallsSummary) {
          send("tool_call", tc);
          // Small delay between tool calls for visual effect
          await new Promise((r) => setTimeout(r, 50));
        }

        // 2. Stream the reply token by token
        for (const chunk of chunkText(reply, 2)) {
          send("token", { text: chunk });
          // Small delay to simulate streaming feel
          await new Promise((r) => setTimeout(r, 20));
        }

        // 3. Save assistant message to DB
        const assistantMsgId = crypto.randomUUID();
        await sql`
          INSERT INTO chat_messages (id, thread_id, role, content, tool_calls, created_at)
          VALUES (${assistantMsgId}, ${activeThreadId}, 'assistant', ${reply}, ${JSON.stringify(toolCallsSummary)}::jsonb, NOW())
        `;

        // Save tool call details
        for (const tc of result.toolCalls) {
          await sql`
            INSERT INTO chat_tool_calls (id, message_id, integration, action, input, output, mode, duration_ms, error_message, created_at)
            VALUES (gen_random_uuid(), ${assistantMsgId}, ${tc.integration}, ${tc.action},
                    ${JSON.stringify(tc.input)}::jsonb, ${JSON.stringify(tc.output)}::jsonb,
                    ${tc.mode}, ${tc.durationMs}, ${tc.errorMessage || null}, NOW())
          `;
        }

        // Update thread timestamp
        await sql`UPDATE chat_threads SET updated_at = NOW() WHERE id = ${activeThreadId}`;

        // 4. Send done event
        send("done", {
          threadId: activeThreadId,
          messageId: assistantMsgId,
          content: reply,
          toolCalls: toolCallsSummary,
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Chat stream error");
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
