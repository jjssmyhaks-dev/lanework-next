const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
const env = {};
for (const line of lines) {
  const m = line.match(/^(\w+)="?([^"\n]+)"?$/);
  if (m) env[m[1]] = m[2];
}

const dbUrl = env.DATABASE_URL;
console.log('URL length:', dbUrl.length);
const sql = neon(dbUrl);

async function main() {
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='agent_tasks' ORDER BY ordinal_position`;
  console.log('Columns:', JSON.stringify(cols.map(c => c.column_name), null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
