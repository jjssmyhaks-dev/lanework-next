/**
 * Permission definitions and RBAC helpers
 * Used for both server-side checks and client-side conditional rendering
 */
import type { OrgRole } from "./org";
export type { OrgRole } from "./org";

// ── Permission Definitions ──

export const PERMISSIONS = {
  // Shipments
  "shipments.create": { description: "Create shipments", defaultRoles: ["super_admin", "admin", "member"] },
  "shipments.view": { description: "View shipments", defaultRoles: ["super_admin", "admin", "member", "viewer"] },
  "shipments.edit": { description: "Edit shipments", defaultRoles: ["super_admin", "admin", "member"] },
  "shipments.delete": { description: "Delete shipments", defaultRoles: ["super_admin", "admin"] },

  // Inventory
  "inventory.create": { description: "Add inventory items", defaultRoles: ["super_admin", "admin", "member"] },
  "inventory.view": { description: "View inventory", defaultRoles: ["super_admin", "admin", "member", "viewer"] },
  "inventory.edit": { description: "Edit inventory", defaultRoles: ["super_admin", "admin", "member"] },
  "inventory.delete": { description: "Delete inventory", defaultRoles: ["super_admin", "admin"] },

  // Fleet
  "fleet.view": { description: "View fleet", defaultRoles: ["super_admin", "admin", "member", "viewer"] },
  "fleet.edit": { description: "Edit fleet", defaultRoles: ["super_admin", "admin", "member"] },
  "fleet.manage": { description: "Manage drivers & vehicles", defaultRoles: ["super_admin", "admin"] },

  // Chat & AI
  "chat.use": { description: "Use AI chat", defaultRoles: ["super_admin", "admin", "member"] },
  "chat.unlimited": { description: "Unlimited chat messages", defaultRoles: ["super_admin"] },

  // Agents
  "agents.configure": { description: "Configure agent settings", defaultRoles: ["super_admin", "admin"] },
  "agents.approve": { description: "Approve agent actions", defaultRoles: ["super_admin", "admin"] },
  "agents.view": { description: "View agent status", defaultRoles: ["super_admin", "admin", "member"] },

  // Integrations
  "integrations.manage": { description: "Manage integrations", defaultRoles: ["super_admin", "admin"] },
  "integrations.view": { description: "View integrations", defaultRoles: ["super_admin", "admin", "member", "viewer"] },

  // Billing
  "billing.view": { description: "View billing", defaultRoles: ["super_admin", "admin"] },
  "billing.manage": { description: "Manage billing & subscriptions", defaultRoles: ["super_admin"] },

  // Team
  "team.invite": { description: "Invite team members", defaultRoles: ["super_admin", "admin"] },
  "team.manage": { description: "Manage team roles", defaultRoles: ["super_admin", "admin"] },
  "team.remove": { description: "Remove team members", defaultRoles: ["super_admin", "admin"] },

  // Reports
  "reports.view": { description: "View reports", defaultRoles: ["super_admin", "admin", "member", "viewer"] },
  "reports.export": { description: "Export reports", defaultRoles: ["super_admin", "admin", "member"] },

  // Settings
  "settings.view": { description: "View settings", defaultRoles: ["super_admin", "admin", "member", "viewer"] },
  "settings.edit": { description: "Edit settings", defaultRoles: ["super_admin", "admin"] },

  // Warehouse
  "warehouse.view": { description: "View warehouse", defaultRoles: ["super_admin", "admin", "member", "viewer"] },
  "warehouse.edit": { description: "Edit warehouse", defaultRoles: ["super_admin", "admin", "member"] },

  // Routes
  "routes.view": { description: "View routes", defaultRoles: ["super_admin", "admin", "member", "viewer"] },
  "routes.edit": { description: "Edit routes", defaultRoles: ["super_admin", "admin", "member"] },

  // Customers
  "customers.view": { description: "View customers", defaultRoles: ["super_admin", "admin", "member", "viewer"] },
  "customers.edit": { description: "Edit customers", defaultRoles: ["super_admin", "admin", "member"] },
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ── Role Helpers ──

const ROLE_HIERARCHY: OrgRole[] = ["super_admin", "admin", "member", "viewer"];

/** Check if a role has a specific permission */
export function hasPermission(role: OrgRole, permission: Permission): boolean {
  const perm = PERMISSIONS[permission];
  if (!perm) return false;
  return (perm.defaultRoles as readonly string[]).includes(role);
}

/** Get all permissions for a role */
export function getRolePermissions(role: OrgRole): Permission[] {
  return Object.keys(PERMISSIONS).filter((p) =>
    hasPermission(role, p as Permission)
  ) as Permission[];
}

/** Check if role A outranks role B */
export function outranks(a: OrgRole, b: OrgRole): boolean {
  return ROLE_HIERARCHY.indexOf(a) < ROLE_HIERARCHY.indexOf(b);
}

/** Get the role hierarchy level (lower = more power) */
export function getRoleLevel(role: OrgRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/** All available roles with metadata */
export const ROLES: { id: OrgRole; name: string; description: string; color: string }[] = [
  { id: "super_admin", name: "Super Admin", description: "Full access — billing, org settings, manage all members", color: "bg-red-100 text-red-700 border-red-200" },
  { id: "admin", name: "Admin", description: "Manage members, approve actions, all operational features", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "member", name: "Member", description: "Use all features — shipments, inventory, chat, routes", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "viewer", name: "Viewer", description: "Read-only access to dashboards and reports", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

/** Check if a user can access a sidebar section */
export function canAccessSection(role: OrgRole, section: string): boolean {
  const sectionPermissions: Record<string, Permission[]> = {
    chat: ["chat.use"],
    dashboard: ["shipments.view", "inventory.view", "fleet.view"],
    shipments: ["shipments.view"],
    inventory: ["inventory.view"],
    fleet: ["fleet.view"],
    routes: ["routes.view"],
    warehouse: ["warehouse.view"],
    customer: ["customers.view"],
    agents: ["agents.view"],
    approvals: ["agents.approve"],
    alerts: ["agents.view"],
    metrics: ["agents.view"],
    trust: ["agents.configure"],
    harness: ["agents.configure"],
    integrations: ["integrations.view"],
    pricing: ["billing.view"],
    billing: ["billing.view"],
    team: ["team.manage"],
    settings: ["settings.view"],
  };

  const perms = sectionPermissions[section];
  if (!perms) return true; // Unknown sections are accessible
  return perms.some((p) => hasPermission(role, p));
}
