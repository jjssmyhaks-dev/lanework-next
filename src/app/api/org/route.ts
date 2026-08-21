import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getOrgByUser, createOrg, updateOrg } from "@/lib/org";
import type { CompanySize } from "@/lib/org";

export const GET = withAuth(async (request, user) => {
  const org = await getOrgByUser(user.id);
  if (!org) return NextResponse.json({ org: null });
  return NextResponse.json({ org });
});

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { name, companySize } = body;
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Organisation name must be at least 2 characters" }, { status: 400 });
    }
    const existing = await getOrgByUser(user.id);
    if (existing) {
      return NextResponse.json({ error: "You already belong to an organisation" }, { status: 409 });
    }
    const org = await createOrg(name.trim(), user.id, (companySize as CompanySize) || "solo");
    return NextResponse.json({ org }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const org = await getOrgByUser(user.id);
    if (!org) return NextResponse.json({ error: "No organisation found" }, { status: 404 });
    const updated = await updateOrg(org.id, body);
    return NextResponse.json({ org: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
});
