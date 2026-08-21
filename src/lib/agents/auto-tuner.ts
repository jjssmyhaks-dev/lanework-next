/**
 * Auto-Tuner — the component that actually APPLIES learned improvements.
 *
 * Runs on a schedule (daily/weekly):
 * 1. Runs learning cycle (extract patterns from feedback/outcomes)
 * 2. Runs adaptive risk analysis
 * 3. Applies high-confidence patterns (trust level changes, risk adjustments)
 * 4. Logs all changes for audit trail
 */

import { neon } from "@neondatabase/serverless";
import { runLearningCycle } from "./learning";
import { updateAllRiskProfiles } from "./adaptive-risk";
import { extractPatterns } from "./pattern-analyzer";
import { setTrustLevel, type TrustLevel } from "./trust";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "auto-tuner" });

export interface TuningResult {
  timestamp: string;
  learningCycle: { insights: number; patternsStored: number };
  riskAdjustments: { actionType: string; oldScore: number; newScore: number; reason: string }[];
  trustChanges: { agentType: string; actionType: string; oldLevel: TrustLevel; newLevel: TrustLevel; reason: string }[];
  patternsExtracted: number;
  applied: number;
  errors: string[];
}

// ── Run a full tuning cycle ──

export async function runTuningCycle(): Promise<TuningResult> {
  const result: TuningResult = {
    timestamp: new Date().toISOString(),
    learningCycle: { insights: 0, patternsStored: 0 },
    riskAdjustments: [],
    trustChanges: [],
    patternsExtracted: 0,
    applied: 0,
    errors: [],
  };

  log.info("Starting tuning cycle");

  // 1. Run learning cycle
  try {
    const learning = await runLearningCycle(30);
    result.learningCycle = { insights: learning.insights, patternsStored: learning.patternsStored };
  } catch (e: unknown) {
    result.errors.push(`Learning cycle failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // 2. Update risk profiles
  try {
    const risk = await updateAllRiskProfiles();
    result.riskAdjustments = risk.adjustments;
  } catch (e: unknown) {
    result.errors.push(`Risk update failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // 3. Extract patterns
  try {
    const patterns = await extractPatterns(30);
    result.patternsExtracted = patterns.length;

    // Store high-confidence patterns
    for (const pattern of patterns) {
      if (pattern.confidence >= 0.7) {
        try {
          await sql`
            INSERT INTO agent_patterns (id, tenant_id, pattern_type, agent_type, action_type, description, confidence, examples_count, auto_apply, created_at, updated_at)
            VALUES (gen_random_uuid(), NULL, ${pattern.type}, ${pattern.agentType}, ${pattern.actionType || null},
                    ${pattern.description}, ${pattern.confidence}, 1, false, NOW(), NOW())
            ON CONFLICT DO NOTHING
          `;
          result.applied++;
        } catch {
          // Best effort
        }
      }
    }
  } catch (e: unknown) {
    result.errors.push(`Pattern extraction failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // 4. Apply trust level changes for high-confidence patterns
  try {
    const highConfidencePatterns = await sql`
      SELECT agent_type, action_type, description, confidence
      FROM agent_patterns
      WHERE confidence >= 0.8
        AND auto_apply = true
        AND updated_at >= NOW() - INTERVAL '7 days'
      ORDER BY confidence DESC
      LIMIT 10
    `;

    for (const pattern of highConfidencePatterns) {
      // Trust level changes are logged but require manual confirmation
      // (safety: we don't auto-change trust levels without human review)
      result.trustChanges.push({
        agentType: pattern.agent_type,
        actionType: pattern.action_type,
        oldLevel: "propose",
        newLevel: "auto_low_risk",
        reason: pattern.description,
      });
    }
  } catch (e: unknown) {
    result.errors.push(`Trust analysis failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // 5. Log the tuning result
  try {
    await sql`
      INSERT INTO agent_eval_runs (id, tenant_id, agent_filter, total, passed, failed, avg_score, duration_ms, results, created_at)
      VALUES (gen_random_uuid(), NULL, 'auto-tuner', ${result.applied}, ${result.applied}, ${result.errors.length},
              0, 0, ${JSON.stringify(result)}::jsonb, NOW())
    `;
  } catch {
    // Best effort
  }

  log.info({
    insights: result.learningCycle.insights,
    patternsStored: result.learningCycle.patternsStored,
    riskAdjustments: result.riskAdjustments.length,
    trustChanges: result.trustChanges.length,
    errors: result.errors.length,
  }, "Tuning cycle complete");

  return result;
}

// ── Get tuning history ──

export async function getTuningHistory(limit: number = 10): Promise<TuningResult[]> {
  try {
    const rows = await sql`
      SELECT results FROM agent_eval_runs
      WHERE agent_filter = 'auto-tuner'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.results as TuningResult);
  } catch {
    return [];
  }
}
