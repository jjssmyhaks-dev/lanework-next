"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  color?: "blue" | "emerald" | "amber" | "red" | "purple" | "slate";
  trend?: { value: number; direction: "up" | "down" | "flat" };
  href?: string;
  onClick?: () => void;
  className?: string;
  suffix?: string;
};

const colorMap = {
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    value: "text-gray-900",
    trendUp: "text-emerald-600 bg-emerald-50",
    trendDown: "text-red-600 bg-red-50",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    value: "text-gray-900",
    trendUp: "text-emerald-600 bg-emerald-50",
    trendDown: "text-red-600 bg-red-50",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    value: "text-gray-900",
    trendUp: "text-emerald-600 bg-emerald-50",
    trendDown: "text-red-600 bg-red-50",
  },
  red: {
    iconBg: "bg-red-50",
    iconText: "text-red-600",
    value: "text-red-600",
    trendUp: "text-red-600 bg-red-50",
    trendDown: "text-emerald-600 bg-emerald-50",
  },
  purple: {
    iconBg: "bg-purple-50",
    iconText: "text-purple-600",
    value: "text-gray-900",
    trendUp: "text-emerald-600 bg-emerald-50",
    trendDown: "text-red-600 bg-red-50",
  },
  slate: {
    iconBg: "bg-gray-50",
    iconText: "text-gray-500",
    value: "text-gray-900",
    trendUp: "text-emerald-600 bg-emerald-50",
    trendDown: "text-red-600 bg-red-50",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "blue",
  trend,
  href,
  onClick,
  className,
  suffix = "",
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <Card
      className={cn(
        "border border-gray-200 hover:shadow-md transition-all duration-200 group",
        href && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
            <div className="flex items-baseline gap-1.5">
              <AnimatedCounter
                value={value}
                className={cn("text-3xl font-semibold tracking-tight", colors.value)}
              />
              {suffix && (
                <span className="text-sm text-gray-400 font-medium">{suffix}</span>
              )}
            </div>
            {trend && (
              <div className={cn("inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
                trend.direction === "up" ? colors.trendUp : trend.direction === "down" ? colors.trendDown : "text-gray-500 bg-gray-50"
              )}>
                {trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
                {trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
                {trend.direction === "flat" && <Minus className="h-3 w-3" />}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          <div className={cn(
            "grid h-10 w-10 place-items-center rounded-xl transition-all duration-200",
            colors.iconBg,
            "group-hover:scale-110"
          )}>
            <Icon className={cn("h-5 w-5", colors.iconText)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
