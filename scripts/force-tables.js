const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
const poolerUrl = match[1];
// Use direct endpoint for DDL (pooler routes to different instances)
const directUrl = poolerUrl.replace("-pooler", "");

async function main() {
  console.log("Using direct endpoint:", directUrl.substring(0, 60) + "...");
  const sql = neon(directUrl);

  const creates = [
    `CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE, owner_id TEXT NOT NULL, logo_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, plan TEXT DEFAULT 'starter', status TEXT DEFAULT 'trial', trial_start TIMESTAMPTZ DEFAULT NOW(), trial_end TIMESTAMPTZ, payment_method_added BOOLEAN DEFAULT false, stripe_customer_id TEXT, stripe_subscription_id TEXT, grace_period_ends TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS agent_trust_configs (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, agent_type TEXT NOT NULL, trust_level TEXT DEFAULT 'propose_only', risk_threshold REAL DEFAULT 0.3, max_auto_value REAL DEFAULT 100, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, UNIQUE(org_id, agent_type))`,
    `CREATE TABLE IF NOT EXISTS approval_actions (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, agent_type TEXT NOT NULL, action_type TEXT NOT NULL, description TEXT, input_data JSONB, status TEXT DEFAULT 'pending', approved_by TEXT, rejected_reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, resolved_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS usage_events (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, event_type TEXT NOT NULL, category TEXT, value REAL DEFAULT 1, metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS contact_submissions (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT, message TEXT, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL)`,
  ];

  for (const c of creates) {
    try {
      await sql.unsafe(c);
      const name = c.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      console.log("✓ " + name);
    } catch (e) {
      console.log("✗ " + e.message.substring(0, 80));
    }
  }

  const all = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  const names = all.map(r => r.table_name);
  console.log("\n" + names.length + " tables");
  const check = ["organizations", "subscriptions", "agent_trust_configs", "approval_actions", "usage_events", "contact_submissions"];
  const missing = check.filter(t => !names.includes(t));
  if (missing.length) {
    console.log("MISSING:", missing.join(", "));
  } else {
    console.log("All 6 new tables present ✓");
  }

  process.exit(0);
}
main();
