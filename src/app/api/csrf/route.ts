/**
 * GET /api/csrf — Generate a CSRF token and set it as a cookie.
 * The client should call this once on page load and include the
 * token as X-CSRF-Token header on subsequent POST/PUT/DELETE requests.
 */

import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";

export const GET = async () => {
  const token = await generateCsrfToken();
  return NextResponse.json({ csrfToken: token });
};
