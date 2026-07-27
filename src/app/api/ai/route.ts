import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";
import {
  analyzeShipmentStatus,
  optimizeRoute,
  analyzeSentiment,
  generateTaskReasoning,
} from "@/lib/ai";

// GET — return recent agent tasks for dashboard / agents pages
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const tasks = await sql`
      SELECT id, agent_type as agent, action_type as action, status, reasoning_trace as reasoning, created_at
      FROM agent_tasks
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("AI GET error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, data } = body;
    const userId = sessionUser.id;
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

    // Create AgentTask record
    const taskId = uuidv4();
    await sql`
      INSERT INTO agent_tasks (id, tenant_id, agent_type, action_type, status, reasoning_trace, input_data, created_at, updated_at)
      VALUES (${taskId}, ${userId}, ${agentId}, ${action}, 'completed', ${result}, ${JSON.stringify(data)}::jsonb, NOW(), NOW())
    `;

    return NextResponse.json({
      success: true,
      taskId,
      agentId,
      action,
      result,
    });
  } catch (error) {
    console.error("AI endpoint error:", error);
    return NextResponse.json(
      { error: "AI service error. Please try again later." },
      { status: 500 },
    );
  }
}
