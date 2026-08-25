/**
 * /api/agents/confidence — Confidence calibration stats and per-action breakdown.
 * GET → calibration stats, per-action accuracy, global confidence distribution
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getCalibrationStats, getActionCalibration } from "@/lib/agents/confidence";

export const GET = withAuth(async () => {
  try {
    const [stats, actionCalibration] = await Promise.all([
      getCalibrationStats(),
      getActionCalibration(),
    ]);

    return NextResponse.json({ stats, actionCalibration });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
