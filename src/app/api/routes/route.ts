import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default";

    const routes = await sql`
      SELECT * FROM routes WHERE user_id = ${userId} ORDER BY created_at DESC
    `;

    return NextResponse.json(routes);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, origin, destination, stops, distanceKm, estimatedMinutes, status, userId } = body;

    if (!name || !origin || !destination) {
      return NextResponse.json(
        { error: "Missing required fields: name, origin, destination" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const user_id = userId || "default";

    await sql`
      INSERT INTO routes (id, user_id, name, origin, destination, stops, distance_km, estimated_minutes, status)
      VALUES (${id}, ${user_id}, ${name}, ${origin}, ${destination}, ${stops ?? null}, ${distanceKm ?? 0}, ${estimatedMinutes ?? 0}, ${status || "active"})
    `;

    const [route] = await sql`
      SELECT * FROM routes WHERE id = ${id}
    `;

    return NextResponse.json(route, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
