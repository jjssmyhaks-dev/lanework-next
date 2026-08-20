/**
 * /api/webhooks/[provider] — Generic webhook receiver.
 *
 * Routes incoming webhooks to the appropriate handler based on provider name.
 */

import { NextRequest, NextResponse } from "next/server";
import { routeWebhook } from "@/lib/agents/webhooks";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "webhook-api" });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  try {
    const body = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    log.info({ provider, bodyKeys: Object.keys(body) }, "Webhook received");

    await routeWebhook(provider, headers, body);

    return NextResponse.json({ received: true, provider });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    log.error({ provider, err: msg }, "Webhook processing failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
