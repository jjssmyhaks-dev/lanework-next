import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { validateInvite, acceptInvite } from "@/lib/org";

export const GET = async (
  request: NextRequest,
  ctx: { params: Promise<Record<string, string>> | Record<string, string> }
) => {
  const params = await ctx.params;
  const { valid, invite, error } = await validateInvite(params.token);

  if (!valid) {
    return NextResponse.json({ valid: false, error }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    org: { name: invite.org_name },
    role: invite.role,
    invitedBy: invite.invited_by,
    expiresAt: invite.expires_at,
  });
};

export const POST = withAuth(async (request, user, ctx) => {
  const params = await (ctx as any).params;
  const result = await acceptInvite(params.token, user.id);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: "Welcome to the team!" });
});
