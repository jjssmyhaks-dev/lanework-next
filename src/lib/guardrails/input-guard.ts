/**
 * Input Guard — validates and sanitizes user input before it reaches
 * the AI agent or MCP tools. Catches prompt injection, oversized inputs,
 * and potentially harmful patterns.
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "input-guard" });

// ── Types ──

export interface InputGuardResult {
  safe: boolean;
  sanitized: string;
  reasons: string[];
  riskLevel: "none" | "low" | "medium" | "high";
}

// ── Blocked Patterns (prompt injection attempts) ──

const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction overrides
  /ignore\s+(?:all\s+)?(?:previous|prior|above|earlier|all)\s+(?:instructions?|prompts?|rules?|guidelines?)/i,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)/i,
  /forget\s+(?:everything|all|previous|your)\s+(?:you(?:'ve| have)|instructions?|rules?)/i,

  // Role hijacking
  /you\s+are\s+now\s+(?:a|an|the)\s+(?:different|new|another)/i,
  /act\s+as\s+(?:if|though)\s+you\s+(?:are|were|have)/i,
  /pretend\s+(?:you\s+are|to\s+be|you(?:'re| are))/i,
  /roleplay\s+as/i,
  /simulate\s+(?:being|a|an)\s+(?:different|new)/i,

  // System prompt extraction
  /(?:show|reveal|display|print|output|repeat|echo)\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?)/i,
  /what\s+(?:are|is)\s+your\s+(?:system\s+)?(?:prompt|instructions?|rules?)/i,
  /(?:copy|paste|dump)\s+(?:your|the)\s+(?:system|initial)\s+(?:prompt|message)/i,

  // Jailbreak attempts
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /bypass\s+(?:safety|security|filters?|restrictions?|rules?)/i,

  // Data exfiltration attempts
  /(?:send|email|post|upload)\s+(?:all\s+)?(?:the\s+)?(?:data|information|records?|customers?|users?|passwords?|keys?|tokens?)/i,
  /(?:dump|export|extract)\s+(?:all\s+)?(?:user|customer|password|secret|api[_\s]?key)/i,

  // SQL/code injection in chat context
  /(?:UNION\s+SELECT|DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO)/i,
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=\s*["']/i,
];

// ── Content Limits ──

const MAX_MESSAGE_LENGTH = 5000;
const MAX_SINGLE_TOKEN_LENGTH = 500;

// ── Main Guard Function ──

export function guardInput(input: string): InputGuardResult {
  const reasons: string[] = [];
  let riskLevel: InputGuardResult["riskLevel"] = "none";

  if (!input || typeof input !== "string") {
    return { safe: false, sanitized: "", reasons: ["Empty or invalid input"], riskLevel: "high" };
  }

  // 1. Length check
  let sanitized = input.trim();
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_MESSAGE_LENGTH);
    reasons.push(`Input truncated from ${input.length} to ${MAX_MESSAGE_LENGTH} chars`);
    riskLevel = "low";
  }

  if (sanitized.length === 0) {
    return { safe: false, sanitized: "", reasons: ["Empty input after trimming"], riskLevel: "none" };
  }

  // 2. Prompt injection detection
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      reasons.push(`Potential prompt injection detected: ${pattern.source.slice(0, 50)}`);
      riskLevel = "high";
      log.warn({ pattern: pattern.source.slice(0, 50), input: sanitized.slice(0, 100) }, "Prompt injection attempt detected");
    }
  }

  // 3. Unusual character sequences (potential encoding attacks)
  const nullChars = (sanitized.match(/\0/g) || []).length;
  if (nullChars > 0) {
    sanitized = sanitized.replace(/\0/g, "");
    reasons.push(`Removed ${nullChars} null characters`);
    riskLevel = "medium";
  }

  // 4. Excessive special characters (fuzzing/DoS)
  const specialRatio = (sanitized.match(/[^\w\s.,!?;:'"()-]/g) || []).length / sanitized.length;
  if (specialRatio > 0.3 && sanitized.length > 50) {
    reasons.push("High ratio of special characters — possible fuzzing attempt");
    const levelMap: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };
    const currentLevel = levelMap[riskLevel] || 0;
    const newLevel = Math.max(currentLevel, 1);
    const reverseMap: Record<number, string> = { 0: "none", 1: "low", 2: "medium", 3: "high" };
    riskLevel = reverseMap[newLevel] as "none" | "low" | "medium" | "high";
  }

  // 5. Repeated character DoS (e.g., "AAAAAAAAAAA...")
  const repeatedMatch = sanitized.match(/(.)\1{50,}/);
  if (repeatedMatch) {
    sanitized = sanitized.replace(/(.)\1{50,}/g, "$1".repeat(50));
    reasons.push("Repeated character sequence truncated");
    riskLevel = "low";
  }

  const safe = riskLevel !== "high";

  if (reasons.length > 0) {
    log.info({ reasons, riskLevel, inputLength: sanitized.length }, "Input guard triggered");
  }

  return { safe, sanitized, reasons, riskLevel };
}

// ── Specific Guards for MCP Tool Inputs ──

export function guardToolInput(integration: string, action: string, params: Record<string, unknown>): InputGuardResult {
  const reasons: string[] = [];
  let riskLevel: InputGuardResult["riskLevel"] = "none";
  const sanitized = { ...params };

  // Check all string params for injection
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string") {
      const result = guardInput(value);
      if (!result.safe) {
        reasons.push(`Param "${key}" failed input guard: ${result.reasons.join(", ")}`);
        riskLevel = "high";
      }
      sanitized[key] = result.sanitized;
    }
  }

  // Integration-specific guards
  if (integration === "shiprocket" && action === "cancel_shipment") {
    // Cancelling shipments is high-risk — add confirmation flag
    if (!sanitized.confirmed) {
      reasons.push("Shipment cancellation requires explicit confirmation");
      const levelMap: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };
      const currentLevel = levelMap[riskLevel] || 0;
      const newLevel = Math.max(currentLevel, 2);
      const reverseMap: Record<number, string> = { 0: "none", 1: "low", 2: "medium", 3: "high" };
      riskLevel = reverseMap[newLevel] as "none" | "low" | "medium" | "high";
    }
  }

  return {
    safe: riskLevel !== "high",
    sanitized: sanitized as unknown as string,
    reasons,
    riskLevel,
  };
}
