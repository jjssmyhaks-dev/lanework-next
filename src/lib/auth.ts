import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || ""
);

// Production guard: refuse to start without a configured secret
if (!process.env.NEXTAUTH_SECRET && !process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing NEXTAUTH_SECRET or JWT_SECRET environment variable. Set it in Vercel dashboard."
    );
  }
  // In dev, log a warning but don't crash — allows local dev without env setup
  console.warn("[WARNING] NEXTAUTH_SECRET is not set. Using empty key — DO NOT use in production.");
}

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/* ── JWT helpers ── */
export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ id: user.id, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

/* ── Get user from request cookie ── */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/auth-token=([^;]+)/);
  if (!match) return null;
  return verifyToken(match[1]);
}

/* ── Login (used by API route) ── */
export async function login(
  email: string,
  password: string
): Promise<{ error?: string; token?: string; user?: SessionUser }> {
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
  return { token: await createToken(sessionUser), user: sessionUser };
}
