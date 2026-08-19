/**
 * POST /api/auth/reset-password
 * Accepts { token, password }, validates the reset token, and updates the password.
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find valid token
    const [resetToken] = await sql`
      SELECT id, user_id, expires_at, used
      FROM password_reset_tokens
      WHERE token_hash = ${tokenHash} AND used = false
      LIMIT 1
    `;

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    // Check expiry
    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "Reset token has expired. Please request a new one." }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password
    await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${resetToken.user_id}`;

    // Mark token as used
    await sql`UPDATE password_reset_tokens SET used = true WHERE id = ${resetToken.id}`;

    // Invalidate all other reset tokens for this user
    await sql`UPDATE password_reset_tokens SET used = true WHERE user_id = ${resetToken.user_id} AND id != ${resetToken.id}`;

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[Reset Password]", msg);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
