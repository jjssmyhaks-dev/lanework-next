// @ts-nocheck
/**
 * Organisation & Team Management
 * Handles org creation, membership, RBAC, invites
 */
import { neon } from "@neondatabase/serverless";

export type OrgRole = "super_admin" | "admin" | "member" | "viewer";
export type CompanySize = "solo" | "2-10" | "11-30" | "31-50" | "51-100" | "100+";

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  permissions: Record<string, boolean>;
  invited_by?: string;
  joined_at: string;
  user_name?: string;
  user_email?: string;
}

export interface Org {
  id: string;
  name: string;
  slug?: string;
  owner_id: string;
  company_size: CompanySize;
  plan: string;
  settings: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
}

const sql = neon(process.env.DATABASE_URL!);

// ── Org CRUD ──

export async function createOrg(
  name: string,
  ownerId: string,
  companySize: CompanySize = "solo"
): Promise<Org> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = crypto.randomUUID();

  const [org] = await sql`
    INSERT INTO organizations (id, name, slug, owner_id, company_size, plan, created_at, updated_at)
    VALUES (${id}, ${name}, ${slug}, ${ownerId}, ${companySize}, 'free', NOW(), NOW())
    RETURNING *
  `;

  // Add owner as super_admin member
  await sql`
    INSERT INTO org_members (id, org_id, user_id, role, joined_at)
    VALUES (${crypto.randomUUID()}, ${id}, ${ownerId}, 'super_admin', NOW())
  `;

  // Link user to org
  await sql`UPDATE users SET org_id = ${id}, org_role = 'super_admin' WHERE id = ${ownerId}`;

  return org;
}

export async function getOrg(orgId: string): Promise<Org | null> {
  const [org] = await sql`SELECT * FROM organizations WHERE id = ${orgId}`;
  return org || null;
}

export async function getOrgByUser(userId: string): Promise<Org | null> {
  const [row] = await sql`
    SELECT o.* FROM organizations o
    JOIN users u ON u.org_id = o.id
    WHERE u.id = ${userId}
    LIMIT 1
  `;
  if (row) return row;

  // Fallback: check org_members
  const [member] = await sql`
    SELECT o.* FROM organizations o
    JOIN org_members m ON m.org_id = o.id
    WHERE m.user_id = ${userId}
    LIMIT 1
  `;
  return member || null;
}

export async function updateOrg(orgId: string, updates: Partial<Org>): Promise<Org | null> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push("name"); values.push(updates.name); }
  if (updates.company_size !== undefined) { fields.push("company_size"); values.push(updates.company_size); }
  if (updates.plan !== undefined) { fields.push("plan"); values.push(updates.plan); }
  if (updates.settings !== undefined) { fields.push("settings"); values.push(JSON.stringify(updates.settings)); }
  if (updates.logo_url !== undefined) { fields.push("logo_url"); values.push(updates.logo_url); }

  if (fields.length === 0) return getOrg(orgId);

  fields.push("updated_at");
  values.push(new Date().toISOString());

  const [org] = await sql`UPDATE organizations SET updated_at = NOW() WHERE id = ${orgId} RETURNING *`;
  return org || null;
}

// ── Members ──

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const members = await sql`
    SELECT m.*, u.name as user_name, u.email as user_email
    FROM org_members m
    JOIN users u ON u.id = m.user_id
    WHERE m.org_id = ${orgId}
    ORDER BY
      CASE m.role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'member' THEN 3
        WHEN 'viewer' THEN 4
      END,
      m.joined_at ASC
  `;
  return members;
}

export async function getMemberRole(orgId: string, userId: string): Promise<OrgRole | null> {
  const [member] = await sql`SELECT role FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId}`;
  return (member?.role as OrgRole) || null;
}

