// @ts-nocheck — MCP SDK types resolved at build time in project context
/**
 * Email MCP Server
 * Auto-reply, tracking updates, ticket creation via Gmail API / IMAP / SMTP
 *
 * Tools:
 * - send_tracking_update: Send shipment tracking email to customer
 * - auto_reply: Analyze incoming email and auto-respond
 * - check_inbox: Scan recent emails for shipment-related queries
 *
 * ENV: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */

import { LaneworkMCPServer, isDirectRun } from "../shared/server.ts";
import crypto from "crypto";

export class EmailMCP extends LaneworkMCPServer {
  private smtpHost: string = "";
  private smtpPort: number = 587;
  private smtpUser: string = "";
  private smtpPass: string = "";
  private emailFrom: string = "";

  constructor() { super("customer-communication"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.smtpHost = this.getEnv("SMTP_HOST", "smtp.gmail.com");
    this.smtpPort = parseInt(process.env.SMTP_PORT || this.config.SMTP_PORT || "587");
    this.smtpUser = this.getEnv("SMTP_USER");
    this.smtpPass = this.getEnv("SMTP_PASS");
    this.emailFrom = process.env.EMAIL_FROM || this.config.EMAIL_FROM || this.smtpUser;
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<string> {
    // Use fetch-based SMTP via Resend or similar relay for serverless compatibility
    const body = JSON.stringify({
      from: this.emailFrom,
      to,
      subject,
      html,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.smtpPass}`,
      },
      body,
    });

    if (!res.ok) throw new Error(`Email send failed: ${res.status} ${await res.text()}`);
    const data: any = await res.json();
    return data.id || "";
  }

  /** Generate email HTML from template */
  private emailTemplate(params: {
    customerName: string;
    title: string;
    body: string;
    actionText?: string;
    actionUrl?: string;
    trackingNumber?: string;
    status?: string;
  }): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a2e">
  <div style="background:#1a1a2e;padding:24px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;font-size:20px;margin:0">🚚 Lanework</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 12px 12px">
    <p style="color:#1a1a2e/70;margin:0 0 8px">Hi ${params.customerName},</p>
    <h2 style="color:#1a1a2e;font-size:18px;margin:0 0 12px">${params.title}</h2>
    <p style="color:#1a1a2e/70;line-height:1.6;margin:0 0 16px">${params.body}</p>
    ${params.trackingNumber ? `<div style="background:#f3f4f6;padding:12px;border-radius:8px;margin-bottom:16px">
      <span style="color:#1a1a2e/50;font-size:12px">Tracking: </span>
      <strong style="color:#1a1a2e">${params.trackingNumber}</strong>
      ${params.status ? `<span style="margin-left:12px;padding:2px 10px;border-radius:12px;font-size:12px;background:#ecfdf5;color:#059669">${params.status}</span>` : ""}
    </div>` : ""}
    ${params.actionUrl ? `<a href="${params.actionUrl}" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500">${params.actionText || "Track Shipment"}</a>` : ""}
  </div>
  <p style="color:#1a1a2e/30;font-size:12px;text-align:center;margin-top:16px">Sent by Lanework — your AI logistics team</p>
</body></html>`;
  }

  /** ─── TOOLS ─── */

  async sendTrackingUpdate(params: {
    to: string;
    customerName: string;
    trackingNumber: string;
    status: string;
    location?: string;
    estimatedDelivery?: string;
  }): Promise<{ emailId: string; sent: boolean }> {
    const statusMessages: Record<string, string> = {
      picked_up: "Great news — your shipment has been picked up and is on its way!",
      in_transit: "Your shipment is moving through our network.",
      out_for_delivery: "Your shipment is out for delivery today!",
      delivered: "Your shipment has been delivered successfully!",
      rto_initiated: "We're sorry — your shipment is being returned to sender.",
    };

    const body = statusMessages[params.status] || `Your shipment status has been updated to: ${params.status}.`;
    const extra = params.location ? ` Current location: ${params.location}.` : "";
    const eta = params.estimatedDelivery ? ` Estimated delivery: ${params.estimatedDelivery}.` : "";

    const html = this.emailTemplate({
      customerName: params.customerName,
      title: `Shipment Update: ${params.trackingNumber}`,
      body: body + extra + eta,
      trackingNumber: params.trackingNumber,
      status: params.status.replace(/_/g, " "),
      actionUrl: `https://lanework.vercel.app/track/${params.trackingNumber}`,
      actionText: "Track Shipment",
    });

    try {
      const emailId = await this.sendEmail(params.to, `📦 Shipment Update: ${params.trackingNumber}`, html);
      await this.logAction("send_tracking_update", "completed", { trackingNumber: params.trackingNumber, status: params.status });
      return { emailId, sent: true };
    } catch (e: any) {
      await this.logAction("send_tracking_update", "failed", { error: e.message });
      return { emailId: "", sent: false };
    }
  }

  async autoReply(params: {
    to: string;
    customerName: string;
    customerMessage: string;
    context?: string;
  }): Promise<{ subject: string; body: string; sent: boolean }> {
    // Simple keyword-based auto-reply — Cloudflare AI would be used here in production
    const msg = params.customerMessage.toLowerCase();

    let replySubject = "Re: Your message to Lanework";
    let replyBody = `Hi ${params.customerName},\n\nThanks for reaching out! `;

    if (msg.includes("track") || msg.includes("shipment") || msg.includes("delivery") || msg.includes("order")) {
      replySubject = "📦 Tracking Your Shipment";
      replyBody += "Our team is looking into your shipment. You'll receive a tracking update shortly. In the meantime, you can check your shipment status on our tracking page.";
    } else if (msg.includes("delay") || msg.includes("late") || msg.includes("where")) {
      replySubject = "⏰ Shipment Delay Update";
      replyBody += "We understand your concern about the delay. Our route optimization agent is checking for the best alternative. We'll update you within 2 hours.";
    } else if (msg.includes("return") || msg.includes("refund") || msg.includes("cancel")) {
      replySubject = "🔄 Return/Refund Request";
      replyBody += "Your return request has been registered. Our team will share the return pickup details within 24 hours.";
    } else if (msg.includes("damage") || msg.includes("broken") || msg.includes("missing")) {
      replySubject = "⚠️ Damage Report";
      replyBody += "We're sorry to hear about this. Please share photos of the damaged items, and our claims team will process your case within 48 hours.";
    } else if (msg.includes("invoice") || msg.includes("bill") || msg.includes("payment")) {
      replySubject = "🧾 Invoice Request";
      replyBody += "Your invoice has been generated and will be emailed to you shortly. You can also download all invoices from your Lanework dashboard.";
    } else {
      replyBody += "A member of our team will get back to you within 4 hours. For urgent matters, you can also reach us on WhatsApp.";
    }

    replyBody += "\n\n— Lanework AI Team";

    try {
      const html = this.emailTemplate({
        customerName: params.customerName,
        title: replySubject.replace(/^[📦⏰🔄⚠️🧾]\s*/, ""),
        body: replyBody.replace(`Hi ${params.customerName},\n\n`, "").replace("\n\n— Lanework AI Team", ""),
        actionUrl: `https://lanework.vercel.app/dashboard`,
        actionText: "View Dashboard",
      });

      await this.sendEmail(params.to, replySubject, html);
      await this.logAction("auto_reply", "completed", { to: params.to, category: replySubject });
      return { subject: replySubject, body: replyBody, sent: true };
    } catch (e: any) {
      return { subject: replySubject, body: replyBody, sent: false };
    }
  }

  async checkInbox(limit: number = 10): Promise<Array<{
    id: string; from: string; subject: string; body: string; date: string;
    category: string; needsReply: boolean;
  }>> {
    // In production: Gmail API / IMAP. Here we query from our DB via the webhook events table
    const rows = await this.sql`
      SELECT * FROM messages WHERE processed = false ORDER BY created_at DESC LIMIT ${limit}
    `;

    const results = rows.map((r: any) => ({
      id: r.id,
      from: r.from_email || r.sender || "",
      subject: r.subject || "",
      body: r.body || "",
      date: r.created_at?.toISOString() || "",
      category: this.categorizeEmail(r.subject || "", r.body || ""),
      needsReply: true,
    }));

    // Also check for pending shipment events that need email notifications
    const pendingEvents = await this.sql`
      SELECT * FROM shipment_events WHERE notified = false ORDER BY created_at DESC LIMIT ${limit}
    `;

    for (const event of pendingEvents) {
      const [shipment] = await this.sql`SELECT * FROM shipments WHERE tracking_number = ${event.tracking_number}`;
      if (shipment?.customer_email) {
        results.push({
          id: event.id,
          from: "system@lanework.com",
          subject: `Shipment Update: ${event.tracking_number}`,
          body: `Status changed to ${event.status} at ${event.location}`,
          date: event.created_at?.toISOString() || "",
          category: "shipment_update",
          needsReply: true,
        });
      }
    }

    return results;
  }

  private categorizeEmail(subject: string, body: string): string {
    const txt = (subject + " " + body).toLowerCase();
    if (txt.includes("track") || txt.includes("shipment") || txt.includes("awb")) return "tracking";
    if (txt.includes("delay") || txt.includes("late")) return "delay";
    if (txt.includes("return") || txt.includes("refund") || txt.includes("cancel")) return "return";
    if (txt.includes("damage") || txt.includes("broken")) return "damage";
    if (txt.includes("invoice") || txt.includes("bill") || txt.includes("ewb")) return "invoice";
    return "general";
  }
}

async function main(): Promise<void> {
const SDK = "@modelcontextprotocol/sdk";
  const { Server } = await import(`${SDK}/server/index.js`);
  const { StdioServerTransport } = await import(`${SDK}/server/stdio.js`);
  const { CallToolRequestSchema, ListToolsRequestSchema } = await import(`${SDK}/types.js`);
  
  const mcp = new EmailMCP();
  const server = new Server({ name: "lanework-email", version: "1.0.0" }, { capabilities: { tools: {} } });
  
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: "send_tracking_update", description: "Send shipment tracking email to customer", inputSchema: { type: "object", properties: { to: { type: "string" }, customerName: { type: "string" }, trackingNumber: { type: "string" }, status: { type: "string" }, location: { type: "string" }, estimatedDelivery: { type: "string" } }, required: ["to", "customerName", "trackingNumber", "status"] } },
      { name: "auto_reply", description: "Auto-respond to customer email based on content", inputSchema: { type: "object", properties: { to: { type: "string" }, customerName: { type: "string" }, customerMessage: { type: "string" }, context: { type: "string" } }, required: ["to", "customerName", "customerMessage"] } },
      { name: "check_inbox", description: "Scan recent emails for shipment-related queries", inputSchema: { type: "object", properties: { limit: { type: "number" } }, required: [] } },
    ],
  }));
  
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    await mcp.init();
    try {
      switch (name) {
        case "send_tracking_update": return { content: [{ type: "text", text: JSON.stringify(await mcp.sendTrackingUpdate(args as any), null, 2) }] };
        case "auto_reply": return { content: [{ type: "text", text: JSON.stringify(await mcp.autoReply(args as any), null, 2) }] };
        case "check_inbox": return { content: [{ type: "text", text: JSON.stringify(await mcp.checkInbox((args.limit as number) || 10), null, 2) }] };
        default: throw new Error(`Unknown tool: ${name}`);
      }
    } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
  });
  
  const transport = new StdioServerTransport();
  await mcp.init();
  await server.connect(transport);
  console.error("[EmailMCP] Ready — 3 tools available");
  
}

// Run only when executed directly (tsx index.ts), not when imported by the app.
if (isDirectRun(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
