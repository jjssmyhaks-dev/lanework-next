"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center gap-3 text-sm text-[#1a1a2e]/50 mb-8">
          <Link href="/dashboard" className="hover:text-[#1a1a2e]">Home</Link><span>/</span>
          <span className="text-[#1a1a2e]">Privacy Policy</span>
        </div>

        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-6">Privacy Policy</h1>
        <p className="text-sm text-[#1a1a2e]/50 mb-8">Last updated: August 20, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[#1a1a2e]/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">1. Information We Collect</h2>
            <p><strong>Account Information:</strong> Name, email address, phone number, and company details when you register.</p>
            <p><strong>Usage Data:</strong> Pages visited, features used, API calls made, and interaction patterns within the Service.</p>
            <p><strong>Integration Data:</strong> API credentials you provide for third-party services (Shiprocket, Shopify, etc.) are encrypted with AES-256-GCM and stored securely.</p>
            <p><strong>Logistics Data:</strong> Shipment tracking numbers, inventory records, route data, and customer information you enter into the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve the Service, process transactions, send notifications, and communicate with you. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">3. Data Storage & Security</h2>
            <p>Your data is stored on Neon PostgreSQL with tenant isolation. We use AES-256-GCM encryption for sensitive credentials, JWT authentication with refresh tokens, rate limiting, and audit logging. All data is transmitted over TLS.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">4. Third-Party Services</h2>
            <p>The Service integrates with third-party APIs (Shiprocket, Shopify, FedEx, OpenWeatherMap, etc.) via MCP servers. Your data is shared with these services only when you explicitly trigger an action. We are not responsible for the privacy practices of third-party services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">5. AI and Data Processing</h2>
            <p>Lanework uses Cloudflare Workers AI (Llama 3 8B) to process natural language queries. Queries are processed in real-time and are not stored for model training. Your logistics data is never used to train shared AI models.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">6. Data Retention</h2>
            <p>Free plan data is retained for 7 days. Starter plan: 90 days. Growth: 1 year. Enterprise: indefinitely. Upon account deletion, data is purged within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, delete, and export your data. Contact us at <a href="mailto:privacy@lanework.in" className="text-emerald-600 hover:underline">privacy@lanework.in</a> to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">8. Cookies</h2>
            <p>We use essential cookies for authentication (auth-token, refresh-token). We do not use tracking cookies or sell cookie data to advertisers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">9. Changes to This Policy</h2>
            <p>We may update this policy from time to time. Material changes will be communicated via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-3">10. Contact</h2>
            <p>For privacy-related inquiries, contact our Data Protection Officer at <a href="mailto:privacy@lanework.in" className="text-emerald-600 hover:underline">privacy@lanework.in</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
