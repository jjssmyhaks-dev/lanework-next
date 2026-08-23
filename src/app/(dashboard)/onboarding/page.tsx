"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Building2, CreditCard, Cable, Shield, Rocket, Loader2 } from "lucide-react";

const PLANS = [
  { id: "starter", name: "Starter", price: "Free", desc: "Up to 3 agents, 500 tasks/mo, CSV import" },
  { id: "growth", name: "Growth", price: "₹999/mo", desc: "10 agents, 5K tasks/mo, WhatsApp + TMS integrations" },
  { id: "scale", name: "Scale", price: "Custom", desc: "Unlimited agents, API access, dedicated support" },
];

const INTEGRATIONS = [
  { id: "csv_sheets", name: "CSV / Google Sheets", icon: "📊" },
  { id: "whatsapp", name: "WhatsApp Business API", icon: "💬" },
  { id: "tms_wms", name: "TMS / WMS / ERP", icon: "🔗" },
  { id: "webhook", name: "Generic Webhook", icon: "🪝" },
];

const AGENTS = [
  { id: "shipment_tracking", name: "Shipment Tracker" },
  { id: "inventory_optimizer", name: "Inventory Optimizer" },
  { id: "route_planner", name: "Route Planner" },
  { id: "warehouse_agent", name: "Warehouse Agent" },
  { id: "customer_agent", name: "Customer Service Agent" },
  { id: "fleet_agent", name: "Fleet Agent" },
];

