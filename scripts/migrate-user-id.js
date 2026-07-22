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

  // Add user_id column to old tables that use tenant_id
  const tables = ["shipments", "routes", "customers", "agent_tasks"];
  const defaultUserId = "default";

  for (const table of tables) {
    try {
      await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '${defaultUserId}'`);
      console.log(`++ user_id added to ${table}`);
    } catch (e) {
      console.log(`!! ${table}: ${e.message}`);
    }
  }

  // Also ensure dashboard_stats has user_id (or just make sure the APIs can handle it)
  try {
    await sql.unsafe(`ALTER TABLE dashboard_stats ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '${defaultUserId}'`);
    console.log("++ user_id added to dashboard_stats");
  } catch (e) {
    console.log(`!! dashboard_stats: ${e.message}`);
  }

  // Verify
  for (const table of tables) {
    try {
      const cols = await sql.unsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' ORDER BY ordinal_position`);
      console.log(`${table} columns:`, cols.map(c => c.column_name).join(", "));
    } catch (e) {
      console.log(`${table}: ${e.message}`);
    }
  }

  console.log("\nMigration complete");
  process.exit(0);
}
main();
