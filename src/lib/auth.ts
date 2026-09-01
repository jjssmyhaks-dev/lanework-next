// @ts-nocheck
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
// Import env validation — runs on module load, fails fast on misconfig
import "@/lib/env";

const SECRET_KEY = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error("NEXTAUTH_SECRET or JWT_SECRET environment variable is required. Generate one: openssl rand -hex 32");
}
const SECRET = new TextEncoder().encode(SECRET_KEY);

// ── Token TTLs ──
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

// ── Token Family Tracking ──
// tokenFamily → { currentFingerprint: string, userId: string, createdAt: number }
// Each rotation generates a new fingerprint; a stolen refresh token is detected
// when the incoming fingerprint doesn't match the stored currentFingerprint.
const tokenFamilies = new Map<string, { currentFingerprint: string; userId: string; createdAt: number }>();
export { tokenFamilies };

// ── Token Blacklist (DB-backed) ──
// Moved from in-memory Map to Neon Postgres for persistence across serverless cold starts.
let blacklistTableReady = false;

async function ensureBlacklistTable() {
  if (blacklistTableReady) return;
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`CREATE TABLE IF NOT EXISTS token_blacklist (
      id TEXT PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at)`;
    blacklistTableReady = true;
  } catch (_e) { /* non-critical, intentionally silent */
    // Table may not exist yet — fall back to in-memory
    blacklistTableReady = false;
  }
}

// In-memory fallback for when DB is unavailable
const MEMORY_BLACKLIST = new Map<string, number>();

// Clean up expired blacklist entries every 5 minutes
const CLEANUP_INTERVAL = setInterval(async () => {
  const now = Date.now();
  // Cleanup in-memory
  for (const [jti, expiresAt] of MEMORY_BLACKLIST) {
    if (now > expiresAt) MEMORY_BLACKLIST.delete(jti);
  }
  // Cleanup DB
  try {
    await ensureBlacklistTable();
    if (blacklistTableReady) {
      const sql = neon(process.env.DATABASE_URL!);
      await sql`DELETE FROM token_blacklist WHERE expires_at < NOW()`;
    }
  } catch { /* best effort */ }
  // Cleanup token families
  for (const [family, data] of tokenFamilies) {
    if (now - data.createdAt > 30 * 24 * 60 * 60 * 1000) tokenFamilies.delete(family);
  }
}, 300_000);
if (CLEANUP_INTERVAL.unref) CLEANUP_INTERVAL.unref();

/** Check if a token JTI is blacklisted */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  try {
    await ensureBlacklistTable();
    if (blacklistTableReady) {
      const sql = neon(process.env.DATABASE_URL!);
      const [row] = await sql`SELECT id FROM token_blacklist WHERE id = ${jti} AND expires_at > NOW() LIMIT 1`;
      return !!row;
    }
  } catch { /* fall through to in-memory */ }
  // Fallback to in-memory
  const expiresAt = MEMORY_BLACKLIST.get(jti);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    MEMORY_BLACKLIST.delete(jti);
    return false;
  }
  return true;
}

/** Add a token JTI to the blacklist with its expiry */
export async function blacklistToken(jti: string, expiresInMs: number): Promise<void> {
  // Always add to in-memory for immediate effect
  MEMORY_BLACKLIST.set(jti, Date.now() + expiresInMs);
  try {
    await ensureBlacklistTable();
    if (blacklistTableReady) {
      const sql = neon(process.env.DATABASE_URL!);
      const expiresAt = new Date(Date.now() + expiresInMs).toISOString();
      await sql`INSERT INTO token_blacklist (id, expires_at) VALUES (${jti}, ${expiresAt}::timestamptz) ON CONFLICT (id) DO NOTHING`;
    }
  } catch { /* in-memory fallback already applied */ }
}

/**
 * Revoke all tokens for a user by clearing their token families.
 * All existing refresh tokens become invalid immediately.
 */
