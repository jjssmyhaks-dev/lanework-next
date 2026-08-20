/**
 * Risk Scoring — calculates a 0-10 risk score for agent actions.
 *
 * Factors:
 * - Financial impact (0-10): cost of the action being wrong
 * - Reversibility (0-10): how easy it is to undo (10 = fully reversible)
 * - Customer impact (0-10): effect on customer experience
 *
 * Final score = max(financial, 10-reversibility, customer)
 * Actions with score > threshold require human approval.
 */

export interface RiskFactors {
  financialImpact: number; // 0-10
  reversibility: number;   // 0-10 (10 = fully reversible)
  customerImpact: number;  // 0-10
}

export interface RiskAssessment {
  score: number;           // 0-10
  factors: RiskFactors;
  requiresApproval: boolean;
  reason: string;
}

// ── Action Risk Profiles ──

const ACTION_RISK_PROFILES: Record<string, RiskFactors> = {
  // Shipment actions
  track_shipment:        { financialImpact: 0, reversibility: 10, customerImpact: 0 },
  create_shipment:       { financialImpact: 3, reversibility: 7, customerImpact: 2 },
  cancel_shipment:       { financialImpact: 6, reversibility: 3, customerImpact: 8 },
  compare_rates:         { financialImpact: 0, reversibility: 10, customerImpact: 0 },
  generate_label:        { financialImpact: 1, reversibility: 10, customerImpact: 1 },

  // Inventory actions
  sync_inventory:        { financialImpact: 0, reversibility: 10, customerImpact: 0 },
  check_stock:           { financialImpact: 0, reversibility: 10, customerImpact: 0 },
  reorder_stock:         { financialImpact: 7, reversibility: 5, customerImpact: 3 },

  // Route actions
  optimize_route:        { financialImpact: 2, reversibility: 9, customerImpact: 2 },
  reroute_shipment:      { financialImpact: 4, reversibility: 6, customerImpact: 5 },

  // E-way bill
  generate_ewb:          { financialImpact: 2, reversibility: 4, customerImpact: 1 },
  cancel_ewb:            { financialImpact: 3, reversibility: 2, customerImpact: 2 },

  // Fleet
  track_fleet:           { financialImpact: 0, reversibility: 10, customerImpact: 0 },
  schedule_maintenance:  { financialImpact: 4, reversibility: 8, customerImpact: 2 },

  // Notifications
  send_notification:     { financialImpact: 0, reversibility: 10, customerImpact: 3 },
  send_whatsapp:         { financialImpact: 0, reversibility: 10, customerImpact: 4 },

  // Compliance
  check_license:         { financialImpact: 0, reversibility: 10, customerImpact: 0 },
  check_registration:    { financialImpact: 0, reversibility: 10, customerImpact: 0 },

  // ERP
  sync_orders:           { financialImpact: 3, reversibility: 7, customerImpact: 1 },
  push_to_erp:           { financialImpact: 6, reversibility: 4, customerImpact: 2 },

  // Weather
  current_weather:       { financialImpact: 0, reversibility: 10, customerImpact: 0 },
  weather_alerts:        { financialImpact: 0, reversibility: 10, customerImpact: 0 },

  // Default
  default:               { financialImpact: 3, reversibility: 7, customerImpact: 3 },
};

/**
 * Calculate risk score for an action.
 */
export function calculateRisk(
  actionType: string,
  context?: Record<string, unknown>
): RiskAssessment {
  const base = ACTION_RISK_PROFILES[actionType] || ACTION_RISK_PROFILES.default;
  const factors = { ...base };

  // Adjust based on context
  if (context) {
    // High-value shipments are riskier to cancel
    if (actionType === "cancel_shipment" && typeof context.invoiceValue === "number") {
      const val = context.invoiceValue;
      if (val > 50000) factors.financialImpact = Math.min(10, factors.financialImpact + 3);
      else if (val > 10000) factors.financialImpact = Math.min(10, factors.financialImpact + 1);
    }

    // Bulk operations are riskier
    if (typeof context.itemCount === "number" && context.itemCount > 10) {
      factors.financialImpact = Math.min(10, factors.financialImpact + 2);
    }

    // Customer-facing actions have higher impact
    if (context.notifyCustomer === true) {
      factors.customerImpact = Math.min(10, factors.customerImpact + 2);
    }
  }

  // Final score: max of all factors (conservative approach)
  const score = Math.max(factors.financialImpact, 10 - factors.reversibility, factors.customerImpact);

  let reason = "";
  if (score >= 7) reason = "High-risk action — financial or customer impact is significant";
  else if (score >= 4) reason = "Medium-risk action — moderate impact if incorrect";
  else reason = "Low-risk action — minimal impact, safe to auto-execute";

  return {
    score,
    factors,
    requiresApproval: score > 3,
    reason,
  };
}

/**
 * Get the risk profile for an action type.
 */
export function getRiskProfile(actionType: string): RiskFactors {
  return ACTION_RISK_PROFILES[actionType] || ACTION_RISK_PROFILES.default;
}
