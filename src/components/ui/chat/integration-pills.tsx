"use client";

import { useState, useEffect } from "react";
import {
  Rocket, MessageCircle, Calculator, FileCheck, CreditCard,
  FileSpreadsheet, Download, Webhook, MapPin, ShoppingCart,
  ShoppingBag, Package, Truck, Navigation, Activity, Building,
  ChevronLeft, ChevronRight, CheckCircle2, Loader2, Wifi, WifiOff,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INTEGRATION_SETUP, IntegrationSetup } from "@/lib/integration-setup";

const ICON_MAP: Record<string, React.ReactNode> = {
  rocket: <Rocket className="h-4 w-4" />,
  "message-circle": <MessageCircle className="h-4 w-4" />,
  calculator: <Calculator className="h-4 w-4" />,
  "file-check": <FileCheck className="h-4 w-4" />,
  "credit-card": <CreditCard className="h-4 w-4" />,
  "file-spreadsheet": <FileSpreadsheet className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  "map-pin": <MapPin className="h-4 w-4" />,
  "shopping-cart": <ShoppingCart className="h-4 w-4" />,
  "shopping-bag": <ShoppingBag className="h-4 w-4" />,
  package: <Package className="h-4 w-4" />,
  truck: <Truck className="h-4 w-4" />,
  navigation: <Navigation className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  building: <Building className="h-4 w-4" />,
  sheet: <FileSpreadsheet className="h-4 w-4" />,
};

type IntegrationStatus = "connected" | "disconnected" | "checking";

interface Props {
  onSelect: (integration: IntegrationSetup) => void;
  onConnect: (integration: IntegrationSetup) => void;
}

export default function IntegrationPills({ onSelect, onConnect }: Props) {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [scrollPos, setScrollPos] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = useState<HTMLDivElement | null>(null);

  const integrations = Object.values(INTEGRATION_SETUP);

  // Check connection statuses on mount
  useEffect(() => {
    const checkStatuses = async () => {
      const results: Record<string, IntegrationStatus> = {};
      const checks = integrations.map(async (integration) => {
        try {
          const res = await fetch(`/api/integrations/${integration.id}/connect`);
          if (!res.ok) {
            results[integration.id] = "disconnected";
            return;
          }
          const data = await res.json();
          if (data.integration?.connected || data.integration?.status === "connected") {
            results[integration.id] = "connected";
          } else {
            results[integration.id] = "disconnected";
          }
        } catch {
          results[integration.id] = "disconnected";
        }
      });
      await Promise.all(checks);
      setStatuses(results);
    };
    checkStatuses();
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    const container = scrollRef[0];
    if (!container) return;
    const scrollAmount = 200;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const updateScrollState = (el: HTMLDivElement) => {
    setScrollPos(el.scrollLeft);
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  return (
    <div className="relative flex items-center">
      {canScrollLeft && (
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-0 z-10 grid h-8 w-8 place-items-center rounded-full bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-900 flex-shrink-0"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      <div
        ref={(el) => { scrollRef[1](el); }}
        onScroll={(e) => updateScrollState(e.currentTarget)}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none px-1 py-1 flex-1"
      >
        {integrations.map((integration) => {
          const status = statuses[integration.id] || "disconnected";
          const isConnected = status === "connected";

          return (
            <button
              key={integration.id}
              onClick={() => {
                if (isConnected) {
                  onSelect(integration);
                } else {
                  onConnect(integration);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                "border transition-all duration-150 flex-shrink-0",
                "focus:outline-none focus:ring-2 focus:ring-gray-200",
                isConnected
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
              )}
              title={`${integration.name} — ${isConnected ? "Connected" : "Disconnected"}`}
            >
              <span className={cn(isConnected ? "text-emerald-600" : "text-gray-400")}>
                {ICON_MAP[integration.icon] || <Plug className="h-4 w-4" />}
              </span>
              <span className="max-w-[100px] truncate">{integration.name}</span>
              <span className={cn(
                "h-2 w-2 rounded-full flex-shrink-0",
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
              )} />
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-0 z-10 grid h-8 w-8 place-items-center rounded-full bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-900 flex-shrink-0"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}


