"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Check, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-semibold text-[#1a1a2e]">Invalid reset link</h2>
          <p className="mt-2 text-sm text-[#1a1a2e]/60">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/forgot-password" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to reset password. The link may have expired.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="text-center max-w-sm">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 mx-auto mb-6">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-semibold text-[#1a1a2e]">Password reset!</h2>
          <p className="mt-2 text-sm text-[#1a1a2e]/60">
            Your password has been updated. You can now sign in.
          </p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1a1a2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-semibold text-[#1a1a2e]">Set new password</h2>
        <p className="mt-2 text-sm text-[#1a1a2e]/60">Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                autoFocus
                className="w-full rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-4 py-2.5 pr-10 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-[#1a1a2e] focus:ring-1 focus:ring-[#1a1a2e]"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a1a2e]/30 hover:text-[#1a1a2e]/60">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-4 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-[#1a1a2e] focus:ring-1 focus:ring-[#1a1a2e]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Reset password <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
