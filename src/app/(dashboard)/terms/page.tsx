"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center gap-3 text-sm text-[#1a1a2e]/50 mb-8">
          <Link href="/dashboard" className="hover:text-[#1a1a2e]">Home</Link><span>/</span>
          <span className="text-[#1a1a2e]">Terms of Service</span>
        </div>

        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-6">Terms of Service</h1>
        <p className="text-sm text-[#1a1a2e]/50 mb-8">Last updated: August 20, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[#1a1a2e]/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Lanework (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">2. Description of Service</h2>
            <p>Lanework is a logistics management platform that provides AI-powered tools for shipment tracking, inventory management, route optimization, fleet management, and related services. The Service includes 15 MCP (Model Context Protocol) server integrations with external APIs.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">3. Account Registration</h2>
            <p>You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">4. Subscription Plans</h2>
            <p>Lanework offers Free Trial, Starter, Growth, and Enterprise plans. All prices are in Indian Rupees (INR) plus applicable GST (18%). You may upgrade or downgrade at any time. Downgrades take effect at the end of the current billing cycle.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">5. Usage Limits</h2>
            <p>Each plan has specific usage limits (AI chat messages, shipments, integrations). When limits are reached, the Service will prompt you to upgrade. We reserve the right to enforce hard limits on free plans.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">6. Third-Party Integrations</h2>
            <p>The Service connects to third-party APIs (Shiprocket, Shopify, FedEx, etc.) via MCP servers. You provide your own API credentials for these services. We are not responsible for the availability, accuracy, or policies of third-party services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">7. Data Ownership</h2>
            <p>You retain all rights to your data. We store your data on Neon PostgreSQL and do not share it with other customers or use it to train AI models. Data is tenant-isolated.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">8. AI and Autonomous Actions</h2>
            <p>Lanework includes AI agents that can take autonomous actions (shipment booking, route optimization, etc.) based on your configured trust levels. You are responsible for setting appropriate approval thresholds. All agent actions are logged with reasoning traces.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Lanework shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">10. Termination</h2>
            <p>You may cancel your subscription at any time. Upon cancellation, your data will be retained for 30 days, after which it may be deleted. We may terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">11. Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">12. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:legal@lanework.in" className="text-emerald-600 hover:underline">legal@lanework.in</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
