"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Phone, Mail, AlertCircle } from "lucide-react";

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
      const res = await fetch("/api/customer");
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
      else if (data.error) setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConversations(); }, []);

  const openCount = conversations.filter(c => c.status === "open").length;
  const escalatedCount = conversations.filter(c => c.status === "escalated").length;
  const negativeCount = conversations.filter(c => c.sentiment === "negative").length;

  const channelIcons: Record<string, React.ReactNode> = {
    chat: <MessageSquare className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
    voice: <Phone className="h-4 w-4" />,
  };
  const sentimentColors: Record<string, string> = {
    positive: "bg-emerald-100 text-emerald-700",
    neutral: "bg-blue-100 text-blue-700",
    negative: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Communications</h1>
        <p className="text-gray-500 mt-1">Automated responses, sentiment tracking, and escalation management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{conversations.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Open</p><p className="text-2xl font-bold text-blue-600">{openCount}</p></CardContent></Card>
        <Card className={escalatedCount > 0 ? "border-red-300" : ""}><CardContent className="p-4"><p className="text-sm text-gray-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Escalated</p><p className={`text-2xl font-bold ${escalatedCount > 0 ? "text-red-600" : ""}`}>{escalatedCount}</p></CardContent></Card>
        <Card className={negativeCount > 0 ? "border-red-300" : ""}><CardContent className="p-4"><p className="text-sm text-gray-500">Negative Sent.</p><p className={`text-2xl font-bold ${negativeCount > 0 ? "text-red-600" : ""}`}>{negativeCount}</p></CardContent></Card>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No conversations yet. Customer interactions will appear here as they come in.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sentiment</th>
                <th className="px-4 py-3 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map(conv => (
                <tr key={conv.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{conv.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      {channelIcons[conv.channel] || <MessageSquare className="h-4 w-4" />}
                      {conv.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${conv.status === "open" ? "bg-blue-100 text-blue-700" : conv.status === "escalated" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{conv.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {conv.sentiment ? (
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${sentimentColors[conv.sentiment] || ""}`}>{conv.sentiment}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {conv.last_message_at ? new Date(conv.last_message_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
