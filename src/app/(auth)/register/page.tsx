"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, Building2, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { COMPANY_SIZES, type CompanySize } from "@/lib/org-types";

const STEPS = { DETAILS: 1, ORG: 2 };

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [step, setStep] = useState(STEPS.DETAILS);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Personal details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2: Org details
  const [orgName, setOrgName] = useState("");
  const [companySize, setCompanySize] = useState<CompanySize>("solo");

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.length < 2) errs.name = "Name must be at least 2 characters";
    if (!email.includes("@")) errs.email = "Please enter a valid email";
    if (password.length < 3) errs.password = "Password must be at least 3 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) setStep(STEPS.ORG);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await registerUser(name.trim(), email.trim(), password, orgName.trim() || undefined, companySize);
    if (ok) {
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } else {
      toast.error("Registration failed — please try again");
    }
    setLoading(false);
  };

  const skipOrg = async () => {
    setLoading(true);
    const ok = await registerUser(name.trim(), email.trim(), password);
    if (ok) {
      toast.success("Account created! You can set up your organisation later.");
      router.push("/dashboard");
    } else {
      toast.error("Registration failed");
    }
    setLoading(false);
  };

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
        <div className="space-y-6">
          <h1 className="text-5xl leading-[1.08] font-medium tracking-tight">
            Your logistics<br />operation,<br />
            <span className="italic text-white/50">running itself.</span>
          </h1>
          <p className="text-lg text-white/50 max-w-md">Start your 14-day free trial. No credit card required.</p>
        </div>
        <p className="text-sm text-white/30">© {new Date().getFullYear()} Lanework, Inc.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Step indicator */}
          {step === STEPS.ORG && (
            <button onClick={() => setStep(STEPS.DETAILS)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}

          {step === STEPS.DETAILS ? (
            <>
              <div>
                <h2 className="text-3xl font-medium tracking-tight text-[#1a1a2e]">Create account</h2>
                <p className="mt-2 text-[#6b7280]">Start your 14-day free trial. No credit card required.</p>
              </div>

              <form onSubmit={handleStep1} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Name</label>
                  <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                    placeholder="Your name" />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Email</label>
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                    placeholder="you@company.com" />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Password</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 pr-12 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                      placeholder="Min 3 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#1a1a2e]">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                </div>

                <button type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 transition">
                  <span className="flex items-center gap-2">Next: Set up your team <ArrowRight className="h-4 w-4" /></span>
                </button>

                <button type="button" onClick={skipOrg} className="w-full text-sm text-[#6b7280] hover:text-[#1a1a2e] py-1 transition">
                  Skip for now
                </button>
              </form>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium mb-2">
                  <Building2 className="h-4 w-4" /> Step 2 of 2
                </div>
                <h2 className="text-3xl font-medium tracking-tight text-[#1a1a2e]">Your organisation</h2>
                <p className="mt-2 text-[#6b7280]">Set up your team workspace. We&apos;ll recommend the best plan for your size.</p>
              </div>

              <form onSubmit={handleStep2} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Company name</label>
                  <input id="orgName" type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                    className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] transition"
                    placeholder="e.g. Acme Logistics Pvt Ltd" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-3">Company size</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPANY_SIZES.map(size => (
                      <button key={size.value} type="button" onClick={() => setCompanySize(size.value)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          companySize === size.value
                            ? "border-[#1a1a2e] bg-[#1a1a2e]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-sm font-semibold text-[#1a1a2e]">{size.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">{size.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan suggestion */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-sm text-emerald-700">
                    <span className="font-semibold">💡 Recommended:</span>{" "}
                    Based on your team size ({COMPANY_SIZES.find(s => s.value === companySize)?.members}), we suggest the{" "}
                    <span className="font-bold">
                      {companySize === "solo" ? "Free Trial" : companySize === "2-10" || companySize === "11-30" ? "Starter (₹999/mo)" : companySize === "31-50" || companySize === "51-100" ? "Growth (₹2,999/mo)" : "Enterprise (₹7,999/mo)"}
                    </span>{" "}
                    plan. You can change this anytime.
                  </p>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Create account & workspace</span> <ArrowRight className="h-4 w-4" /></>}
                </button>

                <button type="button" onClick={skipOrg} disabled={loading} className="w-full text-sm text-[#6b7280] hover:text-[#1a1a2e] py-1 transition">
                  Skip — create organisation later
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-[#6b7280]">
            Already have an account? <Link href="/login" className="font-medium text-[#1a1a2e] hover:underline underline-offset-4">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
