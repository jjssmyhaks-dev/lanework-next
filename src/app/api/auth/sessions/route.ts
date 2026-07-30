import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getActiveSessions, getActiveSessionCount, logout } from "@/lib/auth";

/**
 * GET /api/auth/sessions
 * Returns active sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = getActiveSessions(user.id);
    const count = getActiveSessionCount(user.id);

    return NextResponse.json({
      success: true,
      userId: user.id,
      count,
      sessions: sessions.map((s) => ({
        family: s.family,
        createdAt: new Date(s.createdAt).toISOString(),
      })),
      // Mark the current session (based on current token family can't be inferred
      // from access token alone; client should track its own family)
      note: "Each session represents a device/browser. Logging out removes the specific session's refresh token. Use DELETE to logout from all devices.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/sessions
 * Invalidates all sessions for the current user (logout everywhere)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const previousCount = getActiveSessionCount(user.id);
    await logout(user.id);

    const res = NextResponse.json({
      success: true,
      message: `Logged out from all ${previousCount} devices`,
      invalidatedSessions: previousCount,
    });

    // Clear auth cookies
    res.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    res.cookies.set("refresh-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/refresh",
      maxAge: 0,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
