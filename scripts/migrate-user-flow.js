const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) { console.error("DATABASE_URL not found"); process.exit(1); }
const DB = match[1];

async function main() {
  const sql = neon(DB);

  const tables = [
    {
      name: "organizations",
      sql: `CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        owner_id TEXT NOT NULL,
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`
    },
    {
      name: "subscriptions",
      sql: `CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        plan TEXT DEFAULT 'starter',
        status TEXT DEFAULT 'trial',
        trial_start TIMESTAMP DEFAULT NOW(),
        trial_end TIMESTAMP,
        payment_method_added BOOLEAN DEFAULT false,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        grace_period_ends TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`
    },
    {
      name: "integrations",
      sql: `CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'disconnected',
        config JSONB DEFAULT '{}',
        connected_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`
    },
    {
      name: "agent_trust_configs",
      sql: `CREATE TABLE IF NOT EXISTS agent_trust_configs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        trust_level TEXT DEFAULT 'propose_only',
        risk_threshold REAL DEFAULT 0.3,
        max_auto_value REAL DEFAULT 100,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(org_id, agent_type)
      )`
    },
    {
      name: "approval_actions",
      sql: `CREATE TABLE IF NOT EXISTS approval_actions (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        action_type TEXT NOT NULL,
        description TEXT,
        input_data JSONB,
        status TEXT DEFAULT 'pending',
        approved_by TEXT,
        rejected_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP
      )`
    },
    {
      name: "usage_events",
      sql: `CREATE TABLE IF NOT EXISTS usage_events (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        category TEXT,
        value REAL DEFAULT 1,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`
    },
    {
      name: "contact_submissions",
      sql: `CREATE TABLE IF NOT EXISTS contact_submissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`
    }
  ];

  for (const t of tables) {
    try {
      await sql.unsafe(t.sql);
      console.log(`✓ ${t.name}`);
    } catch (e) {
      console.log(`✗ ${t.name}: ${e.message}`);
    }
  }

  const all = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log(`\n✅ ${all.length} tables total:`, all.map(r => r.table_name).join(", "));
  process.exit(0);
}
main();
