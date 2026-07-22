const { neon } = require("@neondatabase/serverless");

const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) { console.error('DATABASE_URL not found in .env.local'); process.exit(1); }
const DB = match[1];

async function main() {
  const sql = neon(DB);
  try {
    // ────────────── Auth tables ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        email_verified TIMESTAMP,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ users");

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    console.log("  password_hash column ensured");

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        session_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires TIMESTAMP NOT NULL
      )
    `;
    console.log("✓ sessions");

    // ────────────── Agent tasks ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        input JSONB,
        output JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ agent_tasks");

    // ────────────── Shipments ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS shipments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tracking_number TEXT NOT NULL,
        carrier TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        eta TEXT,
        status TEXT DEFAULT 'in_transit',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ shipments");

    // ────────────── Inventory ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        reorder_point INTEGER DEFAULT 0,
        warehouse TEXT,
        location TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ inventory");

    // ────────────── Routes ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        stops INTEGER DEFAULT 0,
        distance_km REAL DEFAULT 0,
        estimated_minutes INTEGER DEFAULT 0,
        status TEXT DEFAULT 'planned',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ routes");

    // ────────────── Warehouse tasks ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS warehouse (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        assigned_to TEXT,
        dock TEXT,
        metadata JSONB,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ warehouse");

    // ────────────── Fleet drivers ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS fleet_drivers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        license TEXT,
        status TEXT DEFAULT 'available',
        hours_driven REAL DEFAULT 0,
        max_hours REAL DEFAULT 12,
        assigned_vehicle TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ fleet_drivers");

    // ────────────── Fleet vehicles ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS fleet_vehicles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plate TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        mileage_km REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ fleet_vehicles");

    // ────────────── Customers ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        channel TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ customers");

    // ────────────── Conversations & messages ──────────────
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        model TEXT DEFAULT 'cloudflare-workers-ai',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ conversations");

    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("✓ messages");

    // ────────────── Summary ──────────────
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
    console.log(`\n✅ All ${tables.length} tables ready: ${tables.map(r => r.table_name).join(", ")}`);
    process.exit(0);
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
}

main();
