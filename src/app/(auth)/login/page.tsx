"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(3, "Password must be at least 3 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    setLoading(true);
    const ok = await login(data.email, data.password);
    if (ok) { toast.success("Welcome back!"); router.push("/dashboard"); }
    else { toast.error("Invalid email or password"); }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-white">
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

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-[#1a1a2e]">Sign in</h2>
            <p className="mt-2 text-[#6b7280]">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Email</label>
              <input id="email" type="email" {...register("email")}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                placeholder="you@company.com" />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} {...register("password")}
                  className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 pr-12 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#1a1a2e]">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              <div className="mt-1 text-right">
                <Link href="/forgot-password" className="text-xs text-[#6b7280] hover:text-[#1a1a2e] hover:underline">Forgot password?</Link>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>}
            </button>
          </form>

          <p className="text-center text-sm text-[#6b7280]">
            Don&apos;t have an account? <Link href="/register" className="font-medium text-[#1a1a2e] hover:underline underline-offset-4">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
