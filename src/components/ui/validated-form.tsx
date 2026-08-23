"use client";

import { useForm, UseFormReturn, FieldValues, DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

// ── Common Schemas ──

export const shipmentSchema = z.object({
  tracking_number: z.string().min(1, "Tracking number is required"),
  carrier: z.string().min(1, "Carrier is required"),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),
  estimated_delivery: z.string().optional(),
});

export const inventorySchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Product name is required"),
  quantity: z.number().min(0, "Quantity must be positive"),
  reorder_point: z.number().min(0).optional(),
  warehouse: z.string().optional(),
  location: z.string().optional(),
});

export const driverSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  license: z.string().optional(),
  maxHours: z.number().min(1).max(12).optional(),
});

export const vehicleSchema = z.object({
  plate: z.string().min(1, "License plate is required"),
  type: z.string().min(1, "Vehicle type is required"),
  mileageKm: z.number().min(0).optional(),
});

export const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "viewer"]),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  orgName: z.string().optional(),
  companySize: z.string().optional(),
});

// ── Types ──

export type ShipmentFormData = z.infer<typeof shipmentSchema>;
export type InventoryFormData = z.infer<typeof inventorySchema>;
export type DriverFormData = z.infer<typeof driverSchema>;
export type VehicleFormData = z.infer<typeof vehicleSchema>;
export type InviteFormData = z.infer<typeof inviteSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

// ── Form Field Component ──

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500" role="alert">{error}</p>
      )}
    </div>
  );
}

// ── Validated Input ──

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function ValidatedInput({ label, error, required, className, ...props }: ValidatedInputProps) {
  return (
    <FormField label={label} error={error} required={required}>
      <input
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-sm transition-colors",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-gray-300 focus:border-[#1a1a2e] focus:ring-[#1a1a2e]/20",
          "focus:outline-none focus:ring-2",
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
    </FormField>
  );
}

// ── Validated Select ──

interface ValidatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function ValidatedSelect({ label, error, required, options, className, ...props }: ValidatedSelectProps) {
  return (
    <FormField label={label} error={error} required={required}>
      <select
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-sm transition-colors bg-white",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-gray-300 focus:border-[#1a1a2e] focus:ring-[#1a1a2e]/20",
          "focus:outline-none focus:ring-2",
          className
        )}
        aria-invalid={!!error}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FormField>
  );
}

// ── Hook wrapper for react-hook-form ──

export function useValidatedForm<T extends FieldValues = FieldValues>(
  schema: z.ZodType<T>,
  defaults?: DefaultValues<T>
): UseFormReturn<T> {
  return useForm<T>({
    resolver: zodResolver(schema as any),
    defaultValues: defaults,
    mode: "onBlur",
  });
}
