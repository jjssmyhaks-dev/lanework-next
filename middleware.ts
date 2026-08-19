import { NextRequest, NextResponse } from "next/server";

// ── Allowed origins ──
// In production, set CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
// Defaults to same-origin only (no cross-origin requests allowed)
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Same-origin requests have no Origin header
  if (allowedOrigins.length === 0) return false; // No origins configured = block all cross-origin
  return allowedOrigins.includes(origin);
}

function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  if (isAllowedOrigin(origin) && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
    response.headers.set("Access-Control-Max-Age", "86400");
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CORS preflight ──
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, request);
  }

  // ── Security headers for all responses ──
  const response = NextResponse.next();

  // HSTS — force HTTPS in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // Add request ID for traceability
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  response.headers.set("X-Request-ID", requestId);

  // Add CORS headers to API responses
  if (pathname.startsWith("/api/")) {
    return addCorsHeaders(response, request);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match all pages (for HSTS + request ID)
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
