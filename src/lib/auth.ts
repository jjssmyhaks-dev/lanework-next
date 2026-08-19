import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

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

// ── Token Blacklist ──
// Map<jti, expiresAt>. In-memory, good enough for Vercel serverless.
// On cold start this resets but tokens have short TTLs so impact is minimal.
const TOKEN_BLACKLIST = new Map<string, number>();

// Clean up expired blacklist entries every 5 minutes
const CLEANUP_INTERVAL = setInterval(() => {
  const now = Date.now();
  for (const [jti, expiresAt] of TOKEN_BLACKLIST) {
    if (now > expiresAt) TOKEN_BLACKLIST.delete(jti);
  }
  for (const [family, data] of tokenFamilies) {
    if (now - data.createdAt > 30 * 24 * 60 * 60 * 1000) tokenFamilies.delete(family);
  }
}, 300_000);
if (CLEANUP_INTERVAL.unref) CLEANUP_INTERVAL.unref();

/** Check if a token JTI is blacklisted */
export function isTokenBlacklisted(jti: string): boolean {
  const expiresAt = TOKEN_BLACKLIST.get(jti);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    TOKEN_BLACKLIST.delete(jti);
    return false;
  }
  return true;
}

/** Add a token JTI to the blacklist with its expiry */
export function blacklistToken(jti: string, expiresInMs: number): void {
  TOKEN_BLACKLIST.set(jti, Date.now() + expiresInMs);
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
  } catch {
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
    // Check blacklist
    if (payload.jti && isTokenBlacklisted(payload.jti as string)) return null;
    return { id: payload.id as string, name: payload.name as string | undefined, email: payload.email as string | undefined, image: payload.image as string | undefined };
  } catch {
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
    if (payload.jti && isTokenBlacklisted(payload.jti as string)) return null;
    const sub = payload.sub as string;
    const family = payload.family as string;
    const fingerprint = payload.fingerprint as string;
    const jti = payload.jti as string;
    if (!sub || !family || !fingerprint) return null;
    return { sub, family, fingerprint, jti };
  } catch {
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
