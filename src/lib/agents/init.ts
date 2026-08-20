/**
 * Agent System Initialization — registers all pollers, event handlers,
 * and starts the scheduler. Called once at app startup.
 */

import { registerPoller, startScheduler } from "./scheduler";
import { registerEventHandlers } from "./event-actions";
import { pollShipments } from "./pollers/shipment-poller";
import { pollInventory } from "./pollers/inventory-poller";
import { pollFleet } from "./pollers/fleet-poller";
import { pollCompliance } from "./pollers/compliance-poller";
import { pollDailyReport } from "./pollers/daily-report";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "agent-init" });

let initialized = false;

export function initAgentSystem(): void {
  if (initialized) {
    log.warn("Agent system already initialized");
    return;
  }

  log.info("Initializing agent system...");

  // Register event handlers
  registerEventHandlers();

  // Register pollers with schedules
  registerPoller("shipment-poller", "*/5 * * * *", pollShipments);       // Every 5 min
  registerPoller("inventory-poller", "*/30 * * * *", pollInventory);     // Every 30 min
  registerPoller("fleet-poller", "*/10 * * * *", pollFleet);             // Every 10 min
  registerPoller("compliance-poller", "0 6 * * *", pollCompliance);      // Daily at 6 AM
  registerPoller("daily-report", "0 8 * * *", pollDailyReport);          // Daily at 8 AM

  // Start the scheduler
  startScheduler();

  initialized = true;
  log.info("Agent system initialized successfully");
}
