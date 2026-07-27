"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mic, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";

export default function VoiceBetaRegister() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState({ name: "", email: "", company: "", useCase: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company,
          message: `Voice Copilot Beta signup. Use case: ${form.useCase || "Not specified"}`,
          type: "voice-beta",
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      setStep("success");
    } catch (err) {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-[#1a1a2e]">You're on the list!</h1>
          <p className="mt-3 text-[#1a1a2e]/65 leading-relaxed">
            Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}. We'll reach out at <strong>{form.email}</strong> as soon as
            Voice Copilot spots open up. Early access is rolling out weekly.
          </p>
          <div className="mt-8 space-y-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <br />
            <Link href="/voice" className="text-sm text-[#1a1a2e]/60 hover:text-[#1a1a2e] underline underline-offset-2">
              Back to Voice Copilot
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#1a1a2e]/5 px-4 py-1.5 text-sm text-[#1a1a2e]/70">
            <Mic className="h-3.5 w-3.5" /> Private Beta
          </div>
          <h1 className="text-3xl font-semibold text-[#1a1a2e]">Join Voice Copilot Beta</h1>
          <p className="mt-3 text-[#1a1a2e]/65">
            Be among the first to talk to your logistics operation. No credit card, no commitment — just early access.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Full name</label>
            <input
              type="text"
              required
              placeholder="Rohit Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/35 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e]/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Work email</label>
            <input
              type="email"
              required
              placeholder="rohit@logisticsco.in"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/35 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e]/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Company</label>
            <input
              type="text"
              required
              placeholder="Northbound Logistics"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/35 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e]/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">
              How would you use Voice Copilot? <span className="text-[#1a1a2e]/40 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Hands-free shipment tracking while on the warehouse floor, voice approvals for reroutes..."
              value={form.useCase}
              onChange={(e) => setForm({ ...form, useCase: e.target.value })}
              className="w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/35 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e]/40 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>Submitting…</>
            ) : (
              <>Request Early Access <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        {/* Trust badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-[#1a1a2e]/45">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> No spam
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Early access
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#1a1a2e]/40">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-2 hover:text-[#1a1a2e]/70">Sign in</Link>
          {" · "}
          <Link href="/voice" className="underline underline-offset-2 hover:text-[#1a1a2e]/70">Learn more</Link>
        </p>
      </div>
    </main>
  );
}
