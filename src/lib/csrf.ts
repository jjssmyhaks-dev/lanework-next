/**
 * CSRF Protection — token-based defense against cross-site request forgery.
 *
 * Generates a cryptographically random token stored in an HttpOnly cookie.
 * Client sends it as X-CSRF-Token header on state-changing requests.
 * Server validates both match.
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CSRF_COOKIE = "lanework-csrf";
const CSRF_HEADER = "x-csrf-token";
const TOKEN_LENGTH = 32;
const MAX_AGE = 60 * 60 * 24; // 24 hours

/** Generate a new CSRF token and set it as a cookie */
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return token;
}

/** Validate CSRF token from header matches cookie */
export async function validateCsrf(request: NextRequest): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken) return false;

  // Timing-safe comparison
  const headerBuf = Buffer.from(headerToken);
  const cookieBuf = Buffer.from(cookieToken);

  if (headerBuf.length !== cookieBuf.length) return false;
  return crypto.timingSafeEqual(headerBuf, cookieBuf);
}

/** Middleware helper: reject state-changing requests without valid CSRF */
export async function csrfGuard(
  request: NextRequest
): Promise<NextResponse | null> {
  const method = request.method.toUpperCase();

  // Only protect state-changing methods
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  // Skip CSRF for webhook routes (they use HMAC signatures)
  if (request.nextUrl.pathname.startsWith("/api/webhooks")) {
    return null;
  }

  // Skip CSRF for auth routes (they use Bearer tokens)
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return null;
  }

  const valid = await validateCsrf(request);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid CSRF token. Please refresh the page." },
      { status: 403 }
    );
  }

  return null;
}
