/**
 * Agentic Harness — the self-improvement orchestrator.
 *
 * Runs continuously:
 * 1. Executes eval suite against all agents
 * 2. Compares results to baseline
 * 3. Detects performance regressions
 * 4. Triggers learning cycles when accuracy drops
 * 5. Logs all improvements for transparency
 */

import { neon } from "@neondatabase/serverless";
import { runFullEval, runAgentEval, type EvalResult, type EvalSummary } from "@/lib/eval-runner";
import { runTuningCycle, type TuningResult } from "./auto-tuner";
import { runLearningCycle, type LearningInsight } from "./learning";
import { generateAndStoreEvalCases } from "./eval-autogen";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "harness" });

// ── Types ──

export interface HarnessRun {
  id: string;
  timestamp: string;
  evalResults: EvalSummary;
  tuningResult: TuningResult;
  learningInsights: LearningInsight[];
  regressionDetected: boolean;
  regressionDetails: string[];
  baselineComparison: {
    previousScore: number | null;
    currentScore: number;
    delta: number | null;
  };
}

export interface HarnessStatus {
  lastRunAt: string | null;
  lastScore: number | null;
  baselineScore: number | null;
  trend: "improving" | "stable" | "declining" | "unknown";
  totalRuns: number;
  regressionsDetected: number;
}

// ── Run a full harness cycle ──

export async function runHarnessCycle(): Promise<HarnessRun> {
  const runId = crypto.randomUUID();
  const start = Date.now();

  log.info({ runId }, "Harness cycle starting");

  // 1. Get previous baseline
  const baseline = await getBaseline();

  // 2. Run eval suite
  log.info({ runId }, "Running eval suite");
  const evalResults = await runFullEval();

  // 3. Run tuning cycle (learning + risk adjustment + pattern extraction)
  log.info({ runId }, "Running tuning cycle");
  const tuningResult = await runTuningCycle();

  // 4. Run learning cycle for fresh insights
  const learning = await runLearningCycle(30);

  // 5. Detect regressions
  const regressionDetails: string[] = [];
  let regressionDetected = false;

  if (baseline.score !== null) {
    const delta = evalResults.overallAvgScore - baseline.score;

    if (delta < -0.05) {
      regressionDetected = true;
      regressionDetails.push(
        `Overall score dropped from ${baseline.score} to ${evalResults.overallAvgScore} (${(delta * 100).toFixed(1)}%)`
      );
    }

    // Check per-agent regressions
    for (const [agent, stats] of Object.entries(evalResults.byAgent)) {
      const prevAgent = baseline.byAgent[agent];
      if (prevAgent && stats.avgScore < prevAgent.avgScore - 0.1) {
        regressionDetected = true;
        regressionDetails.push(
          `${agent}: score dropped from ${prevAgent.avgScore} to ${stats.avgScore}`
        );
      }
    }
  }

  // 6. Persist run
  const harnessRun: HarnessRun = {
    id: runId,
    timestamp: new Date().toISOString(),
    evalResults,
    tuningResult,
    learningInsights: learning.topInsights,
    regressionDetected,
    regressionDetails,
    baselineComparison: {
      previousScore: baseline.score,
      currentScore: evalResults.overallAvgScore,
      delta: baseline.score !== null ? evalResults.overallAvgScore - baseline.score : null,
    },
  };

  try {
    await sql`
      INSERT INTO agent_eval_runs (id, tenant_id, agent_filter, total, passed, failed, avg_score, duration_ms, results, created_at)
      VALUES (${runId}, NULL, 'harness', ${evalResults.total}, ${evalResults.passed}, ${evalResults.failed},
              ${evalResults.overallAvgScore}, ${Date.now() - start}, ${JSON.stringify(harnessRun)}::jsonb, NOW())
    `;
  } catch (_e) { /* non-critical, intentionally silent */
    // Best effort
  }

  // 7. If regression detected, create alert
  if (regressionDetected) {
    try {
      await sql`
        INSERT INTO agent_alerts (id, tenant_id, agent_type, alert_type, severity, title, message, data, created_at)
        VALUES (gen_random_uuid(), NULL, 'system', 'performance_regression', 'warning',
                'Performance Regression Detected',
                ${`Agent performance dropped. Score: ${baseline.score} → ${evalResults.overallAvgScore}. ${regressionDetails.join("; ")}`},
                ${JSON.stringify({ runId, regressionDetails, evalSummary: evalResults })}::jsonb, NOW())
      `;
    } catch (_e) { /* non-critical, intentionally silent */
      // Best effort
    }
  }

  // 8. If improvement detected, log it
  if (baseline.score !== null && evalResults.overallAvgScore > baseline.score + 0.02) {
    log.info({
      runId,
      previous: baseline.score,
      current: evalResults.overallAvgScore,
      improvement: evalResults.overallAvgScore - baseline.score,
    }, "Performance improvement detected!");
  }

  // 9. Auto-generate new eval cases from production failures
  try {
    const autoGen = await generateAndStoreEvalCases(7, 5);
    if (autoGen.generated > 0) {
      log.info({ generated: autoGen.generated, stored: autoGen.stored, sources: autoGen.sources }, "Auto-generated eval cases from production data");
    }
  } catch (_e) { /* non-critical, intentionally silent */
    // Best effort
  }

  log.info({
    runId,
    score: evalResults.overallAvgScore,
    regression: regressionDetected,
    durationMs: Date.now() - start,
  }, "Harness cycle complete");

  return harnessRun;
}

// ── Get baseline (last stable eval) ──

async function getBaseline(): Promise<{ score: number | null; byAgent: Record<string, { avgScore: number }> }> {
  try {
    const [row] = await sql`
      SELECT results FROM agent_eval_runs
      WHERE agent_filter = 'harness' AND results->>'regressionDetected' = 'false'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (row?.results) {
      const data = row.results as HarnessRun;
      return {
        score: data.evalResults?.overallAvgScore || null,
        byAgent: data.evalResults?.byAgent || {},
      };
    }
  } catch (_e) { /* non-critical, intentionally silent */
    // Best effort
  }
  return { score: null, byAgent: {} };
}

// ── Get harness status ──

export async function getHarnessStatus(): Promise<HarnessStatus> {
  try {
    const rows = await sql`
      SELECT results, created_at FROM agent_eval_runs
      WHERE agent_filter = 'harness'
      ORDER BY created_at DESC LIMIT 10
    `;

    if (rows.length === 0) {
      return {
        lastRunAt: null,
        lastScore: null,
        baselineScore: null,
        trend: "unknown",
        totalRuns: 0,
        regressionsDetected: 0,
      };
    }

    const latest = rows[0].results as HarnessRun;
    const previous = rows.length > 1 ? (rows[1].results as HarnessRun) : null;

    let trend: HarnessStatus["trend"] = "stable";
    if (previous) {
      const delta = latest.evalResults.overallAvgScore - previous.evalResults.overallAvgScore;
      if (delta > 0.02) trend = "improving";
      else if (delta < -0.02) trend = "declining";
    }

    const regressionsDetected = rows.filter((r) => {
      const data = r.results as HarnessRun;
      return data.regressionDetected;
    }).length;

    return {
      lastRunAt: rows[0].created_at,
      lastScore: latest.evalResults.overallAvgScore,
      baselineScore: latest.baselineComparison?.previousScore,
      trend,
      totalRuns: rows.length,
      regressionsDetected,
    };
  } catch (_e) { /* non-critical, intentionally silent */
    return {
      lastRunAt: null,
      lastScore: null,
      baselineScore: null,
      trend: "unknown",
      totalRuns: 0,
      regressionsDetected: 0,
    };
  }
}
