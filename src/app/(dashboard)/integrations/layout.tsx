import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Connect Lanework with Shiprocket, Shopify, FedEx, TallyPrime, and 15+ other logistics tools.",
};

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
