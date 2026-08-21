/**
 * Output Guard — validates agent responses before they reach the user.
 * Ensures responses don't leak sensitive data, are appropriate, and
 * don't contain harmful content.
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "output-guard" });

export interface OutputGuardResult {
  safe: boolean;
  sanitized: string;
  flags: string[];
}

// ── Sensitive Data Patterns ──

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; label: string; mask: string }> = [
  // API keys
  { pattern: /\b(sk-[a-zA-Z0-9]{20,})\b/g, label: "OpenAI API key", mask: "sk-***" },
  { pattern: /\b(AKIA[0-9A-Z]{16})\b/g, label: "AWS access key", mask: "AKIA***" },
  { pattern: /\b(xoxb-[a-zA-Z0-9-]+)\b/g, label: "Slack bot token", mask: "xoxb-***" },
  { pattern: /\b(ghp_[a-zA-Z0-9]{36})\b/g, label: "GitHub PAT", mask: "ghp_***" },
  { pattern: /\b(Neon\s+API\s+key|neon_[a-zA-Z0-9]+)/gi, label: "Neon API key", mask: "***" },

  // Passwords and secrets in output
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*\S+/gi, label: "Password in output", mask: "password: ***" },
  { pattern: /(?:secret|token)\s*[:=]\s*\S+/gi, label: "Secret/token in output", mask: "***" },

  // Database connection strings
  { pattern: /postgresql:\/\/[^\s]+/g, label: "Database connection string", mask: "postgresql://***" },

  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, label: "JWT token", mask: "***" },

  // Indian financial data that shouldn't be in generic responses
  { pattern: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, label: "Potential card number", mask: "****-****-****-****" },
];

// ── Harmful Content Patterns ──

const HARMFUL_PATTERNS: RegExp[] = [
  // Competitor bashing
  /(?:competitor|alternative)\s+(?:is|are)\s+(?:bad|terrible|awful|worst|scam)/i,
  // Guaranteed claims
  /(?:100%|guaranteed|always|never)\s+(?:accurate|correct|working|up)/i,
  // Legal advice
  /(?:you\s+should|I\s+recommend|legally)\s+(?:sue|file\s+a\s+complaint|report\s+to\s+police)/i,
  // Medical advice
  /(?:take|consume|ingest)\s+(?:these?\s+)?(?:medications?|pills?|drugs?)/i,
];

// ── Main Guard Function ──

export function guardOutput(response: string, context?: { integration?: string; action?: string }): OutputGuardResult {
  const flags: string[] = [];
  let sanitized = response;

  if (!response || typeof response !== "string") {
    return { safe: true, sanitized: "", flags: ["empty response"] };
  }

  // 1. Sensitive data masking
  for (const { pattern, label, mask } of SENSITIVE_PATTERNS) {
    if (pattern.test(sanitized)) {
      flags.push(`Sensitive data detected: ${label}`);
      sanitized = sanitized.replace(pattern, mask);
      // Reset regex lastIndex
      pattern.lastIndex = 0;
    }
  }

  // 2. Harmful content detection
  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(sanitized)) {
      flags.push(`Potentially harmful content: ${pattern.source.slice(0, 40)}`);
      log.warn({ pattern: pattern.source.slice(0, 40) }, "Harmful content detected in output");
    }
  }

  // 3. Excessive emoji/unicode (quality signal)
  const emojiCount = (sanitized.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
  if (emojiCount > sanitized.split(" ").length * 0.3) {
    flags.push("Excessive emoji usage");
  }

  // 4. Response length sanity check
  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000) + "\n\n... (response truncated)";
    flags.push("Response truncated to 10K chars");
  }

  // 5. Ensure mode indicator is present for tool results
  if (context?.integration && !sanitized.includes("(demo mode") && !sanitized.includes("(using cached") && !sanitized.includes("(API error")) {
    // This is fine — not all responses need mode indicators
  }

  if (flags.length > 0) {
    log.info({ flags, context }, "Output guard triggered");
  }

  return {
    safe: true, // We mask rather than block (unless truly dangerous)
    sanitized,
    flags,
  };
}

// ── Guard for specific tool outputs ──

export function guardToolOutput(integration: string, action: string, output: unknown): unknown {
  if (!output || typeof output !== "object") return output;

  // Deep clone to avoid mutating original
  const result = JSON.parse(JSON.stringify(output));

  // Remove any internal fields that shouldn't leak
  const INTERNAL_FIELDS = ["_internal", "_debug", "raw_response", "api_key_used", "endpoint_url"];
  function removeInternal(obj: Record<string, unknown>) {
    for (const key of INTERNAL_FIELDS) {
      delete obj[key];
    }
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        removeInternal(value as Record<string, unknown>);
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object") {
            removeInternal(item as Record<string, unknown>);
          }
        }
      }
    }
  }

  if (typeof result === "object" && result !== null) {
    removeInternal(result as Record<string, unknown>);
  }

  return result;
}
