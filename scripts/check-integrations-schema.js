require("dotenv").config();
const { neon } = require("@neondatabase/serverless");
(async () => {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const r = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='integrations' ORDER BY ordinal_position`;
    console.log(r.map(c => c.column_name).join(", "));
  } catch(e) { console.error(e.message); }
})();
