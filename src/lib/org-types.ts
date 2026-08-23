/**
 * Organisation types and constants — safe for both client and server.
 * Keep server-side DB logic in org.ts, types here.
 */

export const COMPANY_SIZES = [
  { value: "solo", label: "Solo (1 person)", maxUsers: 1, members: "1", description: "Just me — founder or ops lead handling everything" },
  { value: "2-10", label: "Small Team (2–10)", maxUsers: 10, members: "2–10", description: "Small team with a few dedicated logistics staff" },
  { value: "11-30", label: "Growing (11–30)", maxUsers: 30, members: "11–30", description: "Growing operations with dedicated departments" },
  { value: "31-50", label: "Mid-size (31–50)", maxUsers: 50, members: "31–50", description: "Multiple warehouses or regional operations" },
  { value: "51-100", label: "Large (51–100)", maxUsers: 100, members: "51–100", description: "Large-scale logistics with complex workflows" },
  { value: "100+", label: "Enterprise (100+)", maxUsers: 999, members: "100+", description: "Enterprise-grade with custom requirements" },
] as const;

export type CompanySize = (typeof COMPANY_SIZES)[number]["value"];

export type OrgRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER" | "VIEWER";

export interface OrgMember {
  id: string;
  userId: string;
  orgId: string;
  role: OrgRole;
  joinedAt: string;
}

export interface Organisation {
  id: string;
  name: string;
  plan: string;
  companySize: string;
  createdAt: string;
}
