import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integration Setup",
  description: "Connect and configure your logistics integrations with Lanework.",
};

export default function IntegrationDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
