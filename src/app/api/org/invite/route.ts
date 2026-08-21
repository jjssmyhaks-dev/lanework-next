import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getOrgByUser, getMemberRole, createInvite, getPendingInvites } from "@/lib/org";
import type { OrgRole } from "@/lib/org";

export const GET = withAuth(async (request, user) => {
  const org = await getOrgByUser(user.id);
  if (!org) return NextResponse.json({ invites: [] });

  const role = await getMemberRole(org.id, user.id);
  if (!role || (role !== "super_admin" && role !== "admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const invites = await getPendingInvites(org.id);
  return NextResponse.json({ invites });
});

export const POST = withAuth(async (request, user) => {
  const org = await getOrgByUser(user.id);
  if (!org) return NextResponse.json({ error: "No organisation found" }, { status: 404 });

  const role = await getMemberRole(org.id, user.id);
  if (!role || (role !== "super_admin" && role !== "admin")) {
    return NextResponse.json({ error: "Insufficient permissions to send invites" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, role: inviteRole } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Admins can only invite as member or viewer
    const validRole: OrgRole = role === "admin" && (inviteRole === "super_admin" || inviteRole === "admin")
      ? "member"
      : (inviteRole as OrgRole) || "member";

    const invite = await createInvite(org.id, email.toLowerCase().trim(), validRole, user.id);

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join?token=${invite.token}`;

    // Send invite email
    const { sendInviteEmail } = await import("@/lib/email");
    await sendInviteEmail(email, org.name, validRole, invite.token, user.name || "A team member");

    return NextResponse.json({
      success: true,
      invite: { ...invite, url: inviteUrl },
      message: `Invite link generated. Share this link with ${email}`,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
