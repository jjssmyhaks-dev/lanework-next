import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";
import { rateLimit, aiRateLimit } from "@/lib/rate-limit";
import {
  analyzeShipmentStatus,
  optimizeRoute,
  analyzeSentiment,
  generateTaskReasoning,
} from "@/lib/ai";
import { logger } from "@/lib/logger";

// GET — return recent agent tasks for dashboard / agents pages
// ?agent_type=shipment-tracking&limit=5
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agent_type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const sql = neon(process.env.DATABASE_URL!);

    let tasks;
    if (agentType) {
      tasks = await sql`
        SELECT id, agent_type, action_type, status, reasoning_trace, created_at
        FROM agent_tasks
        WHERE agent_type = ${agentType}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      tasks = await sql`
        SELECT id, agent_type, action_type, status, reasoning_trace, created_at
        FROM agent_tasks
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }
    return NextResponse.json(tasks);
  } catch (error) {
    logger.error({ err: error }, "AI GET failed");
    // Graceful degradation: return empty array, not 500
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests/minute per IP for AI endpoint
  const rl = rateLimit(request, aiRateLimit);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again.", retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)), "X-RateLimit-Remaining": "0" } }
    );
  }
  try {
    const body = await request.json();
    const { action, data } = body;
    const sessionUser = await getSessionUser(request);

    // Allow public copilot chat without auth
    if (!sessionUser && !(action === "reasoning" && data?.agentId === "copilot")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionUser?.id || "public";
    const sql = neon(process.env.DATABASE_URL!);

    let result: string;
    let agentId: string;

    switch (action) {
      case "analyze-shipment":
        agentId = "shipment-tracking";
        result = await analyzeShipmentStatus(data.trackingNumber);
        break;

      case "optimize-route":
        agentId = "route-optimization";
        result = await optimizeRoute(data.origin, data.destination, data.constraints || []);
        break;

      case "analyze-sentiment":
        agentId = "customer-support";
        result = await analyzeSentiment(data.text);
        break;

      case "reasoning":
        agentId = data.agentId || "unknown";
        result = await generateTaskReasoning(data.taskType, data.context);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    // Create AgentTask record (non-fatal — don't crash if DB insert fails)
    const taskId = uuidv4();
    try {
      // Use a null UUID if userId is "public" (unauthenticated copilot)
      const tenantId = userId === "public" ? null : userId;
      await sql`
        INSERT INTO agent_tasks (id, tenant_id, agent_type, action_type, status, reasoning_trace, input_data, created_at, updated_at)
        VALUES (${taskId}, ${tenantId}, ${agentId}, ${action}, 'completed', ${result}, ${JSON.stringify(data)}::jsonb, NOW(), NOW())
      `;
    } catch (dbErr) {
      logger.warn({ err: dbErr }, "Failed to save agent task to DB (non-fatal)");
    }

    return NextResponse.json({
      success: true,
      taskId,
      agentId,
      action,
      result,
    });
  } catch (error) {
    logger.error({ err: error }, "AI endpoint error");
    return NextResponse.json(
      { error: "AI service error. Please try again later." },
      { status: 500 },
    );
  }
}
