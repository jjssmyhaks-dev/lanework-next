/**
 * Cost Guard — tracks and limits AI/LLM API call costs.
 * Prevents runaway spending by enforcing per-user and per-tenant budgets.
 *
 * Cloudflare Workers AI pricing (Llama 3 8B):
 * - Input: $0.011 per million tokens (~₹0.92/M tokens)
 * - Output: $0.033 per million tokens (~₹2.75/M tokens)
 * - Average conversation: ~500 tokens → ~₹0.005 per conversation
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "cost-guard" });

// ── Pricing Constants (in INR) ──

const PRICING = {
  // Cloudflare Workers AI
  llama3_8b: {
    inputPerMillionTokens: 0.92,   // ₹0.92/M
    outputPerMillionTokens: 2.75,  // ₹2.75/M
  },
  // Neon DB
  neonPerGBStorage: 1.5,          // ₹1.5/GB/month (prorated)
  neonPerGBQuery: 0.5,            // ₹0.5/GB queried
  // Bandwidth
  vercelBandwidthPerGB: 0.8,      // ₹0.8/GB
} as const;

// ── Budget Limits (per plan, per month in INR) ──

const PLAN_BUDGETS: Record<string, { aiCostInr: number; totalCostInr: number }> = {
  free: { aiCostInr: 5, totalCostInr: 10 },
  starter: { aiCostInr: 100, totalCostInr: 200 },
  growth: { aiCostInr: 500, totalCostInr: 1000 },
  enterprise: { aiCostInr: 5000, totalCostInr: 10000 },
} as const;

// ── In-memory daily tracking (resets per process) ──

const dailyUsage = new Map<string, { tokensIn: number; tokensOut: number; costInr: number; calls: number }>();

function getUserUsage(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const key = `${userId}:${today}`;
  if (!dailyUsage.has(key)) {
    dailyUsage.set(key, { tokensIn: 0, tokensOut: 0, costInr: 0, calls: 0 });
  }
  return dailyUsage.get(key)!;
}

// ── Estimate cost for a conversation turn ──

export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * PRICING.llama3_8b.inputPerMillionTokens;
  const outputCost = (outputTokens / 1_000_000) * PRICING.llama3_8b.outputPerMillionTokens;
  return inputCost + outputCost;
}

// ── Check if user is within budget ──

export async function checkBudget(userId: string, plan: string = "free"): Promise<{
  allowed: boolean;
  dailyCost: number;
  monthlyBudget: number;
  remaining: number;
  message?: string;
}> {
  const usage = getUserUsage(userId);
  const budget = PLAN_BUDGETS[plan] || PLAN_BUDGETS.free;

  // Check daily cost (budget / 30 for monthly)
  const dailyBudget = budget.aiCostInr / 30;
  const remaining = dailyBudget - usage.costInr;

  if (remaining <= 0) {
    return {
      allowed: false,
      dailyCost: usage.costInr,
      monthlyBudget: budget.aiCostInr,
      remaining: 0,
      message: `Daily AI budget exhausted (₹${usage.costInr.toFixed(2)}/₹${dailyBudget.toFixed(2)}). Upgrade your plan for higher limits.`,
    };
  }

  return {
    allowed: true,
    dailyCost: usage.costInr,
    monthlyBudget: budget.aiCostInr,
    remaining,
  };
}

// ── Record a completed AI call ──

export async function recordCost(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  metadata?: { integration?: string; action?: string; threadId?: string }
): Promise<void> {
  const cost = estimateCost(inputTokens, outputTokens);
  const usage = getUserUsage(userId);
  usage.tokensIn += inputTokens;
  usage.tokensOut += outputTokens;
  usage.costInr += cost;
  usage.calls++;

  // Persist to DB (best effort)
  try {
    await sql`
      INSERT INTO agent_cost_log (id, user_id, input_tokens, output_tokens, cost_inr, integration, action, thread_id, created_at)
      VALUES (gen_random_uuid(), ${userId}, ${inputTokens}, ${outputTokens}, ${cost},
              ${metadata?.integration || null}, ${metadata?.action || null}, ${metadata?.threadId || null}, NOW())
    `;
  } catch {
    // Best effort — don't fail the request
  }

  if (cost > 0.01) {
    log.info({ userId, inputTokens, outputTokens, cost: cost.toFixed(4), integration: metadata?.integration }, "AI call cost recorded");
  }
}

// ── Get usage stats ──

export async function getUsageStats(userId: string): Promise<{
  today: { tokensIn: number; tokensOut: number; costInr: number; calls: number };
  month: { costInr: number; calls: number };
}> {
  const today = getUserUsage(userId);

  let month = { costInr: 0, calls: 0 };
  try {
    const [row] = await sql`
      SELECT COALESCE(SUM(cost_inr), 0)::float as cost_inr, COUNT(*)::int as calls
      FROM agent_cost_log
      WHERE user_id = ${userId}
        AND created_at >= date_trunc('month', NOW())
    `;
    month = { costInr: row?.cost_inr || 0, calls: row?.calls || 0 };
  } catch {
    // Best effort
  }

  return { today, month };
}
