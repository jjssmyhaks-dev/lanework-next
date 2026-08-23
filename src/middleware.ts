/**
 * Next.js Middleware — edge-level route protection.
 *
 * Runs on every request before the page/API route handler.
 * Checks JWT token for protected routes and redirects unauthenticated users.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
);

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

  // For API routes, check Authorization header
  if (pathname.startsWith("/api/")) {
    // Skip auth for public API routes
    if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/webhooks")) {
      return NextResponse.next();
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    try {
      const token = authHeader.slice(7);
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
  }

  // For page routes, check cookie-based token
  const token =
    request.cookies.get("lanework-token")?.value ||
    request.cookies.get("token")?.value;

  if (!token) {
    // Redirect to login with return URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token invalid — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
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
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
