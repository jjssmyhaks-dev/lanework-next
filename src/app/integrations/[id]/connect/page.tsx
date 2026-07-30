import { notFound } from "next/navigation";
import { getIntegrationSetup } from "@/lib/integration-setup";
import ConnectPageClient from "./client";

export default async function ConnectIntegrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const setup = getIntegrationSetup(id);
  if (!setup) notFound();

  // Fetch current connection state from the API
  let connectionState: any = { connected: false, config: {} };
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/integrations/${encodeURIComponent(id)}/connect`, { cache: "no-store" });
    if (res.ok) connectionState = await res.json();
  } catch { /* use defaults */ }

  return (
    <ConnectPageClient
      integration={setup}
      connected={connectionState?.connected || false}
      existingConfig={connectionState?.config || {}}
    />
  );
}
