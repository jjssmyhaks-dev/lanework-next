import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { createOrg } from "@/lib/org";
import type { CompanySize } from "@/lib/org";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(3, "Password must be at least 3 characters"),
  orgName: z.string().optional(),
  companySize: z.enum(["solo", "2-10", "11-30", "31-50", "51-100", "100+"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, email, password, orgName, companySize } = parsed.data;
    const sql = neon(process.env.DATABASE_URL!);

    // Check if user already exists
    const [existingUser] = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const id = uuidv4();
    const [user] = await sql`
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES (${id}, ${name}, ${email}, ${passwordHash}, NOW())
      RETURNING id, name, email, created_at
    `;

    // Create organisation if orgName provided
    let org = null;
    if (orgName && orgName.trim()) {
      try {
        org = await createOrg(orgName.trim(), id, (companySize as CompanySize) || "solo");
      } catch (e: any) {
        logger.error({ err: e }, "Org creation error");
        // User created but org failed — not critical, they can create org later
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        org: org ? { id: org.id, name: org.name } : null,
      },
      { status: 201 },
    );
  } catch (error: any) {
    logger.error({ err: error }, "Registration error");
    const detail = error?.message || String(error);
    return NextResponse.json(
      { success: false, error: `Registration failed: ${detail}` },
      { status: 500 },
    );
  }
}
