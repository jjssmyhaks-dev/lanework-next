/**
 * Email Service — Resend integration
 * Handles password reset, team invites, and notifications
 * Falls back to console.log when RESEND_API_KEY is not configured
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || "Lanework <noreply@lanework.in>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  // If no Resend key, log to console (dev mode)
  if (!RESEND_API_KEY) {
    console.log(`[Email] No RESEND_API_KEY configured. Would send:`);
    console.log(`  To: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(`  Preview: ${options.text || options.html.slice(0, 200)}`);
    return { success: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[Email] Resend error:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Email] Send failed:", error.message);
    return { success: false, error: error.message };
  }
}

// ── Email Templates ──

function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { display: inline-flex; align-items: center; gap: 8px; }
    .logo-box { width: 32px; height: 32px; background: #1a1a2e; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .logo-diamond { width: 14px; height: 14px; background: white; border-radius: 2px; transform: rotate(45deg); }
    .logo-text { font-size: 18px; font-weight: 600; color: #1a1a2e; }
    .card { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 20px; color: #1a1a2e; margin: 0 0 8px; }
    p { font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #1a1a2e; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af; }
    .token { font-family: monospace; font-size: 13px; background: #f3f4f6; padding: 8px 12px; border-radius: 6px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <div class="logo-box"><div class="logo-diamond"></div></div>
        <span class="logo-text">Lanework</span>
      </div>
    </div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Lanework, Inc. · Mumbai, India</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const html = wrapTemplate(`
    <h1>Reset your password</h1>
    <p>You requested a password reset for your Lanework account. Click the button below to set a new password. This link expires in 1 hour.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </p>
    <p>If the button doesn't work, copy and paste this URL into your browser:</p>
    <p class="token">${resetUrl}</p>
    <p style="color: #ef4444; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
  `);

  return sendEmail({
    to: email,
    subject: "Reset your Lanework password",
    html,
    text: `Reset your Lanework password: ${resetUrl} (expires in 1 hour)`,
  });
}

export async function sendInviteEmail(
  email: string,
  orgName: string,
  role: string,
  inviteToken: string,
  invitedByName: string
): Promise<{ success: boolean; error?: string }> {
  const inviteUrl = `${APP_URL}/join?token=${inviteToken}`;

  const html = wrapTemplate(`
    <h1>You're invited to ${orgName}</h1>
    <p><strong>${invitedByName}</strong> has invited you to join <strong>${orgName}</strong> on Lanework as a <strong>${role.replace("_", " ")}</strong>.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${inviteUrl}" class="btn">Accept Invitation</a>
    </p>
    <p>If the button doesn't work, copy and paste this URL into your browser:</p>
    <p class="token">${inviteUrl}</p>
    <p>This invitation expires in 7 days.</p>
  `);

  return sendEmail({
    to: email,
    subject: `You're invited to ${orgName} on Lanework`,
    html,
    text: `Join ${orgName} on Lanework: ${inviteUrl} (expires in 7 days)`,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const html = wrapTemplate(`
    <h1>Welcome to Lanework! 🎉</h1>
    <p>Hi ${name},</p>
    <p>Your account is set up and ready. Here's how to get started:</p>
    <ol style="font-size: 14px; color: #374151; line-height: 2;">
      <li><strong>Connect your tools</strong> — Plug in Shiprocket, TallyPrime, or upload a CSV</li>
      <li><strong>Add your first shipment</strong> — Track a real delivery in real-time</li>
      <li><strong>Try the AI chat</strong> — Ask "Track shipment SH-2024-001" or "Check inventory"</li>
    </ol>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${APP_URL}/dashboard" class="btn">Go to Dashboard</a>
    </p>
  `);

  return sendEmail({
    to: email,
    subject: "Welcome to Lanework! 🚛",
    html,
    text: `Welcome to Lanework! Your logistics AI is ready. Go to ${APP_URL}/dashboard`,
  });
}
