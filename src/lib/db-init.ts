export async function initDatabase() {
  const { sql } = await import("./db");

  try {
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL UNIQUE,
        email_verified TIMESTAMP,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        session_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMP NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reasoning TEXT,
        payload JSONB,
        result JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS shipments (
        id TEXT PRIMARY KEY,
        tracking_number TEXT NOT NULL UNIQUE,
        carrier TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        origin TEXT,
        destination TEXT,
        eta TIMESTAMP,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        reorder_point INTEGER NOT NULL DEFAULT 10,
        warehouse TEXT,
        location TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        stops INTEGER DEFAULT 1,
        distance_km INTEGER,
        estimated_minutes INTEGER,
        status TEXT DEFAULT 'active',
        optimizations JSONB,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS warehouse_tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        assigned_to TEXT,
        dock TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        license TEXT,
        status TEXT DEFAULT 'available',
        hours_driven INTEGER DEFAULT 0,
        max_hours INTEGER DEFAULT 11,
        assigned_vehicle TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        plate TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        last_maintenance TIMESTAMP,
        mileage_km INTEGER DEFAULT 0,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        channel TEXT DEFAULT 'chat',
        status TEXT DEFAULT 'open',
        sentiment TEXT,
        last_message_at TIMESTAMP DEFAULT NOW(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    console.log("✅ Database tables initialized successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    return { success: false, error: String(error) };
  }
}
