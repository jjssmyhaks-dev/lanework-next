/**
 * Eval Auto-Generation — creates new eval test cases from production data.
 *
 * Sources:
 * 1. Production failures (agent actions that failed)
 * 2. User corrections (thumbs-down feedback with reasons)
 * 3. Rejected approvals (what the agent got wrong)
 * 4. Circuit breaker trips (integration failures)
 *
 * Generated cases are added to the eval dataset for future harness runs.
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "eval-autogen" });

// ── Types ──

export interface GeneratedEvalCase {
  id: string;
  source: "production_failure" | "user_correction" | "rejected_approval" | "circuit_trip";
  agent: string;
  scenario: string;
  input: Record<string, unknown>;
  expectedKeywords: string[];
  minLength: number;
  maxLatencyMs: number;
  generatedAt: string;
  confidence: number;
}

// ── Generate from production failures ──

async function generateFromFailures(days: number = 7, limit: number = 10): Promise<GeneratedEvalCase[]> {
  const cases: GeneratedEvalCase[] = [];

  try {
    const failures = await sql`
      SELECT agent_type, action, input_data, error_message, timestamp
      FROM agent_audit_log
      WHERE success = false
        AND timestamp >= NOW() - (${days} || ' days')::interval
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    for (const failure of failures) {
      const input = typeof failure.input_data === "string"
        ? JSON.parse(failure.input_data)
        : failure.input_data;

      cases.push({
        id: `autogen-fail-${failure.timestamp.getTime()}`,
        source: "production_failure",
        agent: mapAgentType(failure.agent_type),
        scenario: `Production failure: ${failure.error_message || "unknown error"} during ${failure.action}`,
        input: { ...input, _originalAction: failure.action, _error: failure.error_message },
        expectedKeywords: extractKeywords(failure.action, failure.error_message),
        minLength: 40,
        maxLatencyMs: 8000,
        generatedAt: failure.timestamp.toISOString(),
        confidence: 0.7,
      });
    }
  } catch (e: unknown) {
    log.error({ err: e instanceof Error ? e.message : "unknown" }, "Failed to generate from failures");
  }

  return cases;
}

// ── Generate from user corrections ──

async function generateFromCorrections(days: number = 7, limit: number = 10): Promise<GeneratedEvalCase[]> {
  const cases: GeneratedEvalCase[] = [];

  try {
    const corrections = await sql`
      SELECT agent_type, rating, comment, context, created_at
      FROM agent_feedback
      WHERE rating = 'thumbs_down'
        AND comment IS NOT NULL AND comment != ''
        AND created_at >= NOW() - (${days} || ' days')::interval
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    for (const correction of corrections) {
      const context = typeof correction.context === "string"
        ? JSON.parse(correction.context)
        : correction.context || {};

      cases.push({
        id: `autogen-correction-${correction.created_at.getTime()}`,
        source: "user_correction",
        agent: mapAgentType(correction.agent_type),
        scenario: `User correction: ${correction.comment}`,
        input: { ...context, _userFeedback: correction.comment },
        expectedKeywords: correction.comment.split(" ").slice(0, 5),
        minLength: 30,
        maxLatencyMs: 8000,
        generatedAt: correction.created_at.toISOString(),
        confidence: 0.6,
      });
    }
  } catch (e: unknown) {
    log.error({ err: e instanceof Error ? e.message : "unknown" }, "Failed to generate from corrections");
  }

  return cases;
}

// ── Generate from rejected approvals ──

async function generateFromRejections(days: number = 7, limit: number = 10): Promise<GeneratedEvalCase[]> {
  const cases: GeneratedEvalCase[] = [];

  try {
    const rejections = await sql`
      SELECT agent_type, action_type, action_description, risk_score, decision_reason, created_at
      FROM agent_approvals
      WHERE status = 'rejected'
        AND decision_reason IS NOT NULL
        AND created_at >= NOW() - (${days} || ' days')::interval
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    for (const rejection of rejections) {
      cases.push({
        id: `autogen-reject-${rejection.created_at.getTime()}`,
        source: "rejected_approval",
        agent: mapAgentType(rejection.agent_type),
        scenario: `Rejected: ${rejection.action_description} — Reason: ${rejection.decision_reason}`,
        input: { actionType: rejection.action_type, riskScore: rejection.risk_score, rejectionReason: rejection.decision_reason },
        expectedKeywords: ["risk", "approval", "reject"],
        minLength: 40,
        maxLatencyMs: 8000,
        generatedAt: rejection.created_at.toISOString(),
        confidence: 0.8,
      });
    }
  } catch (e: unknown) {
    log.error({ err: e instanceof Error ? e.message : "unknown" }, "Failed to generate from rejections");
  }

  return cases;
}

// ── Store generated eval cases ──

export async function generateAndStoreEvalCases(
  days: number = 7,
  limit: number = 10
): Promise<{
  generated: number;
  stored: number;
  sources: Record<string, number>;
}> {
  const allCases: GeneratedEvalCase[] = [];

  // Generate from all sources
  const failures = await generateFromFailures(days, limit);
  const corrections = await generateFromCorrections(days, limit);
  const rejections = await generateFromRejections(days, limit);

  allCases.push(...failures, ...corrections, ...rejections);

  let stored = 0;
  for (const evalCase of allCases) {
    try {
      await sql`
        INSERT INTO agent_eval_cases (id, source, agent, scenario, input, expected_keywords, min_length, max_latency_ms, generated_at, confidence, created_at)
        VALUES (${evalCase.id}, ${evalCase.source}, ${evalCase.agent}, ${evalCase.scenario},
                ${JSON.stringify(evalCase.input)}::jsonb, ${JSON.stringify(evalCase.expectedKeywords)}::jsonb,
                ${evalCase.minLength}, ${evalCase.maxLatencyMs}, ${evalCase.generatedAt}, ${evalCase.confidence}, NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      stored++;
    } catch (e: unknown) {
      log.warn({ id: evalCase.id }, "Failed to store eval case");
    }
  }

  const result = {
    generated: allCases.length,
    stored,
    sources: {
      production_failure: failures.length,
      user_correction: corrections.length,
      rejected_approval: rejections.length,
    },
  };

  log.info(result, "Eval cases generated");
  return result;
}

// ── Get generated eval cases ──

export async function getGeneratedEvalCases(limit: number = 50): Promise<GeneratedEvalCase[]> {
  try {
    const rows = await sql`
      SELECT * FROM agent_eval_cases
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      agent: r.agent,
      scenario: r.scenario,
      input: typeof r.input === "string" ? JSON.parse(r.input) : r.input,
      expectedKeywords: typeof r.expected_keywords === "string" ? JSON.parse(r.expected_keywords) : r.expected_keywords,
      minLength: r.min_length,
      maxLatencyMs: r.max_latency_ms,
      generatedAt: r.generated_at,
      confidence: r.confidence,
    }));
  } catch (_e) { /* non-critical, intentionally silent */
    return [];
  }
}

// ── Helpers ──

function mapAgentType(agentType: string): string {
  const mapping: Record<string, string> = {
    shipment_tracking: "shipment-tracking",
    inventory_management: "inventory-management",
    fleet_management: "fleet-management",
    route_optimization: "route-optimization",
    customer_support: "customer-support",
    compliance: "compliance",
    warehouse: "warehouse-operations",
    reasoning: "reasoning",
  };
  return mapping[agentType] || agentType;
}

function extractKeywords(action: string, error: string | null): string[] {
  const keywords = ["error", "fail"];
  if (action) keywords.push(...action.split("_"));
  if (error) {
    const words = error.split(" ").filter((w) => w.length > 3).slice(0, 5);
    keywords.push(...words);
  }
  return keywords.slice(0, 8);
}
