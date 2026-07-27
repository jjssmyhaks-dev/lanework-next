const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='agent_tasks' ORDER BY ordinal_position`;
  console.log(JSON.stringify(cols, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
