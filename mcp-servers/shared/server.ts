/**
 * Lanework Shared MCP Server Base
 * All agent MCP servers extend this — provides PostgreSQL, logging, and utility methods.
 */

import { neon } from "@neondatabase/serverless";
import * as crypto from "node:crypto";
import { pathToFileURL } from "node:url";

/**
 * Returns true when the current module is being run directly (e.g. `tsx index.ts`)
 * rather than imported by the app. Each MCP server file guards its stdio bootstrap
 * with this so importing the class as a library doesn't start an MCP process.
 */
export function isDirectRun(moduleUrl: string): boolean {
  return !!process.argv[1] && moduleUrl === pathToFileURL(process.argv[1]).href;
}

export class LaneworkMCPServer {
  protected sql: ReturnType<typeof neon>;
  protected agentId: string;
  protected config: Record<string, string>;

  constructor(agentId: string) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    this.sql = neon(process.env.DATABASE_URL);
    this.agentId = agentId;
    this.config = {};
  }

  /** Idempotently create tables that MCP tools depend on (new domain tables). */
  protected async ensureSchema(): Promise<void> {
    const stmts = [
      `CREATE TABLE IF NOT EXISTS eway_bills (
        id UUID PRIMARY KEY,
        ewb_no TEXT,
        shipment_id UUID,
        from_gstin TEXT,
        to_gstin TEXT,
        invoice_no TEXT,
        invoice_value NUMERIC,
        status TEXT DEFAULT 'generated',
        valid_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS docks (
        id UUID PRIMARY KEY,
        warehouse_id TEXT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'dock',
        capacity TEXT,
        status TEXT DEFAULT 'available',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS dock_bookings (
        id UUID PRIMARY KEY,
        warehouse_id TEXT,
        dock_id TEXT,
        carrier_name TEXT,
        vehicle_reg TEXT,
        booking_type TEXT,
        scheduled_from TIMESTAMPTZ,
        scheduled_to TIMESTAMPTZ,
        status TEXT DEFAULT 'booked',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id UUID PRIMARY KEY,
        vehicle_id TEXT,
        type TEXT,
        description TEXT,
        scheduled_date DATE,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'scheduled',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY,
        invoice_number TEXT,
        customer_name TEXT,
        total_amount NUMERIC,
        invoice_date TIMESTAMPTZ,
        source TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS pincodes (
        pincode TEXT PRIMARY KEY,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        city TEXT,
        state TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS pick_verifications (
        id UUID PRIMARY KEY,
        order_id TEXT,
        sku TEXT,
        expected_qty INT,
        scanned_qty INT,
        location TEXT,
        scanned_by TEXT,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`,
    ];
    for (const stmt of stmts) {
      try {
        await this.sql.unsafe(stmt);
      } catch (e) {
        console.error(`[${this.agentId}] ensureSchema failed for a statement:`, e);
      }
    }
  }

  async loadConfig(): Promise<void> {
    try {
      const rows: any[] = await this.sql`
        SELECT * FROM agent_configs WHERE agent_type = ${this.agentId}
      ` as any;
      if (rows.length > 0) {
        this.config = rows[0].config || {};
      }
    } catch { /* table may not exist */ }
    // Bootstrap tables MCP tools rely on (idempotent, non-fatal on failure)
    await this.ensureSchema();
  }

  /** Safe API call — returns fallback or null when env vars missing, never throws */
  protected async safeApiCall<T>(
    name: string, // human label for logging
    url: string,
    options: RequestInit & { requiresEnv?: string[] } = {},
    fallback?: T,
  ): Promise<{ ok: boolean; data: T | null; status: "live" | "simulated" | "error"; message: string }> {
    const required = options.requiresEnv || [];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
      return {
        ok: false, data: fallback || null, status: "simulated",
        message: `⚠️ ${name}: Missing ${missing.join(", ")}. Set in Vercel env vars. Returned ${fallback ? "cached/fallback data" : "null"}.`,
      };
    }

    try {
      const { requiresEnv: _, ...fetchOpts } = options as any;
      const res = await fetch(url, { ...fetchOpts, signal: AbortSignal.timeout(12000) });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, data: fallback || null, status: "error", message: `${name} failed: HTTP ${res.status} — ${text.slice(0, 200)}` };
      }
      const json = await res.json();
      return { ok: true, data: json, status: "live", message: `${name} — live` };
    } catch (e: any) {
      // Network error / timeout → graceful fallback
      return {
        ok: false, data: fallback || null, status: "simulated",
        message: `${name} unavailable (${e.message}). Using ${fallback ? "cached/fallback data" : "null"}.`,
      };
    }
  }

  /** Check if external API credentials are configured */
  protected hasEnv(...keys: string[]): boolean {
    return keys.every(k => !!process.env[k]);
  }

  async logAction(action: string, status: "started" | "completed" | "failed", data?: any): Promise<string> {
    const id = crypto.randomUUID();
    try {
      await this.sql`
        INSERT INTO agent_tasks (id, agent_type, action_type, status, reasoning_trace, input_data, created_at, updated_at)
        VALUES (${id}, ${this.agentId}, ${action}, ${status}, ${data ? JSON.stringify(data) : null}, ${JSON.stringify({})}::jsonb, NOW(), NOW())
      `;
    } catch (e) { console.error(`[${this.agentId}] Log fail:`, e); }
    return id;
  }

  async logIntegrationEvent(integrationType: string, eventType: string, payload: any): Promise<void> {
    try {
      await this.sql`
        INSERT INTO webhook_events (id, integration_id, event_type, payload, received_at)
        VALUES (${crypto.randomUUID()}, ${integrationType}, ${eventType}, ${JSON.stringify(payload)}, NOW())
      `;
    } catch (e) { console.error(`[${this.agentId}] Event log fail:`, e); }
  }

  async getIntegrationConfig(type: string): Promise<Record<string, any> | null> {
    try {
      const rows: any[] = await this.sql`
        SELECT config FROM integrations WHERE integration_type = ${type} AND status = 'connected'
      ` as any;
      return rows.length > 0 ? (rows[0].config || {}) : null;
    } catch { return null; }
  }

  getEnv(key: string, fallback?: string): string {
    return process.env[key] || this.config[key] || fallback || "";
  }

  async createShipment(data: {
    trackingNumber: string; carrier: string; origin: string;
    destination: string; customerName?: string; customerPhone?: string; status?: string;
  }): Promise<string> {
    const id = crypto.randomUUID();
    try {
      await this.sql`
        INSERT INTO shipments (id, tracking_number, carrier, status, origin, destination, customer_name, customer_phone, created_at)
        VALUES (${id}, ${data.trackingNumber}, ${data.carrier}, ${data.status || "pending"},
          ${JSON.stringify({ address: data.origin })}::jsonb, ${JSON.stringify({ address: data.destination })}::jsonb,
          ${data.customerName || ""}, ${data.customerPhone || ""}, NOW())
      `;
    } catch (e) { console.error(`[${this.agentId}] Create shipment fail:`, e); }
    return id;
  }
}
