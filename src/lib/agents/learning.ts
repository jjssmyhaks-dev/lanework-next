/**
 * Learning Engine — the brain that makes agents smarter over time.
 *
 * Analyzes:
 * 1. User feedback (thumbs up/down) → which actions need improvement
 * 2. Outcome tracking (correct/incorrect) → accuracy per action type
 * 3. Approval patterns → which actions users auto-approve vs reject
 * 4. Error patterns → which MCP integrations are unreliable
 *
 * Outputs:
 * 1. Updated risk profiles (based on actual accuracy, not just theory)
 * 2. Pattern records (stored in agent_patterns for auto-tuner)
 * 3. Improvement suggestions (visible in harness dashboard)
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "learning-engine" });

// ── Learning Results ──

export interface LearningInsight {
  type: "accuracy_shift" | "approval_pattern" | "error_cluster" | "risk_adjustment" | "seasonal";
  agentType: string;
  actionType?: string;
  description: string;
  confidence: number; // 0-1
  evidence: Record<string, unknown>;
  recommendation: string;
}

// ── Analyze feedback → extract insights ──

export async function analyzeFeedback(days: number = 30): Promise<LearningInsight[]> {
  const insights: LearningInsight[] = [];

  // 1. Accuracy by agent type
  const accuracyByAgent = await sql`
    SELECT
      agent_type,
      COUNT(*) FILTER (WHERE rating = 'thumbs_up')::int as positive,
      COUNT(*) FILTER (WHERE rating = 'thumbs_down')::int as negative,
      COUNT(*)::int as total
    FROM agent_feedback
    WHERE created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY agent_type
    HAVING COUNT(*) >= 3
  `;

  for (const row of accuracyByAgent) {
    const accuracy = row.total > 0 ? row.positive / row.total : 0;
    if (accuracy < 0.6 && row.total >= 5) {
      insights.push({
        type: "accuracy_shift",
        agentType: row.agent_type,
        description: `Low accuracy: ${Math.round(accuracy * 100)}% positive feedback (${row.positive}/${row.total})`,
        confidence: Math.min(row.total / 20, 1), // More data = higher confidence
        evidence: { positive: row.positive, negative: row.negative, total: row.total, accuracy },
        recommendation: `Review recent ${row.agent_type.replace(/_/g, " ")} actions. Consider adjusting risk thresholds or adding more training data.`,
      });
    }
  }

  // 2. Approval/rejection patterns
  const approvalPatterns = await sql`
    SELECT
      agent_type,
      action_type,
      COUNT(*) FILTER (WHERE status = 'approved')::int as approved,
      COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
      COUNT(*)::int as total
    FROM agent_approvals
    WHERE created_at >= NOW() - (${days} || ' days')::interval
      AND status IN ('approved', 'rejected')
    GROUP BY agent_type, action_type
    HAVING COUNT(*) >= 3
  `;

  for (const row of approvalPatterns) {
    const approvalRate = row.total > 0 ? row.approved / row.total : 0;

    // High approval rate → agent is good at this, can auto-approve more
    if (approvalRate > 0.85 && row.total >= 5) {
      insights.push({
        type: "approval_pattern",
        agentType: row.agent_type,
        actionType: row.action_type,
        description: `High approval rate (${Math.round(approvalRate * 100)}%) for ${row.action_type} — agent is reliable`,
        confidence: Math.min(row.total / 15, 1),
        evidence: { approved: row.approved, rejected: row.rejected, total: row.total, approvalRate },
        recommendation: `Consider upgrading trust level for ${row.action_type} to auto_low_risk or full.`,
      });
    }

    // Low approval rate → agent is bad at this, needs more oversight
    if (approvalRate < 0.3 && row.total >= 5) {
      insights.push({
        type: "approval_pattern",
        agentType: row.agent_type,
        actionType: row.action_type,
        description: `Low approval rate (${Math.round(approvalRate * 100)}%) for ${row.action_type} — agent needs improvement`,
        confidence: Math.min(row.total / 15, 1),
        evidence: { approved: row.approved, rejected: row.rejected, total: row.total, approvalRate },
        recommendation: `Keep trust level at propose for ${row.action_type}. Review rejection reasons for patterns.`,
      });
    }
  }

  // 3. Error clusters (MCP integration failures)
  const errorClusters = await sql`
    SELECT
      integration,
      COUNT(*)::int as error_count,
      COUNT(DISTINCT action)::int as affected_actions
    FROM agent_audit_log
    WHERE success = false
      AND timestamp >= NOW() - (${days} || ' days')::interval
    GROUP BY integration
    HAVING COUNT(*) >= 3
  `;

  for (const row of errorClusters) {
    insights.push({
      type: "error_cluster",
      agentType: "system",
      description: `${row.error_count} failures in ${row.integration} integration affecting ${row.affected_actions} actions`,
      confidence: Math.min(row.error_count / 10, 1),
      evidence: { integration: row.integration, errorCount: row.error_count, affectedActions: row.affected_actions },
      recommendation: `Check ${row.integration} API health. Consider adding fallback behavior or increasing circuit breaker threshold.`,
    });
  }

  // 4. Outcome accuracy by action type
  const outcomeAccuracy = await sql`
    SELECT
      action_type,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE was_correct = true)::int as correct,
      AVG(accuracy_score)::float as avg_score
    FROM agent_outcomes
    WHERE tracked_at >= NOW() - (${days} || ' days')::interval
    GROUP BY action_type
    HAVING COUNT(*) >= 3
  `;

  for (const row of outcomeAccuracy) {
    const accuracy = row.total > 0 ? row.correct / row.total : 0;
    if (accuracy < 0.5 && row.total >= 5) {
      insights.push({
        type: "accuracy_shift",
        agentType: "system",
        actionType: row.action_type,
        description: `Outcome accuracy for ${row.action_type}: ${Math.round(accuracy * 100)}% (${row.correct}/${row.total})`,
        confidence: Math.min(row.total / 20, 1),
        evidence: { actionType: row.action_type, accuracy, correct: row.correct, total: row.total, avgScore: row.avg_score },
        recommendation: `The ${row.action_type.replace(/_/g, " ")} action has poor accuracy. Review the logic and consider retraining.`,
      });
    }
  }

  log.info({ count: insights.length, days }, "Learning analysis complete");
  return insights;
}

// ── Store insights as patterns ──

export async function storePatterns(insights: LearningInsight[]): Promise<number> {
  let stored = 0;

  for (const insight of insights) {
    try {
      // Check if similar pattern exists
      const existing = await sql`
        SELECT id, confidence, examples_count FROM agent_patterns
        WHERE agent_type = ${insight.agentType}
          AND pattern_type = ${insight.type}
          AND (${insight.actionType || null}::text IS NULL OR action_type = ${insight.actionType})
        LIMIT 1
      `;

      if (existing.length > 0) {
        // Update existing pattern — blend old and new confidence
        const old = existing[0];
        const newConfidence = Math.min(
          (old.confidence * 0.7 + insight.confidence * 0.3), // EMA blend
          1
        );
        await sql`
          UPDATE agent_patterns
          SET confidence = ${newConfidence},
              examples_count = ${old.examples_count + 1},
              description = ${insight.description},
              updated_at = NOW()
          WHERE id = ${old.id}
        `;
      } else {
        // Create new pattern
        await sql`
          INSERT INTO agent_patterns (id, tenant_id, pattern_type, agent_type, action_type, description, confidence, examples_count, auto_apply, created_at, updated_at)
          VALUES (gen_random_uuid(), NULL, ${insight.type}, ${insight.agentType}, ${insight.actionType || null},
                  ${insight.description}, ${insight.confidence}, 1, false, NOW(), NOW())
        `;
        stored++;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      log.error({ err: msg, insight }, "Failed to store pattern");
    }
  }

  log.info({ stored, total: insights.length }, "Patterns stored");
  return stored;
}

// ── Run full learning cycle ──

export async function runLearningCycle(days: number = 30): Promise<{
  insights: number;
  patternsStored: number;
  topInsights: LearningInsight[];
}> {
  const insights = await analyzeFeedback(days);
  const patternsStored = await storePatterns(insights);

  // Sort by confidence, take top 10
  const topInsights = insights.sort((a, b) => b.confidence - a.confidence).slice(0, 10);

  return { insights: insights.length, patternsStored, topInsights };
}
