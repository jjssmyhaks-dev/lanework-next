/**
 * Agent Rate Limiter — per-agent token bucket to prevent resource monopolization.
 *
 * Each agent type gets its own token bucket. Tokens refill at a fixed rate.
 * If a bucket is empty, the agent must wait until tokens are available.
 * This prevents one slow/hungry agent from blocking others.
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "agent-limiter" });

// ── Types ──

interface TokenBucket {
  tokens: number;
  maxTokens: number;
  refillRate: number;      // tokens per second
  lastRefill: number;
}

interface AgentLimitConfig {
  maxTokens: number;
  refillRate: number;
  maxConcurrent: number;
}

// ── Default Limits (tokens = operations per window) ──

const AGENT_LIMITS: Record<string, AgentLimitConfig> = {
  "shipment-poller":  { maxTokens: 20, refillRate: 0.033, maxConcurrent: 3 },  // 20/min
  "inventory-poller": { maxTokens: 5, refillRate: 0.008, maxConcurrent: 1 },   // 5/min
  "fleet-poller":     { maxTokens: 10, refillRate: 0.017, maxConcurrent: 2 },  // 10/min
  "compliance-poller":{ maxTokens: 3, refillRate: 0.005, maxConcurrent: 1 },   // 3/min
  "daily-report":     { maxTokens: 2, refillRate: 0.003, maxConcurrent: 1 },   // 2/min
  "workflow-engine":  { maxTokens: 10, refillRate: 0.017, maxConcurrent: 2 },  // 10/min
  "harness":          { maxTokens: 5, refillRate: 0.008, maxConcurrent: 1 },   // 5/min
  "chat-orchestrator":{ maxTokens: 30, refillRate: 0.05, maxConcurrent: 5 },   // 30/min
  "default":          { maxTokens: 10, refillRate: 0.017, maxConcurrent: 2 },  // 10/min
};

// ── State ──

const buckets = new Map<string, TokenBucket>();
const concurrentCounts = new Map<string, number>();

// ── Core Functions ──

function getBucket(agentType: string): TokenBucket {
  const existing = buckets.get(agentType);
  if (existing) return existing;

  const config = AGENT_LIMITS[agentType] || AGENT_LIMITS.default;
  const bucket: TokenBucket = {
    tokens: config.maxTokens,
    maxTokens: config.maxTokens,
    refillRate: config.refillRate,
    lastRefill: Date.now(),
  };
  buckets.set(agentType, bucket);
  return bucket;
}

function refillBucket(bucket: TokenBucket): void {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000; // seconds
  const refill = elapsed * bucket.refillRate;
  bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + refill);
  bucket.lastRefill = now;
}

/**
 * Check if an agent can run. Returns { allowed, waitMs }.
 */
export function checkAgentLimit(agentType: string): {
  allowed: boolean;
  tokens: number;
  maxTokens: number;
  waitMs: number;
  concurrent: number;
  maxConcurrent: number;
} {
  const bucket = getBucket(agentType);
  refillBucket(bucket);

  const config = AGENT_LIMITS[agentType] || AGENT_LIMITS.default;
  const concurrent = concurrentCounts.get(agentType) || 0;

  // Check token availability
  if (bucket.tokens < 1) {
    const waitMs = Math.ceil((1 - bucket.tokens) / bucket.refillRate * 1000);
    return {
      allowed: false,
      tokens: Math.floor(bucket.tokens),
      maxTokens: bucket.maxTokens,
      waitMs,
      concurrent,
      maxConcurrent: config.maxConcurrent,
    };
  }

  // Check concurrent limit
  if (concurrent >= config.maxConcurrent) {
    return {
      allowed: false,
      tokens: Math.floor(bucket.tokens),
      maxTokens: bucket.maxTokens,
      waitMs: 1000, // Retry in 1 second
      concurrent,
      maxConcurrent: config.maxConcurrent,
    };
  }

  return {
    allowed: true,
    tokens: Math.floor(bucket.tokens),
    maxTokens: bucket.maxTokens,
    waitMs: 0,
    concurrent,
    maxConcurrent: config.maxConcurrent,
  };
}

/**
 * Acquire a token — call before running an agent.
 * Returns true if acquired, false if rate limited.
 */
export function acquireToken(agentType: string): boolean {
  const bucket = getBucket(agentType);
  refillBucket(bucket);

  const config = AGENT_LIMITS[agentType] || AGENT_LIMITS.default;
  const concurrent = concurrentCounts.get(agentType) || 0;

  if (bucket.tokens < 1 || concurrent >= config.maxConcurrent) {
    return false;
  }

  bucket.tokens -= 1;
  concurrentCounts.set(agentType, concurrent + 1);
  return true;
}

/**
 * Release a token — call after an agent finishes.
 */
export function releaseToken(agentType: string): void {
  const current = concurrentCounts.get(agentType) || 0;
  concurrentCounts.set(agentType, Math.max(0, current - 1));
}

/**
 * Execute a function with rate limiting.
 */
export async function withAgentLimit<T>(
  agentType: string,
  fn: () => Promise<T>
): Promise<T> {
  const check = checkAgentLimit(agentType);
  if (!check.allowed) {
    log.warn({ agentType, waitMs: check.waitMs }, "Rate limited — waiting");
    await new Promise((r) => setTimeout(r, Math.min(check.waitMs, 5000)));
  }

  if (!acquireToken(agentType)) {
    throw new Error(`Rate limit exceeded for agent "${agentType}". Try again later.`);
  }

  try {
    return await fn();
  } finally {
    releaseToken(agentType);
  }
}

/**
 * Get rate limiter status for all agents.
 */
export function getAgentLimitStatus(): Array<{
  agentType: string;
  tokens: number;
  maxTokens: number;
  concurrent: number;
  maxConcurrent: number;
  config: AgentLimitConfig;
}> {
  const status: Array<{
    agentType: string;
    tokens: number;
    maxTokens: number;
    concurrent: number;
    maxConcurrent: number;
    config: AgentLimitConfig;
  }> = [];

  for (const [agentType, config] of Object.entries(AGENT_LIMITS)) {
    const bucket = getBucket(agentType);
    refillBucket(bucket);
    status.push({
      agentType,
      tokens: Math.floor(bucket.tokens),
      maxTokens: bucket.maxTokens,
      concurrent: concurrentCounts.get(agentType) || 0,
      maxConcurrent: config.maxConcurrent,
      config,
    });
  }

  return status;
}
