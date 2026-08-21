/**
 * /api/agents/poller-status — Returns status of all registered agent pollers.
 *
 * GET → list pollers with last run info
 */

import { NextResponse } from "next/server";
import { getPollerStatus } from "@/lib/agents/scheduler";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  try {
    const pollers = await getPollerStatus();
    return NextResponse.json({ pollers });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
