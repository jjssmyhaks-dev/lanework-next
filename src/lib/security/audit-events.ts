/**
 * Security Audit Events — structured logging for security-relevant events.
 *
 * Every security event is:
 * 1. Logged via Pino for real-time monitoring
 * 2. Stored in DB for audit trail
 * 3. Optionally triggers alerts (for critical events)
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "security-audit" });

// ── Event Types ──

export type SecurityEventType =
  | "auth.failed_login"
  | "auth.successful_login"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "auth.token_theft_detected"
  | "auth.session_invalidated"
  | "rate_limit.exceeded"
  | "rate_limit.ai_exceeded"
  | "webhook.signature_invalid"
  | "webhook.ip_blocked"
  | "input_guard.injection_detected"
  | "input_guard.high_risk_input"
  | "output_guard敏感_data_detected"
  | "circuit_breaker.opened"
  | "cost_guard.budget_exceeded"
  | "api.unauthorized_access"
  | "api.admin_access";

// ── Log a security event ──

export async function logSecurityEvent(params: {
  eventType: SecurityEventType;
  severity: "info" | "warning" | "critical";
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  blocked?: boolean;
}): Promise<void> {
  const { eventType, severity, userId, ip, userAgent, details, blocked } = params;

  // 1. Pino log
  const logFn = severity === "critical" ? log.error : severity === "warning" ? log.warn : log.info;
  logFn({ eventType, userId, ip, blocked, ...details }, `Security event: ${eventType}`);

  // 2. DB persistence (best effort)
  try {
    await sql`
      INSERT INTO security_events (id, event_type, severity, user_id, ip_address, user_agent, details, blocked, created_at)
      VALUES (gen_random_uuid(), ${eventType}, ${severity}, ${userId || null}, ${ip || null},
              ${userAgent || null}, ${JSON.stringify(details || {})}::jsonb, ${blocked || false}, NOW())
    `;
  } catch {
    // Don't fail on audit log errors
  }

  // 3. Alert on critical events
  if (severity === "critical") {
    try {
      await sql`
        INSERT INTO agent_alerts (id, tenant_id, agent_type, alert_type, severity, title, message, data, created_at)
        VALUES (gen_random_uuid(), NULL, 'security', ${eventType}, 'critical',
                ${`Security Alert: ${eventType}`},
                ${`A critical security event occurred: ${eventType}. ${details ? JSON.stringify(details) : ""}`},
                ${JSON.stringify({ eventType, userId, ip, ...details })}::jsonb, NOW())
      `;
    } catch {
      // Best effort
    }
  }
}

// ── Helper functions for common events ──

export async function logFailedLogin(email: string, ip: string, reason: string) {
  await logSecurityEvent({
    eventType: "auth.failed_login",
    severity: "warning",
    ip,
    details: { email, reason },
    blocked: true,
  });
}

export async function logSuccessfulLogin(userId: string, ip: string) {
  await logSecurityEvent({
    eventType: "auth.successful_login",
    severity: "info",
    userId,
    ip,
  });
}

export async function logTokenTheft(userId: string, ip: string, family: string) {
  await logSecurityEvent({
    eventType: "auth.token_theft_detected",
    severity: "critical",
    userId,
    ip,
    details: { family },
    blocked: true,
  });
}

export async function logRateLimitHit(ip: string, group: string, limit: number) {
  await logSecurityEvent({
    eventType: group === "ai" ? "rate_limit.ai_exceeded" : "rate_limit.exceeded",
    severity: "warning",
    ip,
    details: { group, limit },
    blocked: true,
  });
}

export async function logInjectionAttempt(userId: string, ip: string, pattern: string, input: string) {
  await logSecurityEvent({
    eventType: "input_guard.injection_detected",
    severity: "critical",
    userId,
    ip,
    details: { pattern, inputPreview: input.slice(0, 200) },
    blocked: true,
  });
}

export async function logWebhookInvalid(provider: string, ip: string, reason: string) {
  await logSecurityEvent({
    eventType: "webhook.signature_invalid",
    severity: "warning",
    ip,
    details: { provider, reason },
    blocked: true,
  });
}

// ── Ensure table exists ──

export async function ensureSecurityEventsTable() {
  await sql`CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    user_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    data JSONB DEFAULT '{}',
    blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, created_at DESC) WHERE severity = 'critical'`;
}