export async function addMember(
  orgId: string,
  userId: string,
  role: OrgRole = "member",
  invitedBy?: string
): Promise<void> {
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO org_members (id, org_id, user_id, role, invited_by, joined_at)
    VALUES (${id}, ${orgId}, ${userId}, ${role}, ${invitedBy}, NOW())
    ON CONFLICT (org_id, user_id) DO NOTHING
  `;
  await sql`UPDATE users SET org_id = ${orgId}, org_role = ${role} WHERE id = ${userId}`;
}

export async function updateMemberRole(
  orgId: string,
  userId: string,
  newRole: OrgRole
): Promise<void> {
  await sql`UPDATE org_members SET role = ${newRole} WHERE org_id = ${orgId} AND user_id = ${userId}`;
  await sql`UPDATE users SET org_role = ${newRole} WHERE id = ${userId}`;
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await sql`DELETE FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId}`;
  await sql`UPDATE users SET org_id = NULL, org_role = NULL WHERE id = ${userId}`;
}

export async function getMemberCount(orgId: string): Promise<number> {
  const [row] = await sql`SELECT COUNT(*) as count FROM org_members WHERE org_id = ${orgId}`;
  return Number(row?.count) || 0;
}

// ── Invites ──

export async function createInvite(
  orgId: string,
  email: string,
  role: OrgRole,
  invitedBy: string
): Promise<{ id: string; token: string; expires_at: string }> {
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const [invite] = await sql`
    INSERT INTO org_invites (id, org_id, email, role, token, invited_by, expires_at, created_at)
    VALUES (${id}, ${orgId}, ${email}, ${role}, ${token}, ${invitedBy}, NOW() + INTERVAL '7 days', NOW())
    RETURNING *
  `;
  return { id: invite.id, token: invite.token, expires_at: invite.expires_at };
}

export async function getPendingInvites(orgId: string): Promise<any[]> {
  return await sql`
    SELECT i.*, u.name as invited_by_name
    FROM org_invites i
    LEFT JOIN users u ON u.id = i.invited_by
    WHERE i.org_id = ${orgId} AND i.accepted_at IS NULL AND i.expires_at > NOW()
    ORDER BY i.created_at DESC
  `;
}

export async function validateInvite(token: string): Promise<{
  valid: boolean;
  invite?: any;
  error?: string;
}> {
  const [invite] = await sql`
    SELECT i.*, o.name as org_name
    FROM org_invites i
    JOIN organizations o ON o.id = i.org_id
    WHERE i.token = ${token} AND i.accepted_at IS NULL
  `;

  if (!invite) return { valid: false, error: "Invalid or already used invite link" };
  if (new Date(invite.expires_at) < new Date()) return { valid: false, error: "This invite has expired" };

  return { valid: true, invite };
}

export async function acceptInvite(token: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const { valid, invite } = await validateInvite(token);
  if (!valid || !invite) return { success: false, error: "Invalid invite" };

  // Check if already a member
  const existing = await sql`SELECT id FROM org_members WHERE org_id = ${invite.org_id} AND user_id = ${userId}`;
  if (existing.length > 0) return { success: false, error: "You are already a member of this organisation" };

  // Check member limit
  const org = await getOrg(invite.org_id);
  if (org) {
    const count = await getMemberCount(org.id);
    const { PLANS } = await import("@/lib/pricing");
    const planFeatures = PLANS[(org.plan || "free") as keyof typeof PLANS]?.features;
    if (planFeatures && planFeatures.maxUsers !== -1 && count >= planFeatures.maxUsers) {
      return { success: false, error: "Your plan's team member limit has been reached. Please upgrade." };
    }
  }

  await addMember(invite.org_id, userId, invite.role as OrgRole, invite.invited_by);
  await sql`UPDATE org_invites SET accepted_at = NOW() WHERE id = ${invite.id}`;

  return { success: true };
}

export async function getInviteByEmail(email: string, orgId: string): Promise<any | null> {
  const [invite] = await sql`
    SELECT * FROM org_invites
    WHERE email = ${email} AND org_id = ${orgId} AND accepted_at IS NULL AND expires_at > NOW()
    LIMIT 1
  `;
  return invite || null;
}

// ── Plan Recommendation ──

export function suggestPlanForSize(companySize: CompanySize): string {
  switch (companySize) {
    case "solo": return "free";
    case "2-10": return "starter";
    case "11-30": return "starter";
    case "31-50": return "growth";
    case "51-100": return "growth";
    case "100+": return "enterprise";
    default: return "free";
  }
}

export const COMPANY_SIZES: { value: CompanySize; label: string; description: string; members: string }[] = [
  { value: "solo", label: "Just me", description: "Solo operator — you handle everything", members: "1 person" },
  { value: "2-10", label: "2–10 people", description: "Small team — shared logistics ops", members: "Up to 10 people" },
  { value: "11-30", label: "11–30 people", description: "Growing team — multiple warehouses", members: "Up to 30 people" },
  { value: "31-50", label: "31–50 people", description: "Scaling operations — need compliance", members: "Up to 50 people" },
  { value: "51-100", label: "51–100 people", description: "Large team — enterprise features needed", members: "Up to 100 people" },
  { value: "100+", label: "100+ people", description: "Enterprise — full platform + custom integrations", members: "Unlimited" },
];
