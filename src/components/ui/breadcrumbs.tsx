"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-xs text-gray-400 mb-4", className)}>
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-gray-700 transition-colors" aria-label="Dashboard">
        <Home className="h-3 w-3" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-gray-300" />
          {item.href ? (
            <Link href={item.href} className="hover:text-gray-700 transition-colors">{item.label}</Link>
          ) : (
            <span className="text-gray-700 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
