/**
 * MobileNav — Bottom navigation bar for mobile devices.
 *
 * Shows on screens < 768px (md breakpoint).
 * Fixed to bottom, glass-morphism style, 5 primary navigation items.
 * Hidden on desktop (the sidebar handles navigation there).
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  LayoutDashboard,
  Package,
  Truck,
  Bot,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/shipment", label: "Shipments", icon: Package },
  { href: "/fleet", label: "Fleet", icon: Truck },
  { href: "/agents", label: "Agents", icon: Bot },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-gray-200/80 bg-white/90 backdrop-blur-xl safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive
                  ? "text-[#1a1a2e] bg-gray-100/80"
                  : "text-gray-400 hover:text-gray-700"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  isActive && "font-bold"
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#1a1a2e] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
