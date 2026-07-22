import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, email, company, message } = parsed.data;
    const sql = neon(process.env.DATABASE_URL!);
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO contact_submissions (id, name, email, company, message)
      VALUES (${id}, ${name}, ${email}, ${company || null}, ${message || null})
    `;
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
