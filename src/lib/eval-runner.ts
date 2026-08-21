/**
 * AI Agent Evaluation Runner
 * 
 * Runs test cases against our AI agents and produces scored results.
 * Dimensions: keyword_match, length_ok, latency_ok, safety, completeness
 */

import { getEvalDataset, type EvalTestCase } from "./eval-dataset";
import { analyzeShipmentStatus, optimizeRoute, analyzeSentiment, generateTaskReasoning } from "./ai";
import { scoreSafety } from "./eval-guardrails";

export interface EvalResult {
  testId: string;
  agent: string;
  scenario: string;
  input: Record<string, unknown>;
  output: string;
  latencyMs: number;
  scores: {
    keywordMatch: number;    // 0-1 : fraction of expected keywords found in output
    lengthOk: number;        // 0-1 : 1 if meets minLength, else ratio
    latencyOk: number;       // 0-1 : 1 if under maxLatencyMs, else ratio
    safety: number;          // 0-1 : safety score from guardrails
    overall: number;         // 0-1 : weighted average
  };
  passed: boolean;           // overall >= 0.5
  safetyFlags: string[];
  error?: string;
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  byAgent: Record<string, { total: number; passed: number; avgScore: number }>;
  overallAvgScore: number;
  totalDurationMs: number;
  results: EvalResult[];
}

function computeKeywordScore(output: string, keywords: string[]): number {
  if (keywords.length === 0) return 1;
  const lower = output.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) hits++;
  }
  return hits / keywords.length;
}

async function runSingleTest(test: EvalTestCase): Promise<EvalResult> {
  const start = Date.now();
  let output = "";
  let error: string | undefined;

  try {
    switch (test.agent) {
      case "shipment-tracking":
        output = await analyzeShipmentStatus(test.input.trackingNumber as string);
        break;
      case "route-optimization":
        output = await optimizeRoute(
          test.input.origin as string,
          test.input.destination as string,
          (test.input.constraints as string[]) || []
        );
        break;
      case "customer-support":
        output = await analyzeSentiment(test.input.text as string);
        break;
      case "reasoning":
        output = await generateTaskReasoning(
          test.input.taskType as string,
          test.input.context as string
        );
        break;
      default:
        error = `Unknown agent: ${test.agent}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    output = "";
  }

  const latencyMs = Date.now() - start;
  const keywordScore = error ? 0 : computeKeywordScore(output, test.expectedKeywords);
  const lengthScore = error ? 0 : Math.min(output.length / test.minLength, 1);
  const latencyScore = error ? 0 : Math.min(test.maxLatencyMs / Math.max(latencyMs, 1), 1);
  const safetyScore = error ? 0 : scoreSafety(output, test.input.text as string | undefined);

  // Safety is a gate: if it fails, overall is capped at 0.3
  const safetyGate = safetyScore >= 0.5 ? 1 : 0.3;

  const overall =
    keywordScore * 0.25 +
    lengthScore * 0.20 +
    latencyScore * 0.15 +
    safetyScore * 0.20 +
    (error ? 0 : 0.20); // 20% for successful completion

  const finalOverall = Math.min(overall, safetyScore < 0.5 ? 0.3 : overall);

  // Collect safety flags
  const safetyFlags: string[] = [];
  if (safetyScore < 1) safetyFlags.push("safety_check_triggered");
  if (safetyScore < 0.5) safetyFlags.push("unsafe_output");

  return {
    testId: test.id,
    agent: test.agent,
    scenario: test.scenario,
    input: test.input,
    output: error ? `ERROR: ${error}` : output,
    latencyMs,
    scores: {
      keywordMatch: Math.round(keywordScore * 100) / 100,
      lengthOk: Math.round(lengthScore * 100) / 100,
      latencyOk: Math.round(latencyScore * 100) / 100,
      safety: Math.round(safetyScore * 100) / 100,
      overall: Math.round(finalOverall * 100) / 100,
    },
    passed: finalOverall >= 0.5,
    safetyFlags,
    error,
  };
}

export async function runFullEval(): Promise<EvalSummary> {
  const dataset = getEvalDataset();
  const results: EvalResult[] = [];
  const start = Date.now();

  for (const test of dataset) {
    const result = await runSingleTest(test);
    results.push(result);

    // Small delay between tests to avoid rate limiting
    if (dataset.indexOf(test) < dataset.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const totalDurationMs = Date.now() - start;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  const byAgent: EvalSummary["byAgent"] = {};
  for (const r of results) {
    if (!byAgent[r.agent]) {
      byAgent[r.agent] = { total: 0, passed: 0, avgScore: 0 };
    }
    byAgent[r.agent].total++;
    if (r.passed) byAgent[r.agent].passed++;
  }

  for (const agent of Object.keys(byAgent)) {
    const agentResults = results.filter((r) => r.agent === agent);
    byAgent[agent].avgScore =
      Math.round(
        (agentResults.reduce((sum, r) => sum + r.scores.overall, 0) / agentResults.length) * 100
      ) / 100;
  }

  const overallAvgScore =
    Math.round(
      (results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length) * 100
    ) / 100;

  return {
    total: results.length,
    passed,
    failed,
    byAgent,
    overallAvgScore,
    totalDurationMs,
    results,
  };
}

/**
 * Run eval for a specific agent only
 */
export async function runAgentEval(agent: EvalTestCase["agent"]): Promise<EvalSummary> {
  const dataset = getEvalDataset().filter((t) => t.agent === agent);
  const results: EvalResult[] = [];
  const start = Date.now();

  for (const test of dataset) {
    results.push(await runSingleTest(test));
    await new Promise((r) => setTimeout(r, 200));
  }

  const totalDurationMs = Date.now() - start;
  const passed = results.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    byAgent: {
      [agent]: {
        total: results.length,
        passed,
        avgScore:
          Math.round(
            (results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length) * 100
          ) / 100,
      },
    },
    overallAvgScore:
      Math.round(
        (results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length) * 100
      ) / 100,
    totalDurationMs,
    results,
  };
}
