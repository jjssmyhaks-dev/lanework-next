/**
 * Adaptive Risk Scoring — dynamically adjusts risk profiles based on
 * actual performance data, not just theoretical risk.
 *
 * If an agent is consistently correct at "reroute_shipment", its risk
 * score decreases over time, allowing more auto-execution.
 * If an agent frequently gets "cancel_shipment" wrong, its risk increases.
 */

import { neon } from "@neondatabase/serverless";
import { calculateRisk, getRiskProfile, type RiskAssessment } from "./risk-scoring";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "adaptive-risk" });

// ── Adjusted Risk Profile ──

export interface AdaptiveRiskAssessment extends RiskAssessment {
  baseScore: number;
  adaptiveAdjustment: number;
  dataPoints: number;
  adaptiveNote: string;
}

// ── Get adaptive risk score for an action ──

export async function getAdaptiveRisk(
  actionType: string,
  context?: Record<string, unknown>,
  tenantId?: string | null
): Promise<AdaptiveRiskAssessment> {
  // 1. Get base risk from static profile
  const base = calculateRisk(actionType, context);
  let adjustment = 0;
  let dataPoints = 0;
  let note = "No adaptive data — using static profile";

  // 2. Analyze historical accuracy for this action type
  try {
    const [outcomeStats] = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE was_correct = true)::int as correct,
        AVG(accuracy_score)::float as avg_score
      FROM agent_outcomes
      WHERE action_type = ${actionType}
        AND tracked_at >= NOW() - INTERVAL '30 days'
    `;

    if (outcomeStats && outcomeStats.total >= 5) {
      dataPoints = outcomeStats.total;
      const accuracy = outcomeStats.correct / outcomeStats.total;

      // High accuracy → lower risk (more auto-execution)
      // Low accuracy → higher risk (more oversight)
      if (accuracy >= 0.9) {
        adjustment = -2; // Significant reduction
        note = `High accuracy (${Math.round(accuracy * 100)}%) — risk reduced by 2`;
      } else if (accuracy >= 0.75) {
        adjustment = -1;
        note = `Good accuracy (${Math.round(accuracy * 100)}%) — risk reduced by 1`;
      } else if (accuracy < 0.5) {
        adjustment = 2;
        note = `Low accuracy (${Math.round(accuracy * 100)}%) — risk increased by 2`;
      } else if (accuracy < 0.65) {
        adjustment = 1;
        note = `Below average accuracy (${Math.round(accuracy * 100)}%) — risk increased by 1`;
      }
    }
  } catch (_e) { /* non-critical, intentionally silent */
    // Best effort
  }

  // 3. Analyze approval patterns
  try {
    const [approvalStats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'approved')::int as approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
        COUNT(*)::int as total
      FROM agent_approvals
      WHERE action_type = ${actionType}
        AND created_at >= NOW() - INTERVAL '30 days'
    `;

    if (approvalStats && approvalStats.total >= 3) {
      const approvalRate = approvalStats.approved / approvalStats.total;

      // Users always approve → agent is reliable → lower risk
      if (approvalRate >= 0.9 && approvalStats.total >= 5) {
        adjustment = Math.min(adjustment - 1, -3); // Cap at -3
        note += ` | High approval rate (${Math.round(approvalRate * 100)}%)`;
      }

      // Users often reject → agent needs more oversight → higher risk
      if (approvalRate < 0.3 && approvalStats.total >= 5) {
        adjustment = Math.max(adjustment + 1, 3); // Cap at +3
        note += ` | Low approval rate (${Math.round(approvalRate * 100)}%)`;
      }
    }
  } catch (_e) { /* non-critical, intentionally silent */
    // Best effort
  }

  // 4. Apply adjustment (clamped to 0-10)
  const adjustedScore = Math.max(0, Math.min(10, base.score + adjustment));

  return {
    score: adjustedScore,
    factors: base.factors,
    requiresApproval: adjustedScore > 3,
    reason: adjustedScore > 3
      ? `Risk ${adjustedScore}/10 — ${base.reason}`
      : `Risk ${adjustedScore}/10 — safe to auto-execute`,
    baseScore: base.score,
    adaptiveAdjustment: adjustment,
    dataPoints,
    adaptiveNote: note,
  };
}

// ── Batch update all risk profiles based on data ──

export async function updateAllRiskProfiles(): Promise<{
  updated: number;
  adjustments: Array<{ actionType: string; oldScore: number; newScore: number; reason: string }>;
}> {
  const ACTION_TYPES = [
    "track_shipment", "create_shipment", "cancel_shipment", "reroute_shipment",
    "reorder_stock", "sync_inventory", "check_stock",
    "optimize_route", "generate_ewb", "cancel_ewb",
    "schedule_maintenance", "track_fleet",
    "send_notification", "send_whatsapp",
    "check_license", "check_registration",
  ];

  const adjustments: Array<{ actionType: string; oldScore: number; newScore: number; reason: string }> = [];

  for (const actionType of ACTION_TYPES) {
    const assessment = await getAdaptiveRisk(actionType);
    if (assessment.adaptiveAdjustment !== 0) {
      adjustments.push({
        actionType,
        oldScore: assessment.baseScore,
        newScore: assessment.score,
        reason: assessment.adaptiveNote,
      });
    }
  }

  log.info({ adjustments: adjustments.length }, "Risk profile analysis complete");
  return { updated: adjustments.length, adjustments };
}
