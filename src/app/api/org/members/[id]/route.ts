import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getOrgByUser, getMemberRole, updateMemberRole, removeMember } from "@/lib/org";
import type { OrgRole } from "@/lib/org";
import { outranks } from "@/lib/permissions";

export const PATCH = withAuth(async (request, user, ctx) => {
  const org = await getOrgByUser(user.id);
  if (!org) return NextResponse.json({ error: "No organisation found" }, { status: 404 });

  const callerRole = await getMemberRole(org.id, user.id);
  if (!callerRole || (callerRole !== "super_admin" && callerRole !== "admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const targetUserId = (ctx?.params as any)?.id;
  if (!targetUserId) return NextResponse.json({ error: "Member ID required" }, { status: 400 });

  const targetRole = await getMemberRole(org.id, targetUserId);
  if (!targetRole) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Can't promote someone to a role higher than yours
  const body = await request.json();
  const newRole = body.role as OrgRole;
  if (!newRole) return NextResponse.json({ error: "Role is required" }, { status: 400 });

  const validRoles: OrgRole[] = ["super_admin", "admin", "member", "viewer"];
  if (!validRoles.includes(newRole)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  // Admins can't promote to super_admin
  if (callerRole === "admin" && newRole === "super_admin") {
    return NextResponse.json({ error: "Only super admins can assign super admin role" }, { status: 403 });
  }

  await updateMemberRole(org.id, targetUserId, newRole);
  return NextResponse.json({ success: true });
});

export const DELETE = withAuth(async (request, user, ctx) => {
  const org = await getOrgByUser(user.id);
  if (!org) return NextResponse.json({ error: "No organisation found" }, { status: 404 });

  const callerRole = await getMemberRole(org.id, user.id);
  if (!callerRole || (callerRole !== "super_admin" && callerRole !== "admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const targetUserId = (ctx?.params as any)?.id;
  if (!targetUserId) return NextResponse.json({ error: "Member ID required" }, { status: 400 });

  // Can't remove yourself
  if (targetUserId === user.id) {
    return NextResponse.json({ error: "You cannot remove yourself from the organisation" }, { status: 400 });
  }

  const targetRole = await getMemberRole(org.id, targetUserId);

  // Can't remove someone with equal or higher rank
  if (targetRole && callerRole !== "super_admin" && !outranks(callerRole, targetRole)) {
    return NextResponse.json({ error: "Cannot remove a member with equal or higher role" }, { status: 403 });
  }

  await removeMember(org.id, targetUserId);
  return NextResponse.json({ success: true });
});
