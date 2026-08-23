/**
 * Feature Flags — runtime toggleable features per plan tier.
 *
 * Extends the static PlanFeatures in pricing.ts with dynamic flags
 * that can be toggled via API without redeployment.
 *
 * Flags are stored in DB and cached in-memory for 60s.
 * Each flag has:
 *   - A key (e.g. "compliance_polling", "voice_input")
 *   - A default plan tier requirement (e.g. "enterprise")
 *   - An enabled/disabled toggle
 *   - Optional per-org override
 *
 * Usage:
 *   import { isFeatureEnabled, getAllFlags } from "@/lib/feature-flags";
 *   if (await isFeatureEnabled("compliance_polling", userId)) { ... }
 */

import { neon } from "@neondatabase/serverless";
import type { PlanId } from "@/lib/pricing";
import { getUserPlan } from "@/lib/pricing";

const sql = neon(process.env.DATABASE_URL!);

// ── Types ──

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  /** Minimum plan tier required (null = available on all plans) */
  minPlan: PlanId | null;
  /** Whether the flag is globally enabled */
  enabled: boolean;
  /** Optional description of what the flag controls */
  category: string;
  /** When this flag was last modified */
  updatedAt: string;
}

// ── In-memory cache (60s TTL) ──

let cachedFlags: FeatureFlag[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

function isCacheValid(): boolean {
  return cachedFlags !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

function invalidateCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}

// ── Default Flags ──

/** Built-in flags that always exist. New flags can be added via DB. */
const BUILTIN_FLAGS: Omit<FeatureFlag, "id" | "updatedAt">[] = [
  // Polling features
  {
    key: "shipment_polling",
    name: "Shipment Polling",
    description: "Background monitoring of active shipments every 5 minutes",
    minPlan: "free",
    enabled: true,
    category: "polling",
  },
  {
    key: "inventory_polling",
    name: "Inventory Polling",
    description: "Background monitoring of stock levels every 30 minutes",
    minPlan: "starter",
    enabled: true,
    category: "polling",
  },
  {
    key: "fleet_polling",
    name: "Fleet Polling",
    description: "Background monitoring of vehicle locations every 10 minutes",
    minPlan: "growth",
    enabled: true,
    category: "polling",
  },
  {
    key: "compliance_polling",
    name: "Compliance Polling",
    description: "Daily checks for license expiry, RC renewal, challan status",
    minPlan: "enterprise",
    enabled: true,
    category: "polling",
  },
  {
    key: "daily_report",
    name: "Daily Report",
    description: "Auto-generated daily operations summary at 8 AM IST",
    minPlan: "growth",
    enabled: true,
    category: "polling",
  },

  // AI features
  {
    key: "voice_input",
    name: "Voice Input",
    description: "Speak to the AI chat using Sarvam/Bhashini voice recognition",
    minPlan: "enterprise",
    enabled: false,
    category: "ai",
  },
  {
    key: "ai_reports",
    name: "AI Reports",
    description: "AI-generated business intelligence reports and insights",
    minPlan: "growth",
    enabled: true,
    category: "ai",
  },
  {
    key: "ai_auto_actions",
    name: "AI Auto Actions",
    description: "AI agent can auto-execute low-risk actions without approval",
    minPlan: "growth",
    enabled: true,
    category: "ai",
  },

  // Integration features
  {
    key: "webhook_events",
    name: "Webhook Events",
    description: "Receive real-time webhook events from Shiprocket, Shopify, FedEx",
    minPlan: "starter",
    enabled: true,
    category: "integration",
  },
  {
    key: "api_access",
    name: "API Access",
    description: "REST API access for custom integrations",
    minPlan: "enterprise",
    enabled: true,
    category: "integration",
  },
  {
    key: "white_label",
    name: "White Label",
    description: "Custom branding, domain, and email templates",
    minPlan: "enterprise",
    enabled: false,
    category: "integration",
  },

  // Data features
  {
    key: "csv_import",
    name: "CSV Import",
    description: "Import shipments, inventory, and orders via CSV/Excel files",
    minPlan: "free",
    enabled: true,
    category: "data",
  },
  {
    key: "csv_export",
    name: "CSV Export",
    description: "Export data to CSV/Excel for external analysis",
    minPlan: "starter",
    enabled: true,
    category: "data",
  },
  {
    key: "data_retention_90d",
    name: "Extended Data Retention",
    description: "Keep data for 90 days instead of default 30 days",
    minPlan: "growth",
    enabled: true,
    category: "data",
  },

  // Support features
  {
    key: "priority_support",
    name: "Priority Support",
    description: "Priority email and chat support with 4-hour response SLA",
    minPlan: "growth",
    enabled: true,
    category: "support",
  },
  {
    key: "dedicated_manager",
    name: "Dedicated Account Manager",
    description: "Dedicated account manager for onboarding and optimization",
    minPlan: "enterprise",
    enabled: true,
    category: "support",
  },
];

// ── Ensure table exists ──

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    min_plan TEXT,
    enabled BOOLEAN DEFAULT true,
    category TEXT DEFAULT 'general',
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;

  // Seed builtin flags if table is empty
  const [count] = await sql`SELECT COUNT(*)::int AS count FROM feature_flags`;
  if (count.count === 0) {
    for (const flag of BUILTIN_FLAGS) {
      await sql`
        INSERT INTO feature_flags (id, key, name, description, min_plan, enabled, category, updated_at)
        VALUES (gen_random_uuid(), ${flag.key}, ${flag.name}, ${flag.description},
                ${flag.minPlan}, ${flag.enabled}, ${flag.category}, NOW())
        ON CONFLICT (key) DO NOTHING
      `;
    }
  }
}

