"use client";

import { useState, useEffect } from "react";
import {
  Users, UserPlus, Mail, Shield, Trash2, ChevronDown, Copy, Check, Loader2, Crown, Eye, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { ROLES, type OrgRole } from "@/lib/permissions";

type Member = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: OrgRole;
  joined_at: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
};

const ROLE_ICONS: Record<string, any> = { super_admin: Crown, admin: Shield, member: Users, viewer: Eye };

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<OrgRole | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Editing
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<OrgRole>("member");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch("/api/org/members"),
        fetch("/api/org/invite"),
      ]);
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
        setCurrentRole(data.currentRole);
      }
      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvites(data.invites || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteLink(data.invite.url);
        setInviteEmail("");
        toast("Invite sent!");
        fetchData();
      }
    } catch { /* silent */ }
    setSending(false);
  };

  const handleRoleChange = async (userId: string) => {
    try {
      await fetch(`/api/org/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      setEditingMember(null);
      fetchData();
    } catch { /* silent */ }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await fetch(`/api/org/members/${userId}`, { method: "DELETE" });
      fetchData();
    } catch { /* silent */ }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canManage = currentRole === "super_admin" || currentRole === "admin";
  const canChangeRoles = currentRole === "super_admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 px-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your organisation&apos;s members, roles, and invitations.</p>
      </div>

      {/* Invite Form */}
      {canManage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-gray-500" /> Invite team member
          </h2>

          {inviteLink ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <p className="text-sm text-emerald-700 font-medium">✅ Invite link generated!</p>
              <div className="flex items-center gap-2">
                <input readOnly value={inviteLink}
                  className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-gray-700 font-mono" />
                <button onClick={copyLink}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition flex items-center gap-1">
                  {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                </button>
              </div>
              <button onClick={() => setInviteLink(null)} className="text-xs text-gray-500 hover:text-gray-700">
                Send another invite
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]"
                required />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as OrgRole)}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#1a1a2e] focus:outline-none">
                {ROLES.filter(r => r.id !== "super_admin" || canChangeRoles).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button type="submit" disabled={sending || !inviteEmail.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a1a2e] text-white text-sm font-medium hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send invite
              </button>
            </form>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            Members ({members.length})
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No team members yet. Invite someone to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map(member => {
              const RoleIcon = ROLE_ICONS[member.role] || Users;
              const roleMeta = ROLES.find(r => r.id === member.role);
              const isEditing = editingMember === member.user_id;
              const isSelf = member.user_id === user?.id;

              return (
                <div key={member.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-sm font-medium shrink-0">
                    {member.user_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.user_name || "Unknown"} {isSelf && <span className="text-xs text-gray-400 font-normal">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{member.user_email}</p>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select value={newRole} onChange={e => setNewRole(e.target.value as OrgRole)}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-[#1a1a2e] focus:outline-none">
                        {ROLES.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button onClick={() => handleRoleChange(member.user_id)}
                        className="px-3 py-1.5 text-xs font-medium bg-[#1a1a2e] text-white rounded-lg hover:bg-[#1a1a2e]/90">
                        Save
                      </button>
                      <button onClick={() => setEditingMember(null)} className="text-xs text-gray-500 hover:text-gray-700">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", roleMeta?.color)}>
                        <RoleIcon className="h-3 w-3" /> {roleMeta?.name || member.role}
                      </span>

                      {canManage && !isSelf && (
                        <div className="flex items-center gap-1">
                          {canChangeRoles && (
                            <button onClick={() => { setEditingMember(member.user_id); setNewRole(member.role); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                              title="Change role">
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleRemove(member.user_id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Remove member">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              Pending Invites ({invites.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {invites.map(invite => (
              <div key={invite.id} className="px-6 py-3 flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{invite.email}</p>
                  <p className="text-xs text-gray-400">Invited as {invite.role.replace("_", " ")}</p>
                </div>
                <span className="text-xs text-gray-400">Expires {new Date(invite.expires_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Reference */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Role Reference</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {ROLES.map(r => (
            <div key={r.id} className="p-3 rounded-xl bg-gray-50">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", r.color)}>
                  {r.name}
                </span>
              </div>
              <p className="text-xs text-gray-500">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function toast(message: string) {
  // Simple inline toast — the app uses sonner
  try {
    const { toast: sonnerToast } = require("sonner");
    sonnerToast.success(message);
  } catch { /* fallback */ }
}
