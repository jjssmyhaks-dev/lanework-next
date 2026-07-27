import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { runFullEval, runAgentEval } from "@/lib/eval-runner";

// POST — run evaluations
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { agent } = body; // optional: filter to a single agent

    const summary = agent
      ? await runAgentEval(agent)
      : await runFullEval();

    // Persist eval run to DB
    try {
      const sql = neon(process.env.DATABASE_URL!);
      const runId = crypto.randomUUID();
      await sql`
        INSERT INTO agent_eval_runs (id, tenant_id, agent_filter, total, passed, failed, avg_score, duration_ms, results, created_at)
        VALUES (${runId}, ${sessionUser.id}, ${agent || null}, ${summary.total}, ${summary.passed}, ${summary.failed}, ${summary.overallAvgScore}, ${summary.totalDurationMs}, ${JSON.stringify(summary)}::jsonb, NOW())
      `;
    } catch (dbErr) {
      console.warn("Failed to persist eval run (table may not exist):", dbErr);
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Eval runner error:", error);
    return NextResponse.json(
      { error: "Eval execution failed" },
      { status: 500 }
    );
  }
}

// GET — retrieve past eval runs
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Try to get persisted runs
    let runs: unknown[] = [];
    try {
      runs = await sql`
        SELECT id, agent_filter, total, passed, failed, avg_score, duration_ms, created_at
        FROM agent_eval_runs
        WHERE tenant_id = ${sessionUser.id}
        ORDER BY created_at DESC
        LIMIT 20
      `;
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({ runs });
  } catch (error) {
    console.error("Eval history error:", error);
    return NextResponse.json({ runs: [] });
  }
}
