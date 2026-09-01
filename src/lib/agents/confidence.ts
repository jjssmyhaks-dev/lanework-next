/**
 * Confidence Calibration — ensures agents know when they're unsure.
 *
 * Tracks:
 * - Per-action prediction confidence (0-1)
 * - Calibration accuracy: "80% confident" actions are actually correct 80% of the time
 * - Auto-rejects actions below confidence threshold
 * - Provides confidence-aware decision making
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "confidence" });

// ── Types ──

export interface ConfidencePrediction {
  actionType: string;
  confidence: number;       // 0-1
  calibrated: boolean;      // whether we have enough data to calibrate
  sampleSize: number;
  actualAccuracy: number | null; // what the confidence actually maps to
  recommendation: "auto_execute" | "review" | "reject";
}

export interface ConfidenceStats {
  totalPredictions: number;
  avgConfidence: number;
  calibrationError: number;  // how far off our confidence estimates are
  lowConfidenceCount: number;
  highConfidenceCount: number;
}

// ── Record a confidence prediction ──

export async function recordPrediction(opts: {
  tenantId?: string | null;
  actionType: string;
  confidence: number;
  wasCorrect?: boolean;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO agent_confidence_predictions (id, tenant_id, action_type, confidence, was_correct, context, created_at)
      VALUES (gen_random_uuid(), ${opts.tenantId || null}, ${opts.actionType}, ${opts.confidence},
              ${opts.wasCorrect ?? null}, ${JSON.stringify(opts.context || {})}::jsonb, NOW())
    `;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to record prediction");
  }
}

// ── Get calibrated confidence for an action ──

export async function getCalibratedConfidence(
  actionType: string,
  rawConfidence: number
): Promise<ConfidencePrediction> {
  let calibrated = false;
  let sampleSize = 0;
  let actualAccuracy: number | null = null;
  let recommendation: "auto_execute" | "review" | "reject" = "review";

  try {
    // Get historical accuracy for similar confidence levels
    const [stats] = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE was_correct IS NOT NULL)::int as with_outcome,
        COUNT(*) FILTER (WHERE was_correct = true)::int as correct,
        AVG(confidence)::float as avg_confidence
      FROM agent_confidence_predictions
      WHERE action_type = ${actionType}
        AND confidence BETWEEN ${rawConfidence - 0.15} AND ${rawConfidence + 0.15}
    `;

    if (stats && stats.with_outcome >= 5) {
      calibrated = true;
      sampleSize = stats.with_outcome;
      actualAccuracy = stats.correct / stats.with_outcome;

      // Determine recommendation based on actual accuracy
      if (actualAccuracy >= 0.8) {
        recommendation = "auto_execute";
      } else if (actualAccuracy >= 0.5) {
        recommendation = "review";
      } else {
        recommendation = "reject";
      }
    } else if (stats && stats.total >= 3) {
      // Not enough outcome data, use raw confidence
      sampleSize = stats.total;
      if (rawConfidence >= 0.8) recommendation = "auto_execute";
      else if (rawConfidence >= 0.5) recommendation = "review";
      else recommendation = "reject";
    } else {
      // No data yet — be conservative
      sampleSize = 0;
      recommendation = rawConfidence >= 0.9 ? "auto_execute" : "review";
    }
  } catch (_e) { /* non-critical, intentionally silent */
    // Default to conservative
    recommendation = rawConfidence >= 0.9 ? "auto_execute" : "review";
  }

  return {
    actionType,
    confidence: rawConfidence,
    calibrated,
    sampleSize,
    actualAccuracy,
    recommendation,
  };
}

// ── Calculate raw confidence for an action ──

export function calculateRawConfidence(opts: {
  actionType: string;
  riskScore: number;
  contextDataPoints: number;
  hasMcpSupport: boolean;
  previousSuccessRate?: number;
}): number {
  let confidence = 0.5; // Start neutral

  // Factor 1: Risk score (lower risk = higher confidence)
  if (opts.riskScore <= 2) confidence += 0.2;
  else if (opts.riskScore <= 4) confidence += 0.1;
  else if (opts.riskScore >= 7) confidence -= 0.2;

  // Factor 2: Data points (more data = higher confidence)
  if (opts.contextDataPoints >= 10) confidence += 0.15;
  else if (opts.contextDataPoints >= 5) confidence += 0.1;
  else if (opts.contextDataPoints <= 1) confidence -= 0.1;

  // Factor 3: MCP support (has real integration = higher confidence)
  if (opts.hasMcpSupport) confidence += 0.1;

  // Factor 4: Previous success rate
  if (opts.previousSuccessRate !== undefined) {
    confidence += (opts.previousSuccessRate - 0.5) * 0.3; // Adjust by ±0.15
  }

  return Math.max(0, Math.min(1, confidence));
}

// ── Get calibration stats for dashboard ──

export async function getCalibrationStats(): Promise<ConfidenceStats> {
  try {
    const [row] = await sql`
      SELECT
        COUNT(*)::int as total,
        AVG(confidence)::float as avg_confidence,
        COUNT(*) FILTER (WHERE confidence < 0.5)::int as low_confidence,
        COUNT(*) FILTER (WHERE confidence >= 0.8)::int as high_confidence
      FROM agent_confidence_predictions
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;

    // Calculate calibration error
    const [calibration] = await sql`
      SELECT
        AVG(ABS(confidence - CASE WHEN was_correct THEN 1.0 ELSE 0.0 END))::float as error
      FROM agent_confidence_predictions
      WHERE was_correct IS NOT NULL
        AND created_at >= NOW() - INTERVAL '30 days'
    `;

    return {
      totalPredictions: row?.total || 0,
      avgConfidence: Math.round((row?.avg_confidence || 0) * 100) / 100,
      calibrationError: Math.round((calibration?.error || 0) * 100) / 100,
      lowConfidenceCount: row?.low_confidence || 0,
      highConfidenceCount: row?.high_confidence || 0,
    };
  } catch (_e) { /* non-critical, intentionally silent */
    return { totalPredictions: 0, avgConfidence: 0, calibrationError: 0, lowConfidenceCount: 0, highConfidenceCount: 0 };
  }
}

// ── Get per-action calibration ──

export async function getActionCalibration(): Promise<Array<{
  actionType: string;
  sampleSize: number;
  avgConfidence: number;
  actualAccuracy: number | null;
  calibrationError: number | null;
}>> {
  try {
    const rows = await sql`
      SELECT
        action_type,
        COUNT(*) FILTER (WHERE was_correct IS NOT NULL)::int as sample_size,
        AVG(confidence)::float as avg_confidence,
        AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END)::float as actual_accuracy,
        AVG(ABS(confidence - CASE WHEN was_correct THEN 1.0 ELSE 0.0 END))::float as error
      FROM agent_confidence_predictions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY action_type
      HAVING COUNT(*) >= 3
      ORDER BY error DESC
    `;

    return rows.map((r) => ({
      actionType: r.action_type,
      sampleSize: r.sample_size,
      avgConfidence: Math.round(r.avg_confidence * 100) / 100,
      actualAccuracy: r.actual_accuracy ? Math.round(r.actual_accuracy * 100) / 100 : null,
      calibrationError: r.error ? Math.round(r.error * 100) / 100 : null,
    }));
  } catch (_e) { /* non-critical, intentionally silent */
    return [];
  }
}
