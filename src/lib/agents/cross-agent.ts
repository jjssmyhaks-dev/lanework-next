/**
 * Cross-Agent Propagation — enables agents to share context and coordinate.
 *
 * When one agent detects an issue, related agents are notified:
 * - shipment.delayed → fleet agent (driver may need rerouting)
 * - stock.out_of_stock → warehouse agent (dock scheduling affected)
 * - compliance.license_expiring → fleet agent (vehicle can't be dispatched)
 *
 * This creates a collaborative agent system instead of isolated silos.
 */

import { emitEvent, onEvent, type AgentEvent, type AgentEventType } from "./events";
import { storeMemory, queryMemory } from "./memory";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "cross-agent" });

// ── Propagation Rules ──

interface PropagationRule {
  sourceEvent: AgentEventType;
  targetEvent: AgentEventType;
  transform: (data: Record<string, unknown>) => Record<string, unknown>;
  description: string;
}

const PROPAGATION_RULES: PropagationRule[] = [
  // Shipment delayed → notify fleet agent
  {
    sourceEvent: "shipment.delayed",
    targetEvent: "fleet.maintenance_due",
    transform: (data) => ({
      vehicleId: data.vehicleId,
      plateNumber: data.plateNumber,
      reason: `Shipment ${data.trackingNumber} delayed — check if vehicle needs rerouting`,
      source: "shipment_tracking",
      kmOverdue: 0,
    }),
    description: "Shipment delay may affect fleet scheduling",
  },

  // Stock out of stock → warehouse agent
  {
    sourceEvent: "stock.out_of_stock",
    targetEvent: "stock.below_reorder",
    transform: (data) => ({
      ...data,
      urgency: "critical",
      source: "inventory_management",
    }),
    description: "Out of stock triggers warehouse replenishment workflow",
  },

  // License expiring → fleet can't dispatch
  {
    sourceEvent: "compliance.license_expiring",
    targetEvent: "fleet.driver_overtime",
    transform: (data) => ({
      driverId: data.driverId,
      driverName: data.driverName,
      reason: `License expires in ${data.daysUntilExpiry} days — cannot dispatch`,
      source: "compliance",
      action: "flag_unavailable",
    }),
    description: "Expiring license means driver can't be dispatched",
  },

  // Delivery completed → inventory adjustment
  {
    sourceEvent: "delivery.completed",
    targetEvent: "stock.received",
    transform: (data) => ({
      trackingNumber: data.trackingNumber,
      orderId: data.orderId,
      source: "shipment_tracking",
      action: "deduct_inventory",
    }),
    description: "Completed delivery should update inventory counts",
  },

  // New order → check fleet availability
  {
    sourceEvent: "order.new",
    targetEvent: "fleet.offline",
    transform: (data) => ({
      orderId: data.orderId,
      itemCount: data.itemCount,
      destination: data.shippingAddress,
      source: "shopify",
      action: "check_fleet_availability",
    }),
    description: "New order needs fleet availability check",
  },
];

// ── Shared Context Store ──

interface SharedContext {
  activeDelays: Array<{ trackingNumber: string; hoursSinceUpdate: number; carrier: string }>;
  pendingApprovals: number;
  lowStockItems: Array<{ sku: string; quantity: number }>;
  offlineDrivers: string[];
  expiringLicenses: Array<{ driverName: string; daysUntilExpiry: number }>;
  lastUpdated: string;
}

const sharedContextCache = new Map<string, SharedContext>();

export async function getSharedContext(tenantId: string): Promise<SharedContext> {
  const cached = sharedContextCache.get(tenantId);
  if (cached && Date.now() - new Date(cached.lastUpdated).getTime() < 5 * 60 * 1000) {
    return cached;
  }

  // Build fresh context from memory
  const delays = await queryMemory({ tenantId, memoryType: "context", key: "active_delay", limit: 20 });
  const lowStock = await queryMemory({ tenantId, memoryType: "context", key: "low_stock", limit: 20 });
  const offlineDrivers = await queryMemory({ tenantId, memoryType: "context", key: "offline_driver", limit: 20 });
  const expiringLicenses = await queryMemory({ tenantId, memoryType: "context", key: "expiring_license", limit: 20 });

  const context: SharedContext = {
    activeDelays: delays.map((d) => ({
      trackingNumber: d.entityId,
      hoursSinceUpdate: (d.value as any)?.hoursSinceUpdate || 0,
      carrier: (d.value as any)?.carrier || "unknown",
    })),
    pendingApprovals: 0, // Will be set from DB
    lowStockItems: lowStock.map((s) => ({
      sku: s.entityId,
      quantity: (s.value as any)?.quantity || 0,
    })),
    offlineDrivers: offlineDrivers.map((d) => d.entityId),
    expiringLicenses: expiringLicenses.map((l) => ({
      driverName: l.entityId,
      daysUntilExpiry: (l.value as any)?.daysUntilExpiry || 0,
    })),
    lastUpdated: new Date().toISOString(),
  };

  sharedContextCache.set(tenantId, context);
  return context;
}

// ── Register propagation handlers ──

export function registerCrossAgentPropagation(): void {
  for (const rule of PROPAGATION_RULES) {
    onEvent(rule.sourceEvent, async (event) => {
      try {
        const transformed = rule.transform(event.data);

        // Store in shared context
        if (event.tenantId) {
          await storeMemory({
            tenantId: event.tenantId,
            entityType: rule.sourceEvent.split(".")[0],
            entityId: event.entityId || "unknown",
            memoryType: "context",
            key: `cross_agent_${rule.sourceEvent}`,
            value: { ...transformed, propagatedFrom: rule.sourceEvent },
            confidence: 0.8,
            ttlDays: 7,
          });
        }

        // Emit propagated event (skip if same event type to avoid loops)
        if (rule.targetEvent !== rule.sourceEvent) {
          await emitEvent(rule.targetEvent, {
            ...transformed,
            _propagatedFrom: rule.sourceEvent,
            _propagationReason: rule.description,
          }, {
            source: "system",
            tenantId: event.tenantId,
          });

          log.info({
            from: rule.sourceEvent,
            to: rule.targetEvent,
            tenantId: event.tenantId,
          }, "Cross-agent event propagated");
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "unknown";
        log.error({ err: msg, rule: rule.description }, "Cross-agent propagation failed");
      }
    });
  }

  log.info({ rules: PROPAGATION_RULES.length }, "Cross-agent propagation registered");
}