export async function logout(userId: string): Promise<void> {
  for (const [family, data] of tokenFamilies) {
    if (data.userId === userId) tokenFamilies.delete(family);
  }
  // Also clear DB sessions table if it exists
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
  } catch (_e) { /* non-critical, intentionally silent */
    // sessions table may not exist — that's fine
  }
}

/**
 * Get count of active token families (sessions) for a user.
 */
export function getActiveSessionCount(userId: string): number {
  let count = 0;
  for (const [, data] of tokenFamilies) {
    if (data.userId === userId) count++;
  }
  return count;
}

/**
 * Get active session details for a user.
 * Each token family represents one device/browser session.
 */
export function getActiveSessions(userId: string): Array<{
  family: string;
  createdAt: number;
}> {
  const sessions: Array<{ family: string; createdAt: number }> = [];
  for (const [family, data] of tokenFamilies) {
    if (data.userId === userId) {
      sessions.push({ family, createdAt: data.createdAt });
    }
  }
  return sessions.sort((a, b) => b.createdAt - a.createdAt);
}

// ── Token Creation ──

export async function createAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({ id: user.id, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setJti(crypto.randomUUID())
    .sign(SECRET);
}

export async function createRefreshToken(
  userId: string,
  tokenFamily?: string
): Promise<{ token: string; family: string; fingerprint: string }> {
  const family = tokenFamily || crypto.randomUUID();
  const fingerprint = crypto.randomUUID();

  tokenFamilies.set(family, {
    currentFingerprint: fingerprint,
    userId,
    createdAt: Date.now(),
  });

  const token = await new SignJWT({ sub: userId, family, fingerprint })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .setJti(crypto.randomUUID())
    .sign(SECRET);

  return { token, family, fingerprint };
}

/** Backward-compatible: create a single token (legacy usage) */
export async function createToken(user: SessionUser): Promise<string> {
  return createAccessToken(user);
}

// ── Token Verification ──

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    // Check blacklist (now async for DB lookup)
    if (payload.jti && await isTokenBlacklisted(payload.jti as string)) return null;
    return { id: payload.id as string, name: payload.name as string | undefined, email: payload.email as string | undefined, image: payload.image as string | undefined };
  } catch (_e) { /* non-critical, intentionally silent */
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{
  sub: string;
  family: string;
  fingerprint: string;
  jti: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.jti && await isTokenBlacklisted(payload.jti as string)) return null;
    const sub = payload.sub as string;
    const family = payload.family as string;
    const fingerprint = payload.fingerprint as string;
    const jti = payload.jti as string;
    if (!sub || !family || !fingerprint) return null;
    return { sub, family, fingerprint, jti };
  } catch (_e) { /* non-critical, intentionally silent */
    return null;
  }
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/auth-token=([^;]+)/);
  if (!match) {
    // Try Authorization header
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return verifyToken(authHeader.slice(7));
    }
    return null;
  }
  return verifyToken(match[1]);
}

// ── Login / Logout ──

// ── Auth Middleware Wrapper ──

export type AuthenticatedHandler = (
  request: NextRequest,
  user: SessionUser,
  ctx?: { params?: Promise<Record<string, string>> | Record<string, string> }
) => Promise<Response>;

/**
 * Wraps an API route handler with JWT authentication.
 * Returns 401 if the request has no valid token.
 * Passes the authenticated user to the handler.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: NextRequest,
    ctx?: { params?: Promise<Record<string, string>> | Record<string, string> }
  ) => {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized — please log in" },
        { status: 401 }
      );
    }
    return handler(request, user, ctx);
  };
}

export async function login(
  email: string,
  password: string
): Promise<{ error?: string; accessToken?: string; refreshToken?: string; user?: SessionUser }> {
  const sql = neon(process.env.DATABASE_URL!);
  const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
  if (!user) return { error: "Invalid email or password" };
  if (!user.password_hash) return { error: "Invalid email or password" };
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return { error: "Invalid email or password" };
  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  };
  const accessToken = await createAccessToken(sessionUser);
  const refresh = await createRefreshToken(user.id);
  return { accessToken, refreshToken: refresh.token, user: sessionUser };
}
