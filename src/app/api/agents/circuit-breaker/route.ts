/**
 * /api/agents/circuit-breaker — Circuit breaker status and control.
 * GET  → all circuit breaker statuses
 * POST → force-reset a circuit
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAllCircuitStatuses, resetCircuit } from "@/lib/agents/circuit-breaker";

export const GET = withAuth(async () => {
  try {
    const statuses = getAllCircuitStatuses();
    return NextResponse.json({ circuits: statuses });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

export const POST = withAuth(async (request) => {
  try {
    const { integration } = await request.json();
    if (!integration) {
      return NextResponse.json({ error: "integration is required" }, { status: 400 });
    }
    resetCircuit(integration);
    return NextResponse.json({ success: true, message: `Circuit for "${integration}" reset to closed` });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
