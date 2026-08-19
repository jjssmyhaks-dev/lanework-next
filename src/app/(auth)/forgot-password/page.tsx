"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Check, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a1a2e] text-white flex-col justify-between p-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-white">
            <div className="h-4 w-4 rounded-sm bg-[#1a1a2e]" style={{ transform: "rotate(45deg)" }} />
          </div>
          <span className="text-xl font-semibold">Lanework</span>
        </Link>
        <div>
          <h1 className="text-5xl leading-[1.08] font-medium tracking-tight">
            Don&rsquo;t worry,<br />
            <span className="italic text-white/50">it happens.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-white/60">
            We&rsquo;ll send you a link to reset your password. Check your inbox in a minute.
          </p>
        </div>
        <p className="text-sm text-white/40">&copy; {new Date().getFullYear()} Lanework. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-[#1a1a2e]">
                <div className="h-4 w-4 rounded-sm bg-white" style={{ transform: "rotate(45deg)" }} />
              </div>
              <span className="text-xl font-semibold text-[#1a1a2e]">Lanework</span>
            </Link>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 mx-auto mb-6">
                <Mail className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-semibold text-[#1a1a2e]">Check your email</h2>
              <p className="mt-3 text-sm text-[#1a1a2e]/60">
                We sent a password reset link to <strong>{email}</strong>.
                The link expires in 1 hour.
              </p>
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="w-full rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 transition-colors"
                >
                  Send another email
                </button>
                <Link
                  href="/login"
                  className="block w-full rounded-xl border border-[#e5e7eb] px-4 py-2.5 text-sm font-medium text-[#1a1a2e] hover:bg-gray-50 transition-colors text-center"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-[#1a1a2e]">Reset your password</h2>
              <p className="mt-2 text-sm text-[#1a1a2e]/60">
                Enter your email and we&rsquo;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoFocus
                    className="w-full rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-4 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-[#1a1a2e] focus:ring-1 focus:ring-[#1a1a2e] transition-all"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#1a1a2e]/50">
                Remember your password?{" "}
                <Link href="/login" className="font-medium text-[#1a1a2e] hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
