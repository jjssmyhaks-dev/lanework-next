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

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterForm) {
    setLoading(true);
    try {
      // Register the user
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Auto sign in after registration
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error("Account created but sign-in failed. Please try logging in.");
        router.push("/login");
      } else {
        toast.success("Account created successfully!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-black text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-white">
              <div className="h-4 w-4 rounded-sm bg-black" style={{ transform: "rotate(45deg)" }} />
            </div>
            <span className="text-xl font-semibold tracking-tight">Lanework</span>
          </div>
        </div>
        <div className="space-y-6">
          <h1 className="text-5xl leading-[1.1] font-medium">
            Your logistics operation,
            <br />
            <em className="italic text-neutral-400">running itself.</em>
          </h1>
          <p className="text-lg text-neutral-400 max-w-md">
            AI agents that track shipments, manage inventory, and optimize routes — plugged into the systems you already use.
          </p>
        </div>
        <p className="text-sm text-neutral-500">© {new Date().getFullYear()} Lanework, Inc.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-black">
                <div className="h-4 w-4 rounded-sm bg-white" style={{ transform: "rotate(45deg)" }} />
              </div>
              <span className="text-xl font-semibold tracking-tight text-black">Lanework</span>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-medium text-black">Create account</h2>
            <p className="mt-2 text-neutral-500">Start your 14-day free trial. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black mb-1.5">
                Name
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors"
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors"
                placeholder="you@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-1.5">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-black hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
