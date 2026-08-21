"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Users, Loader2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ orgName: string; role: string; valid: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("No invite link provided");
      return;
    }

    fetch(`/api/org/invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setInviteInfo({ orgName: data.org.name, role: data.role, valid: true });
        } else {
          setError(data.error || "Invalid invite link");
        }
      })
      .catch(() => setError("Failed to validate invite link"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/org/invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setJoined(true);
        toast.success("Welcome to the team!");
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setError(data.error || "Failed to join");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setJoining(false);
  };

  return (
    <div className="flex min-h-screen bg-white items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[#1a1a2e]">
            <div className="h-4 w-4 rounded-sm bg-white" style={{ transform: "rotate(45deg)" }} />
          </div>
          <span className="text-xl font-semibold text-[#1a1a2e]">Lanework</span>
        </Link>

        {loading && (
          <div className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-sm text-gray-500">Validating invite...</p>
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-red-50 mx-auto">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Invite problem</h2>
            <p className="text-sm text-gray-500">{error}</p>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1a1a2e] text-sm font-medium text-white hover:bg-[#1a1a2e]/90 transition">
              Go to login <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {joined && (
          <div className="space-y-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Welcome aboard! 🎉</h2>
            <p className="text-sm text-gray-500">Redirecting you to your dashboard...</p>
          </div>
        )}

        {inviteInfo && !joined && (
          <div className="space-y-6">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#1a1a2e]/5 mx-auto">
              <Users className="h-8 w-8 text-[#1a1a2e]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">You&apos;re invited!</h2>
              <p className="mt-2 text-sm text-gray-500">
                Join <span className="font-semibold text-gray-700">{inviteInfo.orgName}</span> on Lanework as a{" "}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {inviteInfo.role.replace("_", " ")}
                </span>
              </p>
            </div>

            <button onClick={handleAccept} disabled={joining}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Accept & join team</span> <ArrowRight className="h-4 w-4" /></>}
            </button>

            <p className="text-xs text-gray-400">
              You&apos;ll need to <Link href="/register" className="underline hover:text-gray-600">create an account</Link> or{" "}
              <Link href="/login" className="underline hover:text-gray-600">sign in</Link> first if you haven&apos;t already.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
