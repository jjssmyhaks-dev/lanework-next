"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { MessageSquare, Phone, Mail, AlertCircle, Users, ThumbsUp, ThumbsDown, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  customer_name: string;
  channel: string;
  status: string;
  sentiment: string | null;
  last_message_at: string;
}

export default function CustomerPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer?limit=100");
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data;
      if (Array.isArray(items)) setConversations(items);
      else if (data.error) setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConversations(); }, []);

  const openCount = conversations.filter(c => c.status === "open").length;
  const escalatedCount = conversations.filter(c => c.status === "escalated").length;
  const resolvedCount = conversations.filter(c => c.status === "resolved").length;
  const negativeCount = conversations.filter(c => c.sentiment === "negative").length;

  const channelConfig: Record<string, { icon: typeof MessageSquare; label: string; color: string; bg: string }> = {
    chat: { icon: MessageSquare, label: "Chat", color: "text-blue-600", bg: "bg-blue-50" },
    email: { icon: Mail, label: "Email", color: "text-purple-600", bg: "bg-purple-50" },
    voice: { icon: Phone, label: "Voice", color: "text-amber-600", bg: "bg-amber-50" },
  };

  const sentimentConfig: Record<string, { icon: typeof ThumbsUp; label: string; color: string; bg: string }> = {
    positive: { icon: ThumbsUp, label: "Positive", color: "text-emerald-700", bg: "bg-emerald-100" },
    neutral: { icon: null as any, label: "Neutral", color: "text-gray-600", bg: "bg-gray-100" },
    negative: { icon: ThumbsDown, label: "Negative", color: "text-red-700", bg: "bg-red-100" },
  };

  const statusConfig: Record<string, { color: string; bg: string }> = {
    open: { color: "text-blue-700", bg: "bg-blue-100" },
    escalated: { color: "text-red-700", bg: "bg-red-100" },
    resolved: { color: "text-emerald-700", bg: "bg-emerald-100" },
  };

  const formatTime = (iso: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `${diffH}h ago`;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Communications"
        description="Automated responses, sentiment tracking, and escalation management."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Customers" }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Conversations" value={conversations.length} icon={Users} color="blue" />
        <StatCard label="Open" value={openCount} icon={MessageSquare} color="amber" />
        <StatCard label="Escalated" value={escalatedCount} icon={AlertCircle} color="red" />
        <StatCard label="Resolved" value={resolvedCount} icon={ThumbsUp} color="emerald" />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Conversations List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="No conversations yet"
          description="Customer interactions will appear here as they come in through chat, email, or voice channels."
        />
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => {
            const channel = channelConfig[conv.channel] || channelConfig.chat;
            const sentiment = conv.sentiment ? sentimentConfig[conv.sentiment] : null;
            const status = statusConfig[conv.status] || statusConfig.open;
            const ChannelIcon = channel.icon;

            return (
              <Card key={conv.id} className="border border-gray-200 hover:shadow-md transition-all duration-200 group cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 group-hover:scale-110 transition-transform">
                      <span className="text-sm font-semibold text-gray-600">
                        {conv.customer_name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{conv.customer_name}</span>
                        <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", status.bg, status.color)}>
                          {conv.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", channel.bg, channel.color)}>
                          <ChannelIcon className="h-3 w-3" />
                          {channel.label}
                        </span>
                        {sentiment && (
                          <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", sentiment.bg, sentiment.color)}>
                            {sentiment.icon && <sentiment.icon className="h-3 w-3" />}
                            {sentiment.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time + Arrow */}
                    <div className="hidden sm:flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {formatTime(conv.last_message_at)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
