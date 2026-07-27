import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "lanework-build-fallback"
);

if (!process.env.NEXTAUTH_SECRET && !process.env.JWT_SECRET) {
  console.warn("[AUTH] JWT secret not configured. Set NEXTAUTH_SECRET in Vercel dashboard.");
}

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

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

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/auth-token=([^;]+)/);
  if (!match) return null;
  return verifyToken(match[1]);
}

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