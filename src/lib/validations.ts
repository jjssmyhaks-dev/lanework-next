import { z } from "zod";

// ── Shipment ──
export const createShipmentSchema = z.object({
  trackingNumber: z.string().min(1).optional(),
  tracking_number: z.string().min(1).optional(),
  carrier: z.string().min(1, "carrier is required"),
  origin: z.string().min(1, "origin is required"),
  destination: z.string().min(1, "destination is required"),
  eta: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  estimated_delivery: z.string().optional(),
  status: z.enum(["pending", "in_transit", "delivered", "delayed", "out_for_delivery", "rto"]).optional(),
  customerName: z.string().optional(),
  customer_name: z.string().optional(),
  customerPhone: z.string().optional(),
  customer_phone: z.string().optional(),
}).refine(
  (data) => data.trackingNumber || data.tracking_number,
  { message: "tracking_number is required" }
);

export const updateShipmentSchema = createShipmentSchema.partial();

// ── Customer ──
export const createCustomerSchema = z.object({
  name: z.string().min(1, "name is required").optional(),
  customerName: z.string().min(1, "customerName is required").optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
}).refine(
  (data) => data.name || data.customerName,
  { message: "name is required" }
);

export const updateCustomerSchema = createCustomerSchema.partial();

// ── Inventory ──
export const createInventorySchema = z.object({
  sku: z.string().min(1, "sku is required"),
  name: z.string().min(1, "name is required"),
  quantity: z.number().int().min(0, "quantity must be non-negative"),
  reorderPoint: z.number().int().min(0).optional(),
  warehouse: z.string().optional(),
  location: z.string().optional(),
});

export const updateInventorySchema = createInventorySchema.partial();

// ── Warehouse ──
export const createWarehouseSchema = z.object({
  type: z.string().min(1, "type is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.string().optional(),
  dock: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  status: z.string().optional(),
});

// ── Routes ──
export const createRouteSchema = z.object({
  name: z.string().min(1, "name is required"),
  origin: z.string().optional(),
  destination: z.string().optional(),
  stops: z.number().int().min(0).optional(),
  distanceKm: z.number().min(0).optional(),
  distance_km: z.number().min(0).optional(),
  estimatedMinutes: z.number().min(0).optional(),
  estimated_minutes: z.number().min(0).optional(),
  total_stops: z.number().int().min(0).optional(),
  status: z.enum(["active", "inactive", "completed"]).optional(),
});

export const updateRouteSchema = createRouteSchema.partial();

// ── Fleet Vehicle ──
export const createVehicleSchema = z.object({
  plate: z.string().min(1, "plate is required"),
  type: z.string().min(1, "type is required"),
  status: z.enum(["active", "inactive", "maintenance"]).optional(),
  mileageKm: z.number().min(0).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

// ── Fleet Driver ──
export const createDriverSchema = z.object({
  name: z.string().min(1, "name is required"),
  license: z.string().min(1, "license is required"),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  hoursDriven: z.number().min(0).optional(),
  maxHours: z.number().min(0).optional(),
  assignedVehicle: z.string().optional(),
});

export const updateDriverSchema = createDriverSchema.partial();

// ── CSV Import ──
export const csvImportSchema = z.object({
  entity_type: z.enum(["shipment", "inventory", "order"]),
  rows: z.array(z.record(z.unknown())).min(1, "at least one row required"),
});

// ── Integration Action ──
export const integrationActionSchema = z.object({
  action: z.string().min(1, "action is required"),
});

// ── Search ──
export const searchSchema = z.object({
  query: z.string().min(1, "query is required").max(200),
  types: z.array(z.enum(["shipments", "inventory", "customers"])).optional(),
});

/**
 * Validate request body against a Zod schema.
 * Returns { success: true, data } or { success: false, error: Response }.
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: Response }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return {
        success: false,
        error: new Response(
          JSON.stringify({
            error: "Validation failed",
            message: firstError.message,
            path: firstError.path.join("."),
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        ),
      };
    }
    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
}
