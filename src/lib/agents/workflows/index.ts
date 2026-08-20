/**
 * Pre-built Workflows — common autonomous agent workflows.
 *
 * Each workflow defines a sequence of steps that execute when triggered.
 * Steps can be MCP calls, events, conditions, or delays.
 */

import type { WorkflowDefinition } from "../workflow-engine";

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  // ── 1. Shipment Delay Alert ──
  {
    id: "wf-delay-alert",
    name: "Delay Alert & Reroute",
    triggerEvent: "shipment.delayed",
    maxRetries: 2,
    timeoutSeconds: 120,
    enabled: true,
    steps: [
      {
        name: "fetch_details",
        type: "mcp",
        mcpIntegration: "shiprocket",
        mcpAction: "track_shipment",
        input: { awb: "${event.trackingNumber}" },
      },
      {
        name: "check_weather",
        type: "mcp",
        mcpIntegration: "weather",
        mcpAction: "route_weather",
        input: { origin: "${step_fetch_details?.origin || 'Mumbai'}", destination: "${step_fetch_details?.destination || 'Delhi'}" },
        retryable: true,
      },
      {
        name: "find_reroute",
        type: "mcp",
        mcpIntegration: "mapmyindia",
        mcpAction: "optimize_route",
        input: { origin: "${step_fetch_details?.origin || 'Mumbai'}", destination: "${step_fetch_details?.destination || 'Delhi'}" },
        condition: "${step_check_weather?.overallRisk === 'high' || step_check_weather?.overallRisk === 'medium'}",
        retryable: true,
      },
      {
        name: "notify_ops",
        type: "event",
        input: {
          eventType: "system.health_check",
          message: "Delay detected for ${event.trackingNumber}. Weather risk: ${step_check_weather?.overallRisk}. Reroute suggested: ${step_find_reroute?.recommendedRoute || 'none'}.",
        },
      },
    ],
  },

  // ── 2. Auto-Reorder ──
  {
    id: "wf-auto-reorder",
    name: "Auto Reorder Suggestions",
    triggerEvent: "stock.below_reorder",
    maxRetries: 2,
    timeoutSeconds: 60,
    enabled: true,
    steps: [
      {
        name: "check_stock",
        type: "mcp",
        mcpIntegration: "tally_prime",
        mcpAction: "check_stock",
        input: { sku: "${event.sku}" },
      },
      {
        name: "calculate_qty",
        type: "db",
        input: {
          formula: "reorderPoint - currentStock + safetyStock",
          reorderPoint: "${event.reorderPoint}",
          currentStock: "${event.quantity}",
        },
      },
      {
        name: "suggest_reorder",
        type: "event",
        input: {
          eventType: "system.health_check",
          message: "Reorder suggested for ${event.sku}: ${event.name}. Current stock: ${event.quantity}. Suggested order quantity: ${(event.reorderPoint || 10) * 2 - (event.quantity || 0)}.",
        },
      },
    ],
  },

  // ── 3. New Order Processing ──
  {
    id: "wf-new-order",
    name: "New Order → Shipment",
    triggerEvent: "order.new",
    maxRetries: 3,
    timeoutSeconds: 180,
    enabled: true,
    steps: [
      {
        name: "create_shipment",
        type: "mcp",
        mcpIntegration: "shiprocket",
        mcpAction: "create_shipment",
        input: {
          orderId: "${event.orderId}",
          customerName: "${event.customerName}",
          destination: "${event.destination}",
        },
        retryable: true,
      },
      {
        name: "generate_ewb",
        type: "mcp",
        mcpIntegration: "gstn_eway_bill",
        mcpAction: "generate_ewb",
        input: {
          shipmentId: "${step_create_shipment?.shipmentId || ''}",
          fromGstin: "${event.fromGstin || ''}",
          toGstin: "${event.toGstin || ''}",
        },
        condition: "${step_create_shipment?.success === true}",
        retryable: true,
      },
      {
        name: "notify_customer",
        type: "mcp",
        mcpIntegration: "email",
        mcpAction: "send_tracking_update",
        input: {
          trackingNumber: "${step_create_shipment?.trackingNumber || ''}",
          customerName: "${event.customerName}",
          message: "Your order has been shipped! Tracking: ${step_create_shipment?.trackingNumber || 'N/A'}",
        },
      },
    ],
  },

  // ── 4. Compliance Check ──
  {
    id: "wf-compliance-check",
    name: "Fleet Compliance Check",
    triggerEvent: "compliance.license_expiring",
    maxRetries: 1,
    timeoutSeconds: 60,
    enabled: true,
    steps: [
      {
        name: "check_challans",
        type: "mcp",
        mcpIntegration: "compliance",
        mcpAction: "check_challan",
        input: { vehicle_reg: "${event.plateNumber || ''}" },
        retryable: true,
      },
      {
        name: "alert_manager",
        type: "event",
        input: {
          eventType: "system.health_check",
          message: "Compliance alert: ${event.name || event.plateNumber}. ${event.daysUntilExpiry || 'N/A'} days until expiry. Pending challans: ${step_check_challans?.pendingChallans || 0}.",
        },
      },
    ],
  },

  // ── 5. Fleet Maintenance Alert ──
  {
    id: "wf-fleet-maintenance",
    name: "Fleet Maintenance Alert",
    triggerEvent: "fleet.maintenance_due",
    maxRetries: 1,
    timeoutSeconds: 60,
    enabled: true,
    steps: [
      {
        name: "check_fleet_status",
        type: "mcp",
        mcpIntegration: "loconav",
        mcpAction: "track_vehicle",
        input: { vehicleId: "${event.vehicleId || ''}" },
        retryable: true,
      },
      {
        name: "schedule_maintenance",
        type: "mcp",
        mcpIntegration: "loconav",
        mcpAction: "schedule_maintenance",
        input: {
          vehicleId: "${event.vehicleId}",
          plateNumber: "${event.plateNumber}",
          type: "preventive",
          kmOverdue: "${event.kmOverdue}",
        },
      },
      {
        name: "notify_fleet_manager",
        type: "event",
        input: {
          eventType: "system.health_check",
          message: "Maintenance scheduled for ${event.plateNumber}. ${event.kmOverdue} km overdue. Current location: ${step_check_fleet_status?.location || 'unknown'}.",
        },
      },
    ],
  },
];

/**
 * Get workflow definition by trigger event.
 */
export function getWorkflowForEvent(eventType: string): WorkflowDefinition | undefined {
  return WORKFLOW_DEFINITIONS.find((wf) => wf.triggerEvent === eventType && wf.enabled);
}

/**
 * Get all workflow definitions.
 */
export function getAllWorkflows(): WorkflowDefinition[] {
  return WORKFLOW_DEFINITIONS;
}
