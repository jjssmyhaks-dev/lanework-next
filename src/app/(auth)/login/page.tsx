"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(3, "Password must be at least 3 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

/* ────── Forgot Password Modal ────── */
function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<"email" | "code" | "newPassword">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  if (!open) return null;

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "send-code", email }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Reset code sent to your email"); setStep("code"); }
      else { toast.error(data.error || "Failed to send code"); }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify-code", email, code }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Code verified"); setStep("newPassword"); }
      else { toast.error(data.error || "Invalid code"); }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "reset", email, code, newPassword }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Password changed successfully! You can now sign in."); onClose(); }
      else { toast.error(data.error || "Failed to reset"); }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-[#e5e7eb]" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-[#1a1a2e]">Reset your password</h3>
        <p className="mt-1 text-sm text-[#6b7280]">
          {step === "email" && "Enter your email and we'll send you a reset code."}
          {step === "code" && `Enter the 6-digit code sent to ${email}.`}
          {step === "newPassword" && "Choose a new password."}
        </p>

        {step === "email" && (
          <div className="mt-6 space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]"
              placeholder="you@company.com" />
            <button onClick={handleSendCode} disabled={loading || !email}
              className="w-full rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Send Reset Code"}
            </button>
          </div>
        )}

        {step === "code" && (
          <div className="mt-6 space-y-4">
            <input type="text" value={code} onChange={e => setCode(e.target.value)} maxLength={6}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-center text-2xl tracking-[0.5em] text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]"
              placeholder="000000" />
            <button onClick={handleVerifyCode} disabled={loading || code.length < 6}
              className="w-full rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Verify Code"}
            </button>
          </div>
        )}

        {step === "newPassword" && (
          <div className="mt-6 space-y-4">
            <div className="relative">
              <input type={showPwd ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 pr-12 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]"
                placeholder="New password (min 3 characters)" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#1a1a2e]">
                {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <button onClick={handleResetPassword} disabled={loading || newPassword.length < 3}
              className="w-full rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Change Password"}
            </button>
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full text-sm text-[#6b7280] hover:text-[#1a1a2e]">Cancel</button>
      </div>
    </div>
  );
}

/* ────── Login Page ────── */
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
      if (result?.error) { toast.error(result.error); } else { toast.success("Welcome back!"); router.push("/dashboard"); router.refresh(); }
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />

      {/* Left — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a1a2e] text-white flex-col justify-between p-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-white">
            <div className="h-4 w-4 rounded-sm bg-[#1a1a2e]" style={{ transform: "rotate(45deg)" }} />
          </div>
          <span className="text-xl font-semibold">Lanework</span>
        </Link>
        <div className="space-y-6">
          <h1 className="text-5xl leading-[1.08] font-medium tracking-tight">
            Your logistics<br />operation,<br />
            <span className="italic text-white/50">running itself.</span>
          </h1>
          <p className="text-lg text-white/50 max-w-md">AI agents that track shipments, manage inventory, and optimize routes — plugged into the systems you already use.</p>
        </div>
        <p className="text-sm text-white/30">© {new Date().getFullYear()} Lanework, Inc.</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-[#1a1a2e]">
                <div className="h-4 w-4 rounded-sm bg-white" style={{ transform: "rotate(45deg)" }} />
              </div>
              <span className="text-xl font-semibold">Lanework</span>
            </Link>
          </div>

          <div>
            <h2 className="text-3xl font-medium tracking-tight text-[#1a1a2e]">Sign in</h2>
            <p className="mt-2 text-[#6b7280]">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Email</label>
              <input id="email" type="email" {...register("email")}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                placeholder="you@company.com" />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-[#1a1a2e]">Password</label>
                <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-[#1a1a2e]/60 hover:text-[#1a1a2e] transition">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} {...register("password")}
                  className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 pr-12 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#1a1a2e] transition">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>}
            </button>
          </form>

          <p className="text-center text-sm text-[#6b7280]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-[#1a1a2e] hover:underline underline-offset-4">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
