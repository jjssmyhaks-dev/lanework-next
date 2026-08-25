/**
 * Approval Escalation — handles approval timeouts and escalations.
 *
 * Flow:
 * 1. Approval request created → starts with timeout clock
 * 2. After 1h (critical, risk >= 7): escalate to super admin
 * 3. After 8h: notify team lead
 * 4. After 24h: auto-reject with reason "No response within timeout"
 *
 * Runs periodically via the scheduler or can be triggered manually.
 */

import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "approval-escalation" });

// ── Config ──

const CRITICAL_ESCALATION_MS = 60 * 60 * 1000;   // 1 hour
const WARNING_ESCALATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const AUTO_REJECT_MS = 24 * 60 * 60 * 1000;        // 24 hours

// ── Escalation Result ──

export interface EscalationResult {
  escalated: number;
  notified: number;
  autoRejected: number;
  errors: string[];
}

// ── Process pending approvals ──

export async function processPendingApprovals(): Promise<EscalationResult> {
  const result: EscalationResult = { escalated: 0, notified: 0, autoRejected: 0, errors: [] };

  let pendingApprovals;
  try {
    pendingApprovals = await sql`
      SELECT id, tenant_id, agent_type, action_type, action_description,
             risk_score, created_at, status
      FROM agent_approvals
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    result.errors.push(`Failed to fetch pending approvals: ${msg}`);
    return result;
  }

  const now = Date.now();

  for (const approval of pendingApprovals) {
    const createdAt = new Date(approval.created_at).getTime();
    const ageMs = now - createdAt;

    try {
      // ── Auto-reject after 24h ──
      if (ageMs >= AUTO_REJECT_MS) {
        await sql`
          UPDATE agent_approvals
          SET status = 'auto_rejected',
              decided_at = NOW(),
              decision_reason = 'Auto-rejected: no response within 24 hours'
          WHERE id = ${approval.id}
        `;

        // Create alert about auto-rejection
        await sql`
          INSERT INTO agent_alerts (id, tenant_id, agent_type, alert_type, severity, title, message, data, created_at)
          VALUES (gen_random_uuid(), ${approval.tenant_id}, 'system', 'approval_timeout', 'warning',
                  'Approval Auto-Rejected',
                  ${`Approval for "${approval.action_description}" was auto-rejected after 24 hours without response.`},
                  ${JSON.stringify({ approvalId: approval.id, actionType: approval.action_type, riskScore: approval.risk_score })}::jsonb,
                  NOW())
        `;

        result.autoRejected++;
        log.info({ approvalId: approval.id, action: approval.action_type }, "Approval auto-rejected (timeout)");
        continue;
      }

      // ── Escalate critical items after 1h ──
      if (ageMs >= CRITICAL_ESCALATION_MS && approval.risk_score >= 7) {
        const alreadyEscalated = await sql`
          SELECT id FROM agent_approvals
          WHERE id = ${approval.id}
            AND escalation_level >= 2
          LIMIT 1
        `;

        if (alreadyEscalated.length === 0) {
          await sql`
            UPDATE agent_approvals
            SET escalation_level = 2,
                escalated_at = NOW(),
                escalated_to = 'super_admin'
            WHERE id = ${approval.id}
          `;

          await sql`
            INSERT INTO agent_alerts (id, tenant_id, agent_type, alert_type, severity, title, message, data, created_at)
            VALUES (gen_random_uuid(), ${approval.tenant_id}, 'system', 'approval_escalated', 'critical',
                    ${`URGENT: Approval needed — ${approval.action_type}`},
                    ${`${approval.action_description} (risk ${approval.risk_score}/10) has been pending for ${Math.round(ageMs / 60000)} minutes. Escalated to super admin.`},
                    ${JSON.stringify({ approvalId: approval.id, actionType: approval.action_type, riskScore: approval.risk_score, escalationLevel: 2 })}::jsonb,
                    NOW())
          `;

          result.escalated++;
          log.info({ approvalId: approval.id, action: approval.action_type }, "Critical approval escalated");
        }
      }

      // ── Notify team lead after 8h ──
      if (ageMs >= WARNING_ESCALATION_MS) {
        const alreadyNotified = await sql`
          SELECT id FROM agent_approvals
          WHERE id = ${approval.id}
            AND escalation_level >= 1
          LIMIT 1
        `;

        if (alreadyNotified.length === 0) {
          await sql`
            UPDATE agent_approvals
            SET escalation_level = 1,
                escalated_at = NOW(),
                escalated_to = 'team_lead'
            WHERE id = ${approval.id}
          `;

          await sql`
            INSERT INTO agent_alerts (id, tenant_id, agent_type, alert_type, severity, title, message, data, created_at)
            VALUES (gen_random_uuid(), ${approval.tenant_id}, 'system', 'approval_pending', 'warning',
                    ${`Approval pending for ${Math.round(ageMs / 3600000)}h — ${approval.action_type}`},
                    ${`${approval.action_description} has been pending. Please review.`},
                    ${JSON.stringify({ approvalId: approval.id, actionType: approval.action_type, riskScore: approval.risk_score, escalationLevel: 1 })}::jsonb,
                    NOW())
          `;

          result.notified++;
          log.info({ approvalId: approval.id }, "Approval notification sent");
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      result.errors.push(`Failed to process approval ${approval.id}: ${msg}`);
      log.error({ err: msg, approvalId: approval.id }, "Failed to process approval");
    }
  }

  if (result.escalated > 0 || result.notified > 0 || result.autoRejected > 0) {
    log.info({ ...result }, "Approval processing complete");
  }

  return result;
}

// ── Get escalation stats ──

export async function getEscalationStats(): Promise<{
  pendingCount: number;
  escalatedCount: number;
  avgWaitTimeMinutes: number;
  oldestPendingMinutes: number | null;
}> {
  try {
    const [stats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending_count,
        COUNT(*) FILTER (WHERE escalation_level >= 2)::int as escalated_count,
        AVG(CASE WHEN status = 'pending'
            THEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 60
            END)::float as avg_wait_minutes,
        MIN(CASE WHEN status = 'pending'
            THEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 60
            END)::float as oldest_wait_minutes
      FROM agent_approvals
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `;

    return {
      pendingCount: stats?.pending_count || 0,
      escalatedCount: stats?.escalated_count || 0,
      avgWaitTimeMinutes: Math.round(stats?.avg_wait_minutes || 0),
      oldestPendingMinutes: stats?.oldest_wait_minutes ? Math.round(stats.oldest_wait_minutes) : null,
    };
  } catch {
    return { pendingCount: 0, escalatedCount: 0, avgWaitTimeMinutes: 0, oldestPendingMinutes: null };
  }
}
