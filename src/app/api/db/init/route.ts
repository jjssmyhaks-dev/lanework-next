import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    // Auth
    await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT NOT NULL UNIQUE, password_hash TEXT, email_verified TIMESTAMP, image TEXT, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;

    // User flow tables
    await sql`CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, plan TEXT DEFAULT 'starter', status TEXT DEFAULT 'active', trial_start TIMESTAMPTZ DEFAULT NOW(), trial_end TIMESTAMPTZ, payment_method_added BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS agent_trust_configs (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, agent_type TEXT NOT NULL, trust_level TEXT DEFAULT 'propose_only', risk_threshold REAL DEFAULT 0.3, max_auto_value REAL DEFAULT 100, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS approval_actions (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, agent_type TEXT NOT NULL, action_type TEXT NOT NULL, description TEXT, input_data JSONB, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS usage_events (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, event_type TEXT NOT NULL, category TEXT, value REAL DEFAULT 1, metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS contact_submissions (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT, message TEXT, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS integrations (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, status TEXT DEFAULT 'disconnected', config JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`;
    // Fix missing columns from old schema
    try { await sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT 'default'`; } catch {}
    try { await sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS type TEXT`; } catch {}
    try { await sql`ALTER TABLE integrations ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'`; } catch {}
    await sql`CREATE TABLE IF NOT EXISTS webhooks (id TEXT PRIMARY KEY, type TEXT NOT NULL, endpoint TEXT NOT NULL, secret TEXT, integration_id TEXT, active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, webhook_id TEXT, integration_id TEXT, event_type TEXT NOT NULL, payload JSONB DEFAULT '{}', processed BOOLEAN DEFAULT false, received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, processed_at TIMESTAMPTZ)`;

    // Verify
    try {
      await sql`INSERT INTO organizations (id, name, owner_id) VALUES ('healthcheck', 'test', 'test') ON CONFLICT (id) DO NOTHING`;
      const [org]: any[] = await sql`SELECT id FROM organizations WHERE id = 'healthcheck'`;
      if (!org) throw new Error("Write not visible");
    } catch (ve: any) {
      return NextResponse.json({ success: false, error: "Verification failed: " + ve.message }, { status: 500 });
    }

    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    return NextResponse.json({ success: true, tables: tables.map((r: any) => r.table_name) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