const TRUST_LEVELS = [
  { id: "propose_only", label: "Propose only", desc: "Agent suggests; you approve every action" },
  { id: "auto_execute_low_risk", label: "Auto-execute low-risk", desc: "Auto-execute tasks below risk threshold" },
  { id: "fully_autonomous", label: "Fully autonomous", desc: "Agent runs independently within limits" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [plan, setPlan] = useState("starter");
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [trustConfigs, setTrustConfigs] = useState<Record<string, string>>(
    Object.fromEntries(AGENTS.map(a => [a.id, "propose_only"]))
  );

  const toggleIntegration = (id: string) => {
    setSelectedIntegrations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "create-org", userId: "default", orgName, plan }),
      });
      const data = await res.json();
      if (data.success) { setOrgId(data.orgId); setStep(3); } else { alert(data.error); }
    } catch (e) { alert("Failed to create organization"); }
    finally { setLoading(false); }
  };

  const handleIntegrations = async () => {
    setLoading(true);
    try {
      const intList = selectedIntegrations.map(id => ({ type: id, name: INTEGRATIONS.find(i => i.id === id)!.name }));
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "integrations", orgId, integrations: intList }),
      });
      setStep(4);
    } catch { alert("Failed to save integrations"); }
    finally { setLoading(false); }
  };

  const handleTrustConfig = async () => {
    setLoading(true);
    try {
      const configs = Object.entries(trustConfigs).map(([agentType, trustLevel]) => ({ agentType, trustLevel }));
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "trust-config", orgId, trustConfigs: configs }),
      });
      setStep(5);
    } catch { alert("Failed to save trust configs"); }
    finally { setLoading(false); }
  };

  const launch = () => { router.push("/dashboard"); };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-10">
        <div className="flex justify-between text-xs font-medium text-[#6b7280] mb-2">
          {["Organization", "Plan", "Integrations", "Trust", "Launch"].map((s, i) => (
            <span key={s} className={i + 1 <= step ? "text-[#1a1a2e]" : ""}>{s}</span>
          ))}
        </div>
        <div className="h-1 bg-[#e5e7eb] rounded-full overflow-hidden">
          <div className="h-full bg-[#1a1a2e] rounded-full transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg bg-white rounded-2xl p-8" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        {/* Step 1: Organization */}
        {step === 1 && (
          <>
            <Building2 className="h-8 w-8 text-[#1a1a2e] mb-3" />
            <h2 className="text-2xl font-semibold text-[#1a1a2e]">Create your organization</h2>
            <p className="mt-1 text-sm text-[#6b7280]">This is the workspace where your logistics agents will operate.</p>
            <input
              type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
              className="mt-6 w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]"
              placeholder="e.g. Acme Logistics Inc." />
            <button onClick={handleCreateOrg} disabled={loading || !orgName.trim()}
              className="mt-4 w-full rounded-full bg-[#1a1a2e] text-white py-3 text-sm font-medium hover:bg-[#1a1a2e]/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="h-4 w-4" /></>}
            </button>
          </>
        )}

        {/* Step 2: Plan */}
        {step === 2 && (
          <>
            <CreditCard className="h-8 w-8 text-[#1a1a2e] mb-3" />
            <h2 className="text-2xl font-semibold text-[#1a1a2e]">Select your plan</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Start free — no credit card required.</p>
            <div className="mt-6 space-y-3">
              {PLANS.map(p => (
                <label key={p.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    plan === p.id ? "border-[#1a1a2e] bg-[#1a1a2e]/5" : "border-[#e5e7eb] hover:border-[#d1d5db]"
                  }`}>
                  <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={e => setPlan(e.target.value)}
                    className="accent-[#1a1a2e] w-4 h-4" />
                  <div className="flex-1">
                    <div className="font-medium text-[#1a1a2e]">{p.name}</div>
                    <div className="text-xs text-[#6b7280]">{p.desc}</div>
                  </div>
                  <span className="text-xs font-medium text-[#1a1a2e]">{p.price}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-2 text-sm text-[#6b7280] hover:text-[#1a1a2e]">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={() => setStep(3)} className="flex-1 rounded-full bg-[#1a1a2e] text-white py-3 text-sm font-medium hover:bg-[#1a1a2e]/90 flex items-center justify-center gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Integrations */}
        {step === 3 && (
          <>
            <Cable className="h-8 w-8 text-[#1a1a2e] mb-3" />
            <h2 className="text-2xl font-semibold text-[#1a1a2e]">Connect integrations</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Plug in the tools you already use. You can skip this and add later.</p>
            <div className="mt-6 space-y-2">
              {INTEGRATIONS.map(p => (
                <label key={p.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedIntegrations.includes(p.id) ? "border-[#1a1a2e] bg-[#1a1a2e]/5" : "border-[#e5e7eb] hover:border-[#d1d5db]"
                  }`}>
                  <input type="checkbox" checked={selectedIntegrations.includes(p.id)} onChange={() => toggleIntegration(p.id)}
                    className="accent-[#1a1a2e] w-4 h-4 rounded" />
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-sm font-medium text-[#1a1a2e]">{p.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 px-4 py-2 text-sm text-[#6b7280] hover:text-[#1a1a2e]">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={handleIntegrations} disabled={loading}
                className="flex-1 rounded-full bg-[#1a1a2e] text-white py-3 text-sm font-medium hover:bg-[#1a1a2e]/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
            <button onClick={() => setStep(4)} className="mt-3 w-full text-xs text-[#6b7280] hover:text-[#1a1a2e]">Skip for now</button>
          </>
        )}

        {/* Step 4: Agent Trust */}
        {step === 4 && (
          <>
            <Shield className="h-8 w-8 text-[#1a1a2e] mb-3" />
            <h2 className="text-2xl font-semibold text-[#1a1a2e]">Configure agent trust level</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Set how much autonomy each AI agent has over decisions.</p>
            <div className="mt-6 space-y-4">
              {AGENTS.map(a => (
                <div key={a.id} className="p-4 rounded-xl border border-[#e5e7eb]">
                  <div className="text-sm font-medium text-[#1a1a2e] mb-2">{a.name}</div>
                  <div className="flex gap-2">
                    {TRUST_LEVELS.map(tl => (
                      <button key={tl.id}
                        onClick={() => setTrustConfigs(prev => ({ ...prev, [a.id]: tl.id }))}
                        className={`flex-1 p-2 rounded-lg text-xs font-medium transition-all ${
                          trustConfigs[a.id] === tl.id
                            ? "bg-[#1a1a2e] text-white"
                            : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                        }`}
                        title={tl.desc}>{tl.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(3)} className="flex items-center gap-1 px-4 py-2 text-sm text-[#6b7280] hover:text-[#1a1a2e]">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={handleTrustConfig} disabled={loading}
                className="flex-1 rounded-full bg-[#1a1a2e] text-white py-3 text-sm font-medium hover:bg-[#1a1a2e]/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Save & Continue <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </>
        )}

        {/* Step 5: Launch */}
        {step === 5 && (
          <>
            <Rocket className="h-8 w-8 text-[#1a1a2e] mb-3" />
            <h2 className="text-2xl font-semibold text-[#1a1a2e]">You&apos;re all set!</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Your agents are configured and ready. Time for your first live action.</p>
            <div className="mt-6 p-5 rounded-xl bg-[#1a1a2e]/5 space-y-2 text-sm text-[#1a1a2e]">
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Organization: {orgName}</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Plan: {PLANS.find(p => p.id === plan)?.name}</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> {selectedIntegrations.length} integrations connected</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> 6 agents configured</div>
            </div>
            <button onClick={launch}
              className="mt-6 w-full rounded-full bg-[#1a1a2e] text-white py-3 text-sm font-medium hover:bg-[#1a1a2e]/90 flex items-center justify-center gap-2">
              Launch Dashboard <Rocket className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