// ── Public API ──

/**
 * Check if a feature is enabled for a given user.
 * Checks both the global flag toggle AND the user's plan tier.
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId: string
): Promise<boolean> {
  const flags = await getAllFlags();
  const flag = flags.find((f) => f.key === flagKey);

  // Flag doesn't exist or is globally disabled
  if (!flag || !flag.enabled) return false;

  // No plan requirement
  if (!flag.minPlan) return true;

  // Check user's plan
  const userPlan = await getUserPlan(userId);
  const planOrder: PlanId[] = ["free", "starter", "growth", "enterprise"];
  const userPlanIdx = planOrder.indexOf(userPlan);
  const requiredPlanIdx = planOrder.indexOf(flag.minPlan);

  return userPlanIdx >= requiredPlanIdx;
}

/**
 * Check if a feature is enabled without user context (admin check).
 */
export async function isFeatureEnabledGlobal(
  flagKey: string
): Promise<boolean> {
  const flags = await getAllFlags();
  const flag = flags.find((f) => f.key === flagKey);
  return flag?.enabled ?? false;
}

/**
 * Get all feature flags.
 */
export async function getAllFlags(): Promise<FeatureFlag[]> {
  if (isCacheValid()) return cachedFlags!;

  try {
    await ensureTable();
    const rows = await sql`
      SELECT id, key, name, description, min_plan, enabled, category, updated_at
      FROM feature_flags
      ORDER BY category, key
    `;
    cachedFlags = rows.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      minPlan: r.min_plan,
      enabled: r.enabled,
      category: r.category,
      updatedAt: r.updated_at,
    }));
    cacheTimestamp = Date.now();
    return cachedFlags!;
  } catch {
    // Fallback to builtin flags if DB fails
    return BUILTIN_FLAGS.map((f, i) => ({
      ...f,
      id: `builtin-${i}`,
      updatedAt: new Date().toISOString(),
    }));
  }
}

/**
 * Get flags relevant to a specific user (shows which are available vs locked).
 */
export async function getFlagsForUser(
  userId: string
): Promise<
  Array<FeatureFlag & { available: boolean; lockedReason?: string }>
> {
  const flags = await getAllFlags();
  const userPlan = await getUserPlan(userId);
  const planOrder: PlanId[] = ["free", "starter", "growth", "enterprise"];
  const userPlanIdx = planOrder.indexOf(userPlan);

  return flags.map((flag) => {
    if (!flag.enabled) {
      return { ...flag, available: false, lockedReason: "Disabled by admin" };
    }
    if (!flag.minPlan) {
      return { ...flag, available: true };
    }
    const requiredIdx = planOrder.indexOf(flag.minPlan);
    if (userPlanIdx >= requiredIdx) {
      return { ...flag, available: true };
    }
    return {
      ...flag,
      available: false,
      lockedReason: `Requires ${flag.minPlan} plan or higher`,
    };
  });
}

/**
 * Toggle a feature flag on/off.
 */
export async function toggleFlag(
  flagKey: string,
  enabled: boolean
): Promise<boolean> {
  await ensureTable();
  const result = await sql`
    UPDATE feature_flags SET enabled = ${enabled}, updated_at = NOW()
    WHERE key = ${flagKey}
    RETURNING key
  `;
  invalidateCache();
  return result.length > 0;
}

/**
 * Update the minimum plan tier for a flag.
 */
export async function setFlagMinPlan(
  flagKey: string,
  minPlan: PlanId | null
): Promise<boolean> {
  await ensureTable();
  const result = await sql`
    UPDATE feature_flags SET min_plan = ${minPlan}, updated_at = NOW()
    WHERE key = ${flagKey}
    RETURNING key
  `;
  invalidateCache();
  return result.length > 0;
}
