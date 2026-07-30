"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { INTEGRATION_SETUP, type IntegrationSetup } from "@/lib/integration-setup";

interface ConnectIntegrationCardProps {
  integrationId: string;
  onConnect?: () => void;
}

type ConnectionStatus = "loading" | "not_connected" | "connected" | "error";

export default function ConnectIntegrationCard({ integrationId, onConnect }: ConnectIntegrationCardProps) {
  const router = useRouter();
  const setup = INTEGRATION_SETUP[integrationId];
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      setStatus("loading");
      const res = await fetch(`/api/integrations/${encodeURIComponent(integrationId)}/connect`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStatus(data.connected ? "connected" : "not_connected");
      setConfig(data.config || {});
      setError("");
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Could not load connection status");
    }
  }, [integrationId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  if (!setup) return <div className="text-red-600 text-sm">Unknown integration: {integrationId}</div>;

  const envOk = setup.requiredEnvVars.every(
    (k) => config[k] || false
  );
  const hasPartialConfig = setup.requiredEnvVars.some((k) => config[k]);

  if (status === "loading") {
    return (
      <div className="rounded-lg border border-gray-200 p-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{setup.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{setup.category}</p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === "connected" && envOk
              ? "bg-green-100 text-green-800"
              : hasPartialConfig
              ? "bg-yellow-100 text-yellow-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {status === "connected" && envOk ? "Connected" : hasPartialConfig ? "Partial Setup" : "Not Connected"}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{setup.description}</p>

      {/* Required env vars checkmarks */}
      {setup.requiredEnvVars.length > 0 && (
        <div className="mb-4 space-y-1">
          {setup.requiredEnvVars.map((key) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className={config[key] ? "text-green-600" : "text-gray-400"}>
                {config[key] ? "●" : "○"}
              </span>
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">{key}</code>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

      <div className="flex gap-2">
        {status === "connected" && envOk ? (
          <>
            <button
              onClick={() => router.push(`/integrations/${encodeURIComponent(integrationId)}/connect`)}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Reconfigure
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`/api/integrations/${encodeURIComponent(integrationId)}/action`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: setup.testAction }),
                  });
                  const data = await res.json();
                  alert(data.mode === "live" ? `Connected! ${data.message}` : `Note: ${data.message}`);
                } catch { alert("Test failed — check console"); }
              }}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
            >
              Test
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => router.push(`/integrations/${encodeURIComponent(integrationId)}/connect`)}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Connect
            </button>
            {hasPartialConfig && (
              <button
                onClick={onConnect}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Quick Test
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
