import { neon } from "@neondatabase/serverless";

// Initialize Neon connection
export const sql = neon(process.env.DATABASE_URL!);

// Note: All tables are created via lib/db-init.ts
// This file provides the shared database connection.
