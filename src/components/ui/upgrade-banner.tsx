"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Zap, X, RefreshCw,
  MessageSquare, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LimitInfo {
  current: number;
  max: number;
  percent: number;
  label: string;
}

interface UpgradeBannerProps {
  /** The limit that was hit — shows the progress bar */
  limitType: "chat_messages" | "shipments" | "feature" | "usage";
  /** Message to display */
  message: string;
  /** Current usage count */
  currentUsage: number;
  /** Max allowed */
  limit: number;
  /** Plan name the user is on */
  currentPlan: string;
  /** Plan to upgrade to */
  upgradeName?: string;
  /** Monthly price of upgrade plan */
  upgradePrice?: number;
  /** URL to upgrade page */
  upgradeUrl?: string;
  /** Feature key for icon selection */
  feature?: string;
  /** Whether this is a hard block (no dismiss) or soft warning */
  blocked?: boolean;
  /** Callback to dismiss (only for soft warnings) */
  onDismiss?: () => void;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Callback for retry action */
  onRetry?: () => void;
}

function getIcon(feature?: string) {
  switch (feature) {
    case "chatMessagesPerDay":
    case "chat_messages":
      return MessageSquare;
    case "shipmentsPerMonth":
    case "shipments":
      return Truck;
    default:
      return Zap;
  }
}

function ProgressBar({ percent, blocked }: { percent: number; blocked: boolean }) {
  return (
    <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          blocked ? "bg-red-400" : percent > 80 ? "bg-amber-400" : "bg-emerald-400"
        )}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

/** Full banner — shown as a card at the top of a page */
export function UpgradeBanner({
  limitType,
  message,
  currentUsage,
  limit,
  currentPlan,
  upgradeName,
  upgradePrice,
  upgradeUrl = "/pricing",
  feature,
  blocked = false,
  onDismiss,
  compact = false,
  onRetry,
}: UpgradeBannerProps) {
  const Icon = getIcon(feature);
  const percent = limit > 0 ? Math.min(100, Math.round((currentUsage / limit) * 100)) : 0;
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm",
          blocked
            ? "bg-red-50 border border-red-200 text-red-800"
            : "bg-amber-50 border border-amber-200 text-amber-800"
        )}
      >
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1">{message}</span>
        {onRetry && (
          <button onClick={onRetry} className="flex items-center gap-1 text-xs font-medium hover:underline">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}
        <Link
          href={upgradeUrl}
          className="flex items-center gap-1 text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Upgrade <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-6",
        blocked
          ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-200"
          : "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200"
      )}
    >
      {onDismiss && (
        <button
          onClick={() => { onDismiss(); setVisible(false); }}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/50 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-xl",
            blocked ? "bg-red-100" : "bg-amber-100"
          )}
        >
          <Icon className={cn("h-6 w-6", blocked ? "text-red-600" : "text-amber-600")} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={cn("font-semibold text-sm", blocked ? "text-red-900" : "text-amber-900")}>
            {blocked ? "Limit Reached" : "Approaching Limit"}
          </h3>
          <p className={cn("mt-1 text-sm", blocked ? "text-red-700" : "text-amber-700")}>
            {message}
          </p>

          {limit > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={cn("font-medium", blocked ? "text-red-600" : "text-amber-600")}>
                  {currentUsage} / {limit === -1 ? "∞" : limit.toLocaleString("en-IN")}
                </span>
                <span className={cn("font-medium", blocked ? "text-red-600" : "text-amber-600")}>
                  {percent}%
                </span>
              </div>
              <ProgressBar percent={percent} blocked={blocked} />
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Link
              href={upgradeUrl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-all"
            >
              {upgradeName
                ? `Upgrade to ${upgradeName}${upgradePrice ? ` — ₹${upgradePrice.toLocaleString("en-IN")}/mo` : ""}`
                : "View Plans"}
              <ArrowRight className="h-4 w-4" />
            </Link>

            {blocked && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline usage progress — shown inside chat input area */
export function UsageProgressBar({
  current,
  max,
  label,
  plan,
}: {
  current: number;
  max: number;
  label: string;
  plan: string;
}) {
  if (max === -1) return null; // unlimited — don't show
  const percent = Math.min(100, Math.round((current / max) * 100));
  const isWarning = percent >= 80;
  const isBlocked = percent >= 100;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn(
        "font-medium",
        isBlocked ? "text-red-600" : isWarning ? "text-amber-600" : "text-gray-400"
      )}>
        {current}/{max} {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden max-w-[100px]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isBlocked ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-emerald-400"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {isWarning && !isBlocked && (
        <Link href="/pricing" className="text-emerald-600 hover:underline font-medium">
          Upgrade
        </Link>
      )}
      {isBlocked && (
        <Link href="/pricing" className="text-red-600 hover:underline font-semibold">
          Upgrade →
        </Link>
      )}
    </div>
  );
}

/** Hook to fetch usage stats from the API */
export function useUsageStats() {
  const [stats, setStats] = useState<{
    plan: string;
    limits: Record<string, LimitInfo>;
  } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch { /* silent */ }
  };

  useEffect(() => { fetchStats(); }, []);

  return { stats, refresh: fetchStats };
}
