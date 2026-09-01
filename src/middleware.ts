/**
 * Next.js Middleware — edge-level route protection + rate limiting.
 *
 * Runs on every request before the page/API route handler.
 * Checks JWT token for protected routes and redirects unauthenticated users.
 * Applies rate limiting to ALL API routes at the edge.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
);

// ─── Rate Limiting (Edge-compatible in-memory store) ───────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Edge doesn't have shared memory across isolates, but within a single isolate
// this works. For production, consider Upstash Redis for distributed rate limiting.
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit tiers (requests per minute)
const RATE_LIMITS: Record<string, number> = {
  // Auth endpoints — strict (brute-force protection)
  "api/auth": 10,
  // AI/LLM — expensive
  "api/ai": 10,
  "api/chat": 15,
  "api/voice": 5,
  // Agent system — moderate
  "api/agents": 30,
  // Billing — strict
  "api/billing": 5,
  // Integrations — moderate
  "api/integrations": 30,
  // Webhooks — high (external services send these)
  "api/webhooks": 100,
  // Search — moderate
  "api/search": 20,
  // Default — generous
  default: 60,
};

function getRateLimit(pathname: string): number {
  for (const [prefix, limit] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith("/" + prefix)) return limit;
  }
  return RATE_LIMITS.default;
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; remaining: number } {
  const limit = getRateLimit(pathname);
  const now = Date.now();
  const key = `${ip}:${pathname.split("/").slice(0, 3).join("/")}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: limit - entry.count };
}

// Periodic cleanup (runs in the edge runtime)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetAt) rateLimitStore.delete(key);
    }
  }, 300_000);
}

// ─── Route Configuration ───────────────────────────────────────────────────

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/chat",
  "/shipment",
  "/inventory",
  "/fleet",
  "/warehouse",
  "/routes",
  "/customer",
  "/integrations",
  "/team",
  "/agents",
  "/approvals",
  "/alerts",
  "/pricing",
  "/billing",
  "/knowledge",
  "/monitoring",
  "/feature-flags",
  "/copilot",
];

// Routes that are public (no auth needed)
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/join",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/me",
  "/api/webhooks",
  "/api/health",
  "/api/csrf",
  "/api/contact",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Main Middleware ────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes, static files, and Next.js internals
  if (
    isPublicRoute(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);

  // ── Rate Limiting for API routes ──
  if (pathname.startsWith("/api/")) {
    const { allowed, remaining } = checkRateLimit(ip, pathname);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(getRateLimit(pathname)),
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
          },
        }
      );
    }

    // Skip auth for public API routes
    if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/webhooks")) {
      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Remaining", String(remaining));
      return response;
    }

    // Check Authorization header first
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        await jwtVerify(token, JWT_SECRET);
        const response = NextResponse.next();
        response.headers.set("X-RateLimit-Remaining", String(remaining));
        return response;
      } catch {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }
    }

    // Check cookie-based token (for browser fetch calls)
    const apiToken =
      request.cookies.get("auth-token")?.value ||
      request.cookies.get("lanework-token")?.value ||
      request.cookies.get("token")?.value;

    if (apiToken) {
      try {
        await jwtVerify(apiToken, JWT_SECRET);
        const response = NextResponse.next();
        response.headers.set("X-RateLimit-Remaining", String(remaining));
        return response;
      } catch {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // ── Page routes — check cookie-based token ──
  const token =
    request.cookies.get("auth-token")?.value ||
    request.cookies.get("lanework-token")?.value ||
    request.cookies.get("token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    response.cookies.delete("lanework-token");
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
