"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => {
  return data.password.length >= 6;
}, { message: "Password must be at least 6 characters", path: ["password"] });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterForm) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      });
      const result = await res.json();
      if (!result.success) { toast.error(result.error || "Registration failed"); setLoading(false); return; }

      const signInResult = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
      if (signInResult?.error) { toast.error("Account created but sign-in failed. Please try logging in."); router.push("/login"); }
      else { toast.success("Account created successfully!"); router.push("/dashboard"); router.refresh(); }
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setLoading(false); }
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
          <p className="text-lg text-white/50 max-w-md">Start your 14-day free trial. No credit card required.</p>
        </div>
        <p className="text-sm text-white/30">© {new Date().getFullYear()} Lanework, Inc.</p>
      </div>

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
            <h2 className="text-3xl font-medium tracking-tight text-[#1a1a2e]">Create account</h2>
            <p className="mt-2 text-[#6b7280]">Start your 14-day free trial. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Name</label>
              <input id="name" type="text" {...register("name")}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                placeholder="Your name" />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Email</label>
              <input id="email" type="email" {...register("email")}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                placeholder="you@company.com" />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Password</label>
              <input id="password" type="password" {...register("password")}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                placeholder="Min 6 characters" />
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-2">Create account <ArrowRight className="h-4 w-4" /></span>}
            </button>
          </form>

          <p className="text-center text-sm text-[#6b7280]">
            Already have an account? <Link href="/login" className="font-medium text-[#1a1a2e] hover:underline underline-offset-4">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
