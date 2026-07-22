const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) { console.error('DATABASE_URL not found'); process.exit(1); }
const DB = match[1];

async function main() {
  const sql = neon(DB);
  const tables = ['shipments', 'routes', 'customers', 'agent_tasks', 'dashboard_stats'];
  for (const t of tables) {
    try {
      const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=${t} ORDER BY ordinal_position`;
      console.log(`${t}:`, cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    } catch (e) {
      console.log(`${t}: ERROR - ${e.message}`);
    }
  }
  process.exit(0);
}
main();
