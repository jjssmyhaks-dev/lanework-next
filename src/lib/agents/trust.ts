/**
 * Trust System — evaluates whether an agent action can be auto-executed
 * or requires human approval based on tenant trust configuration.
 *
 * Trust levels:
 * - "propose": Agent suggests action, human must approve
 * - "auto_low_risk": Agent auto-executes actions with risk score ≤ threshold
 * - "full": Agent executes everything without approval
 */

import { neon } from "@neondatabase/serverless";
import { calculateRisk, type RiskAssessment } from "./risk-scoring";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "agent-trust" });

export type TrustLevel = "propose" | "auto_low_risk" | "full";

export interface TrustDecision {
  allowed: boolean;
  trustLevel: TrustLevel;
  risk: RiskAssessment;
  reason: string;
}

// ── Default trust levels by plan ──

const PLAN_DEFAULTS: Record<string, TrustLevel> = {
  free: "propose",
  starter: "auto_low_risk",
  growth: "auto_low_risk",
  enterprise: "full",
};

/**
 * Get the trust level for a specific agent type + action type + tenant.
 * Falls back to plan default, then to "propose" (safest).
 */
export async function getTrustLevel(
  tenantId: string | null | undefined,
  agentType: string,
  actionType: string,
  plan?: string
): Promise<TrustLevel> {
  // 1. Check explicit tenant override
  if (tenantId) {
    try {
      const [row] = await sql`
        SELECT trust_level FROM agent_trust_levels
        WHERE tenant_id = ${tenantId}
          AND agent_type = ${agentType}
          AND action_type = ${actionType}
        LIMIT 1
      `;
      if (row) return row.trust_level as TrustLevel;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      log.warn({ err: msg }, "Failed to fetch trust level");
    }
  }

  // 2. Fall back to plan default
  if (plan && PLAN_DEFAULTS[plan]) return PLAN_DEFAULTS[plan];

  // 3. Safest default
  return "propose";
}

/**
 * Evaluate whether an agent action is allowed without human approval.
 */
export async function evaluateAction(
  tenantId: string | null | undefined,
  agentType: string,
  actionType: string,
  context?: Record<string, unknown>,
  plan?: string
): Promise<TrustDecision> {
  const risk = calculateRisk(actionType, context);
  const trustLevel = await getTrustLevel(tenantId, agentType, actionType, plan);

  let allowed = false;
  let reason = "";

  switch (trustLevel) {
    case "full":
      allowed = true;
      reason = "Full trust — action auto-executed";
      break;
    case "auto_low_risk":
      allowed = !risk.requiresApproval;
      reason = allowed
        ? `Low risk (score ${risk.score}/10) — auto-executed per trust policy`
        : `Risk score ${risk.score}/10 exceeds auto-execute threshold — needs approval`;
      break;
    case "propose":
      allowed = false;
      reason = "Propose-only mode — action requires human approval";
      break;
  }

  log.info(
    { agentType, actionType, trustLevel, riskScore: risk.score, allowed },
    "Trust evaluation"
  );

  return { allowed, trustLevel, risk, reason };
}

/**
 * Set trust level for a specific agent + action + tenant.
 */
export async function setTrustLevel(
  tenantId: string,
  agentType: string,
  actionType: string,
  trustLevel: TrustLevel
): Promise<void> {
  await sql`
    INSERT INTO agent_trust_levels (id, tenant_id, agent_type, action_type, trust_level, updated_at)
    VALUES (gen_random_uuid(), ${tenantId}, ${agentType}, ${actionType}, ${trustLevel}, NOW())
    ON CONFLICT (tenant_id, agent_type, action_type)
    DO UPDATE SET trust_level = ${trustLevel}, updated_at = NOW()
  `;
  log.info({ tenantId, agentType, actionType, trustLevel }, "Trust level updated");
}

/**
 * Get all trust levels for a tenant.
 */
export async function getAllTrustLevels(tenantId: string): Promise<Array<{
  agentType: string;
  actionType: string;
  trustLevel: TrustLevel;
}>> {
  const rows = await sql`
    SELECT agent_type, action_type, trust_level
    FROM agent_trust_levels
    WHERE tenant_id = ${tenantId}
    ORDER BY agent_type, action_type
  `;
  return rows.map((r) => ({
    agentType: r.agent_type,
    actionType: r.action_type,
    trustLevel: r.trust_level as TrustLevel,
  }));
}
