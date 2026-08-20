/**
 * Audit Trail — immutable log of every agent decision, action, and outcome.
 *
 * Every agent action (whether auto-executed or user-approved) is logged here
 * with full context: what was attempted, what happened, risk score, trust level,
 * and any approval record.
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "agent-audit" });

export interface AuditEntry {
  id: string;
  tenantId?: string;
  agentType: string;
  action: string;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  riskScore: number;
  trustLevel: string;
  approvalId?: string;
  userId?: string;
  mode: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

/**
 * Log an agent action to the audit trail.
 */
export async function auditLog(entry: Record<string, unknown>): Promise<string> {
  const id = crypto.randomUUID();

  try {
    await sql`
      INSERT INTO agent_audit_log (
        id, tenant_id, agent_type, action, input_data, output_data,
        risk_score, trust_level, approval_id, user_id, mode,
        duration_ms, success, error_message, timestamp
      ) VALUES (
        ${id}, ${entry.tenantId || null}, ${entry.agentType}, ${entry.action},
        ${JSON.stringify(entry.inputData || {})}::jsonb, ${JSON.stringify(entry.outputData || {})}::jsonb,
        ${entry.riskScore || 0}, ${entry.trustLevel || 'propose'}, ${entry.approvalId || null},
        ${entry.userId || null}, ${entry.mode || 'auto'}, ${entry.durationMs || 0},
        ${entry.success !== false}, ${entry.errorMessage || null}, NOW()
      )
    `;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ err: msg }, "Failed to write audit log");
  }

  return id;
}

/**
 * Get audit log entries for a tenant.
 */
export async function getAuditLog(
  tenantId: string | null,
  opts: {
    limit?: number;
    agentType?: string;
    action?: string;
    since?: Date;
  } = {}
): Promise<AuditEntry[]> {
  const limit = opts.limit || 100;
  const since = opts.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

  let rows;
  if (opts.agentType) {
    rows = await sql`
      SELECT * FROM agent_audit_log
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
        AND agent_type = ${opts.agentType}
        AND timestamp >= ${since}
      ORDER BY timestamp DESC LIMIT ${limit}
    `;
  } else {
    rows = await sql`
      SELECT * FROM agent_audit_log
      WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
        AND timestamp >= ${since}
      ORDER BY timestamp DESC LIMIT ${limit}
    `;
  }

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    agentType: r.agent_type,
    action: r.action,
    inputData: typeof r.input_data === "string" ? JSON.parse(r.input_data) : r.input_data,
    outputData: typeof r.output_data === "string" ? JSON.parse(r.output_data) : r.output_data,
    riskScore: r.risk_score,
    trustLevel: r.trust_level,
    approvalId: r.approval_id,
    userId: r.user_id,
    mode: r.mode,
    durationMs: r.duration_ms,
    success: r.success,
    errorMessage: r.error_message,
    timestamp: r.timestamp,
  }));
}

/**
 * Get audit stats for a tenant.
 */
export async function getAuditStats(tenantId: string | null): Promise<{
  totalActions: number;
  autoExecuted: number;
  approvedByUser: number;
  rejectedByUser: number;
  failedActions: number;
  avgRiskScore: number;
  avgDurationMs: number;
}> {
  const [row] = await sql`
    SELECT
      COUNT(*)::int as total_actions,
      COUNT(*) FILTER (WHERE mode IN ('auto', 'live', 'simulated', 'db-fallback'))::int as auto_executed,
      COUNT(*) FILTER (WHERE mode = 'approved')::int as approved_by_user,
      COUNT(*) FILTER (WHERE mode = 'rejected')::int as rejected_by_user,
      COUNT(*) FILTER (WHERE success = false)::int as failed_actions,
      COALESCE(AVG(risk_score), 0)::float as avg_risk_score,
      COALESCE(AVG(duration_ms), 0)::float as avg_duration_ms
    FROM agent_audit_log
    WHERE (${tenantId}::text IS NULL OR tenant_id = ${tenantId})
      AND timestamp >= NOW() - INTERVAL '30 days'
  `;

  return {
    totalActions: row.total_actions || 0,
    autoExecuted: row.auto_executed || 0,
    approvedByUser: row.approved_by_user || 0,
    rejectedByUser: row.rejected_by_user || 0,
    failedActions: row.failed_actions || 0,
    avgRiskScore: Math.round((row.avg_risk_score || 0) * 10) / 10,
    avgDurationMs: Math.round(row.avg_duration_ms || 0),
  };
}
