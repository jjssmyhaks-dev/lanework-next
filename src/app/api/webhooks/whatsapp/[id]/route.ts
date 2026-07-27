import { NextRequest, NextResponse } from "next/server";

/**
 * WhatsApp Webhook Receiver
 * POST /api/webhooks/whatsapp/[id]
 * Receives WhatsApp Business API webhooks (messages, status updates)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // WhatsApp sends verification GET request on first setup
    // This is handled by the GET handler below

    // Process incoming WhatsApp messages
    if (body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const msg = change.value?.messages?.[0];
            if (msg) {
              // Route to customer-communication agent
              // In production, this would queue the message for the agent
              console.log(`[WhatsApp] Message from ${msg.from}: ${msg.text?.body || "[non-text]"}`);
            }
          }
          if (change.field === "message_template_status_update") {
            // Template message status updates
            console.log(`[WhatsApp] Template status update:`, change.value);
          }
        }
      }
    }

    // Check for status updates (message delivery, read receipts)
    if (body.statuses) {
      for (const status of body.statuses) {
        console.log(`[WhatsApp] Message ${status.id} status: ${status.status}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(`[WhatsApp Webhook Error]`, e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * WhatsApp Webhook Verification
 * GET /api/webhooks/whatsapp/[id]
 * Meta verifies the webhook by sending a challenge
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe") {
    // In production, compare token against the configured verify_token
    if (token) {
      return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return NextResponse.json({ error: "Invalid verify_token" }, { status: 403 });
  }

  return NextResponse.json({ status: "ok", webhook_id: (await params).id });
}
