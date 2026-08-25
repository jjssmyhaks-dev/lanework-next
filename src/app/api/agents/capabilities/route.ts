/**
 * /api/agents/capabilities — Agent capability matrix and availability.
 * GET → full capability matrix with integration availability
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getCapabilityMatrix, isIntegrationAvailable } from "@/lib/agents/capabilities";

export const GET = withAuth(async (request) => {
  try {
    const matrix = getCapabilityMatrix();
    const totalIntegrations = new Set(matrix.flatMap((c) => c.integrations.map((i) => i.name))).size;
    const availableIntegrations = matrix.flatMap((c) => c.integrations).filter((i) => i.available).length;

    return NextResponse.json({
      capabilities: matrix,
      summary: {
        totalCapabilities: matrix.length,
        totalIntegrations,
        availableIntegrations,
        fullyAvailable: matrix.filter((c) => c.integrations.every((i) => i.available)).length,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
