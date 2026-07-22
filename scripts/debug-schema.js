const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");
const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
const DB = match[1];

async function main() {
  const sql = neon(DB);
  
  // Check current schema
  const schema = await sql`SELECT current_schema()`;
  console.log("Current schema:", schema[0]?.current_schema || "unknown");
  
  // Query all schemas
  const allTables = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name IN ('organizations','subscriptions','integrations','agent_trust_configs','approval_actions','usage_events','contact_submissions')`;
  console.log("Found tables:", JSON.stringify(allTables.map(r => `${r.table_schema}.${r.table_name}`)));
  
  // Try direct query
  try {
    const r = await sql`SELECT * FROM organizations LIMIT 1`;
    console.log("organizations query OK, rows:", r.length);
  } catch(e) { console.log("organizations query FAIL:", e.message); }
  
  try {
    const r = await sql`SELECT * FROM integrations LIMIT 1`;
    console.log("integrations query OK, rows:", r.length);
  } catch(e) { console.log("integrations query FAIL:", e.message); }

  process.exit(0);
}
main();
