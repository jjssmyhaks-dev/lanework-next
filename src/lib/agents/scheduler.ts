/**
 * Agent Scheduler — runs pollers on configurable intervals using node-cron.
 *
 * In development: uses in-process node-cron.
 * In production (Vercel): uses Vercel Cron via /api/agents/cron endpoint.
 *
 * The scheduler is initialized once per process and runs in the background.
 */

import cron from "node-cron";
import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "agent-scheduler" });

// ── Poller Registry ──

export type PollerFn = () => Promise<{ checked: number; alerts: number; errors: number }>;

interface PollerConfig {
  name: string;
  schedule: string; // cron expression
  fn: PollerFn;
  enabled: boolean;
}

const pollers: PollerConfig[] = [];
let schedulerRunning = false;

/**
 * Register a poller with its schedule.
 */
export function registerPoller(name: string, schedule: string, fn: PollerFn): void {
  // Don't duplicate
  if (pollers.find((p) => p.name === name)) {
    log.warn({ name }, "Poller already registered, skipping");
    return;
  }
  pollers.push({ name, schedule, fn, enabled: true });
  log.info({ name, schedule }, "Poller registered");
}

/**
 * Start the scheduler (registers cron jobs).
 */
export function startScheduler(): void {
  if (schedulerRunning) {
    log.warn("Scheduler already running");
    return;
  }

  for (const poller of pollers) {
    if (!poller.enabled) {
      log.info({ name: poller.name }, "Poller disabled, skipping");
      continue;
    }

    cron.schedule(poller.schedule, async () => {
      await runPoller(poller);
    });

    log.info({ name: poller.name, schedule: poller.schedule }, "Poller scheduled");
  }

  schedulerRunning = true;
  log.info({ count: pollers.length }, "Agent scheduler started");
}

/**
 * Run a single poller manually (for Vercel Cron endpoint).
 */
export async function runPollerByName(name: string): Promise<{
  success: boolean;
  checked: number;
  alerts: number;
  errors: number;
  durationMs: number;
}> {
  const poller = pollers.find((p) => p.name === name);
  if (!poller) {
    log.warn({ name }, "Unknown poller");
    return { success: false, checked: 0, alerts: 0, errors: 1, durationMs: 0 };
  }
  const start = Date.now();
  const result = await runPoller(poller);
  return { ...result, success: true, durationMs: Date.now() - start };
}

/**
 * Run all registered pollers (for manual trigger).
 */
export async function runAllPollers(): Promise<Array<{
  name: string;
  success: boolean;
  checked: number;
  alerts: number;
  errors: number;
}>> {
  const results = [];
  for (const poller of pollers) {
    if (!poller.enabled) continue;
    const start = Date.now();
    const result = await runPoller(poller);
    results.push({ name: poller.name, success: result.errors === 0, ...result });
  }
  return results;
}

/**
 * Get status of all pollers.
 */
export async function getPollerStatus(): Promise<Array<{
  name: string;
  schedule: string;
  enabled: boolean;
  lastRunAt: Date | null;
  lastStatus: string;
  itemsChecked: number;
  alertsGenerated: number;
}>> {
  const rows = await sql`SELECT * FROM agent_poller_state`;
  const stateMap = new Map(rows.map((r) => [r.poller_name, r]));

  return pollers.map((p) => {
    const state = stateMap.get(p.name);
    return {
      name: p.name,
      schedule: p.schedule,
      enabled: p.enabled,
      lastRunAt: state?.last_run_at || null,
      lastStatus: state?.last_status || "never_run",
      itemsChecked: state?.items_checked || 0,
      alertsGenerated: state?.alerts_generated || 0,
    };
  });
}

// ── Internal ──

import { acquireToken, releaseToken, checkAgentLimit } from "./agent-limiter";

async function runPoller(poller: PollerConfig): Promise<{
  checked: number;
  alerts: number;
  errors: number;
}> {
  // Check rate limit before running
  const limitCheck = checkAgentLimit(poller.name);
  if (!limitCheck.allowed) {
    log.warn({ name: poller.name, waitMs: limitCheck.waitMs, concurrent: limitCheck.concurrent }, "Poller rate limited — skipping");
    return { checked: 0, alerts: 0, errors: 0 }; // Skip silently
  }

  if (!acquireToken(poller.name)) {
    log.warn({ name: poller.name }, "Poller could not acquire token — skipping");
    return { checked: 0, alerts: 0, errors: 0 };
  }

  log.info({ name: poller.name }, "Poller starting");

  // Mark as running
  try {
    await sql`
      INSERT INTO agent_poller_state (poller_name, last_status, updated_at)
      VALUES (${poller.name}, 'running', NOW())
      ON CONFLICT (poller_name)
      DO UPDATE SET last_status = 'running', updated_at = NOW()
    `;
  } catch {
    // Best effort
  }

  let result: { checked: number; alerts: number; errors: number };
  try {
    result = await poller.fn();

    // Mark as success
    await sql`
      INSERT INTO agent_poller_state (poller_name, last_run_at, last_status, items_checked, alerts_generated, updated_at)
      VALUES (${poller.name}, NOW(), 'success', ${result.checked}, ${result.alerts}, NOW())
      ON CONFLICT (poller_name)
      DO UPDATE SET last_run_at = NOW(), last_status = 'success',
                    items_checked = ${result.checked}, alerts_generated = ${result.alerts}, updated_at = NOW()
    `;

    log.info({ name: poller.name, ...result }, "Poller completed");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error({ name: poller.name, err: msg }, "Poller failed");
    result = { checked: 0, alerts: 0, errors: 1 };

    // Mark as error
    try {
      await sql`
        INSERT INTO agent_poller_state (poller_name, last_run_at, last_status, error_message, updated_at)
        VALUES (${poller.name}, NOW(), 'error', ${msg}, NOW())
        ON CONFLICT (poller_name)
        DO UPDATE SET last_run_at = NOW(), last_status = 'error', error_message = ${msg}, updated_at = NOW()
      `;
    } catch {
      // Best effort
    }
  } finally {
    releaseToken(poller.name);
  }

  return result;
}
