/**
 * Lanework Shared MCP Server Base
 * All agent MCP servers extend this — provides PostgreSQL, logging, and utility methods.
 */

import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

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

  /** Load config from database */
  async loadConfig(): Promise<void> {
    try {
      const rows = await this.sql`
        SELECT * FROM agent_configs WHERE agent_type = ${this.agentId}
      `;
      if (rows.length > 0) {
        this.config = rows[0].config || {};
      }
    } catch {
      // Table might not exist — graceful fallback
    }
  }

  /** Log an agent action */
  async logAction(action: string, status: "started" | "completed" | "failed", data?: any): Promise<string> {
    const id = crypto.randomUUID();
    try {
      await this.sql`
        INSERT INTO agent_tasks (id, agent_id, action, status, input_data, created_at)
        VALUES (${id}, ${this.agentId}, ${action}, ${status}, ${data ? JSON.stringify(data) : "{}"}, NOW())
      `;
    } catch (e) {
      console.error(`[${this.agentId}] Failed to log action:`, e);
    }
    return id;
  }

  /** Log an integration event */
  async logIntegrationEvent(integrationType: string, eventType: string, payload: any): Promise<void> {
    const id = crypto.randomUUID();
    try {
      await this.sql`
        INSERT INTO webhook_events (id, integration_type, event_type, payload, created_at)
        VALUES (${id}, ${integrationType}, ${eventType}, ${JSON.stringify(payload)}, NOW())
      `;
    } catch (e) {
      console.error(`[${this.agentId}] Failed to log integration event:`, e);
    }
  }

  /** Fetch connected integration config */
  async getIntegrationConfig(type: string): Promise<Record<string, any> | null> {
    try {
      const rows = await this.sql`
        SELECT config FROM integrations WHERE type = ${type} AND status = 'connected'
      `;
      return rows.length > 0 ? (rows[0].config || {}) : null;
    } catch {
      return null;
    }
  }

  /** Create a shipment record */
  async createShipment(data: {
    trackingNumber: string;
    carrier: string;
    origin: string;
    destination: string;
    customerName?: string;
    customerPhone?: string;
    status?: string;
  }): Promise<string> {
    const id = crypto.randomUUID();
    try {
      await this.sql`
        INSERT INTO shipments (id, tracking_number, carrier, status, origin, destination, customer_name, customer_phone, created_at)
        VALUES (
          ${id}, ${data.trackingNumber}, ${data.carrier},
          ${data.status || "pending"},
          ${data.origin}, ${data.destination},
          ${data.customerName || ""}, ${data.customerPhone || ""},
          NOW()
        )
      `;
    } catch (e) {
      console.error(`[${this.agentId}] Failed to create shipment:`, e);
    }
    return id;
  }

  /** Fetch environment variable with fallback */
  getEnv(key: string, fallback?: string): string {
    const val = process.env[key] || this.config[key] || fallback;
    if (!val) throw new Error(`Missing required config: ${key}`);
    return val;
  }
}
