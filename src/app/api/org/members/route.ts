import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getOrgByUser, getOrgMembers, addMember, getMemberRole } from "@/lib/org";
import type { OrgRole } from "@/lib/org";
import { canAccessSection } from "@/lib/permissions";

export const GET = withAuth(async (request, user) => {
  const org = await getOrgByUser(user.id);
  if (!org) return NextResponse.json({ members: [] });

  const role = await getMemberRole(org.id, user.id);
  if (!role) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const members = await getOrgMembers(org.id);
  return NextResponse.json({ members, currentRole: role });
});

export const POST = withAuth(async (request, user) => {
  const org = await getOrgByUser(user.id);
  if (!org) return NextResponse.json({ error: "No organisation found" }, { status: 404 });

  const role = await getMemberRole(org.id, user.id);
  if (!role || !canAccessSection(role, "team")) {
    return NextResponse.json({ error: "Insufficient permissions to manage team" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, role: newRole } = body;
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    await addMember(org.id, userId, (newRole as OrgRole) || "member", user.id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
