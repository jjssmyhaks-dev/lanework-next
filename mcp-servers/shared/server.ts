/**
 * Lanework Shared MCP Server Base
 * All agent MCP servers extend this — provides PostgreSQL, logging, and utility methods.
 */

import { neon } from "@neondatabase/serverless";
import * as crypto from "node:crypto";

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

  async loadConfig(): Promise<void> {
    try {
      const rows: any[] = await this.sql`
        SELECT * FROM agent_configs WHERE agent_type = ${this.agentId}
      ` as any;
      if (rows.length > 0) {
        this.config = rows[0].config || {};
      }
    } catch { /* table may not exist */ }
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
        INSERT INTO agent_tasks (id, agent_id, action, status, input_data, created_at)
        VALUES (${id}, ${this.agentId}, ${action}, ${status}, ${data ? JSON.stringify(data) : "{}"}, NOW())
      `;
    } catch (e) { console.error(`[${this.agentId}] Log fail:`, e); }
    return id;
  }

  async logIntegrationEvent(integrationType: string, eventType: string, payload: any): Promise<void> {
    try {
      await this.sql`
        INSERT INTO webhook_events (id, integration_type, event_type, payload, created_at)
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
          ${data.origin}, ${data.destination}, ${data.customerName || ""}, ${data.customerPhone || ""}, NOW())
      `;
    } catch (e) { console.error(`[${this.agentId}] Create shipment fail:`, e); }
    return id;
  }
}
