import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { z } from "zod";

const sendCodeSchema = z.object({
  step: z.literal("send-code"),
  email: z.string().email(),
});

const verifyCodeSchema = z.object({
  step: z.literal("verify-code"),
  email: z.string().email(),
  code: z.string().length(6),
});

const resetSchema = z.object({
  step: z.literal("reset"),
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(3),
});

// In production, store reset codes in DB. For now we keep them in memory
// and generate a deterministic code for demo purposes.
const resetCodes = new Map<string, { code: string; expiresAt: number }>();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getCodeForEmail(email: string): string | null {
  const entry = resetCodes.get(email);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    resetCodes.delete(email);
    return null;
  }
  return entry.code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ─── Step 1: Send code ─────────────────────────────
    const sendResult = sendCodeSchema.safeParse(body);
    if (sendResult.success) {
      const { email } = sendResult.data;
      const sql = neon(process.env.DATABASE_URL!);
      const [user] = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (!user) {
        // Don't leak whether email exists; pretend we sent it
        return NextResponse.json({ success: true, message: "If the email exists, a code has been sent" });
      }
      const code = generateCode();
      resetCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min TTL
      console.log(`[FORGOT-PASSWORD] Reset code for ${email}: ${code}`); // In prod, send via email
      return NextResponse.json({ success: true, message: "Reset code generated" });
    }

    // ─── Step 2: Verify code ────────────────────────────
    const verifyResult = verifyCodeSchema.safeParse(body);
    if (verifyResult.success) {
      const { email, code } = verifyResult.data;
      const stored = getCodeForEmail(email);
      if (!stored || stored !== code) {
        return NextResponse.json({ success: false, error: "Invalid or expired reset code" }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Code verified" });
    }

    // ─── Step 3: Reset password ────────────────────────
    const resetResult = resetSchema.safeParse(body);
    if (resetResult.success) {
      const { email, code, newPassword } = resetResult.data;
      const stored = getCodeForEmail(email);
      if (!stored || stored !== code) {
        return NextResponse.json({ success: false, error: "Invalid or expired reset code" }, { status: 400 });
      }
      const sql = neon(process.env.DATABASE_URL!);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      await sql`UPDATE users SET password_hash = ${passwordHash} WHERE email = ${email}`;
      resetCodes.delete(email);
      return NextResponse.json({ success: true, message: "Password changed successfully" });
    }

    return NextResponse.json({ success: false, error: "Invalid step" }, { status: 400 });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Something went wrong" }, { status: 500 });
  }
}
