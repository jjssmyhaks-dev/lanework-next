import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  createAccessToken,
  createRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
} from "@/lib/auth";

/**
 * POST /api/auth/refresh
 * Accepts a refresh token (from cookie or body), validates it,
 * checks for token theft via token family rotation, and returns
 * a new access+refresh token pair.
 *
 * Token family rotation:
 * - On valid refresh: old fingerprint → new fingerprint, old RT blacklisted
 * - On reused fingerprint (stolen RT detected): entire family invalidated
 */
export async function POST(request: NextRequest) {
  try {
    // Read refresh token from cookie first, fall back to request body
    let refreshToken = "";
    const cookie = request.headers.get("cookie") || "";
    const cookieMatch = cookie.match(/refresh-token=([^;]+)/);
    if (cookieMatch) {
      refreshToken = cookieMatch[1];
    }

    // Also accept from body for mobile/native clients
    if (!refreshToken) {
      try {
        const body = await request.json();
        refreshToken = body.refreshToken || "";
      } catch {
        // No body or not JSON
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Verify the refresh token
    const decoded = await verifyRefreshToken(refreshToken);
    if (!decoded) {
      const res = NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
      // Clear the invalid refresh token cookie
      res.cookies.set("refresh-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth/refresh",
        maxAge: 0,
      });
      return res;
    }

    const { sub: userId, family, fingerprint, jti } = decoded;

    // Check blacklist (tokens from previous rotations are blacklisted)
    if (await isTokenBlacklisted(jti)) {
      return NextResponse.json(
        { error: "Refresh token has been revoked" },
        { status: 401 }
      );
    }

    // Validate token family
    const { tokenFamilies } = await import("@/lib/auth");
    const familyData = tokenFamilies.get(family);

    if (!familyData || familyData.userId !== userId) {
      // Family doesn't exist or belongs to different user
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    // Check for token theft: if fingerprint doesn't match the current one,
    // someone may have stolen a refresh token and used it.
    if (familyData.currentFingerprint !== fingerprint) {
      // TOKEN THEFT DETECTED: Invalidate the entire family
      tokenFamilies.delete(family);
      return NextResponse.json(
        {
          error:
            "Token reuse detected — possible token theft. All sessions for this device have been invalidated. Please login again.",
        },
        { status: 401 }
      );
    }

    // Blacklist the used refresh token so it can't be reused
    blacklistToken(jti, 30 * 24 * 60 * 60 * 1000); // 30 days

    // Generate new token pair with a new fingerprint (rotate)
    const sessionUser = {
      id: userId,
      name: "" as string | undefined,
      email: "" as string | undefined,
      image: undefined as string | undefined,
    };

    // Try to get user info for the token
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);
      const [user] = await sql`SELECT name, email, image FROM users WHERE id = ${userId}`;
      if (user) {
        sessionUser.name = user.name;
        sessionUser.email = user.email;
        sessionUser.image = user.image;
      }
    } catch {
      // User fetch failed — use id-only token (still valid)
    }

    const newAccessToken = await createAccessToken(sessionUser);
    const newRefresh = await createRefreshToken(userId, family);
    // createRefreshToken updates the family fingerprint automatically

    const res = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    // Set new access token cookie
    res.cookies.set("auth-token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15, // 15 minutes
    });

    // Set new refresh token cookie
    res.cookies.set("refresh-token", newRefresh.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/refresh",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
