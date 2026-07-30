import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }
    const result = await login(parsed.data.email, parsed.data.password);
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }
    const res = NextResponse.json({ success: true, user: result.user }, { status: 200 });
    // Access token: short-lived (15 min), httpOnly cookie
    res.cookies.set("auth-token", result.accessToken!, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: 60 * 15, // 15 minutes
    });
    // Refresh token: long-lived (30 days), httpOnly cookie, path-restricted to /api/auth/refresh
    res.cookies.set("refresh-token", result.refreshToken!, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/api/auth/refresh", maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
