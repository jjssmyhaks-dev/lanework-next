const { neon } = require("@neondatabase/serverless");
const DB = "postgresql://neondb_owner:***@ep-bitter-block-az9ls0rp.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const sql = neon(DB);
  try {
    // Ensure password_hash column exists
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    console.log("password_hash column guaranteed");

    // List columns
    const { rows } = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`;
    console.log("Users table columns:");
    rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}
main();
