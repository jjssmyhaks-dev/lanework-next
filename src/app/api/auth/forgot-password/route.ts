/**
 * POST /api/auth/forgot-password
 * Accepts { email }, generates a time-limited reset token, and returns success.
 * In production, this would send an email with the reset link.
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);

// Ensure reset_tokens table exists
async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id)`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await ensureTable();

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link.",
    });

    // Look up user
    const [user] = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (!user) {
      return successResponse;
    }

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await sql`UPDATE password_reset_tokens SET used = true WHERE user_id = ${user.id} AND used = false`;

    // Store hashed token
    await sql`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
      VALUES (${crypto.randomUUID()}, ${user.id}, ${tokenHash}, ${expiresAt.toISOString()}::timestamptz)
    `;

    // Send reset email
    const { sendPasswordResetEmail } = await import("@/lib/email");
    await sendPasswordResetEmail(email, rawToken);

    return successResponse;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    logger.error({ msg }, "Forgot password failed");
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
