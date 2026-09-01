"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IntegrationSetup } from "@/lib/integration-setup";
import { sanitizeHTML } from "@/lib/sanitize";

export default function ConnectPageClient({
  integration,
  connected,
  existingConfig,
}: {
  integration: IntegrationSetup;
  connected: boolean;
  existingConfig: Record<string, string>;
}) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    for (const k of [...integration.requiredEnvVars, ...(integration.optionalEnvVars || [])]) {
      vals[k] = existingConfig[k] || "";
    }
    return vals;
  });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success?: boolean; message?: string; missingFields?: string[] } | null>(null);
  const [testResult, setTestResult] = useState<{ success?: boolean; mode?: string; message?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch(`/api/integrations/${encodeURIComponent(integration.id)}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: formValues }),
      });
      const data = await res.json();
      setSaveResult(data);
    } catch (err: any) {
      setSaveResult({ success: false, message: err.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integrations/${encodeURIComponent(integration.id)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: integration.testAction }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, mode: "error", message: err.message || "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => router.push("/integrations")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        ← Back to Integrations
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Connect {integration.name}</h1>
        <p className="mt-1 text-gray-600">{integration.description}</p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-600 font-medium">
          {integration.category}
        </span>
        {connected && <span className="inline-block mt-2 ml-2 px-2 py-0.5 rounded bg-green-100 text-xs text-green-800 font-medium">Connected</span>}
      </div>

      {/* Setup Steps */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Setup Steps</h2>
        <div className="space-y-6">
          {integration.setupSteps.map((step) => (
            <div key={step.step} className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
                {step.step}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">{step.title}</h3>
                <div
                  className="mt-1 text-sm text-gray-600 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTML(
                      step.instruction
                        .replace(/\n/g, "<br>")
                        .replace(
                          /\[(.+?)\]\((https?:\/\/.+?)\)/g,
                          '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
                        )
                        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">$1</code>')
                    ),
                  }}
                />
                {step.envVar && (
                  <div className="mt-2">
                    <code className="inline-block bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-xs font-mono">
                      Env: {step.envVar}
                    </code>
                  </div>
                )}
                {step.helpUrl && (
                  <a
                    href={step.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1.5 text-xs text-blue-600 hover:underline"
                  >
                    Open in browser →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration form */}
      <div className="mb-10 border border-gray-200 rounded-lg p-6 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Configuration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Paste the credentials you obtained above. These are saved as environment variables or integration config.
        </p>

        <div className="space-y-4">
          {integration.requiredEnvVars.map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {key} <span className="text-red-500">*</span>
              </label>
              <input
                type={key.toLowerCase().includes("secret") || key.toLowerCase().includes("password") || key.toLowerCase().includes("token") ? "password" : "text"}
                value={formValues[key] || ""}
                onChange={(e) => setFormValues({ ...formValues, [key]: e.target.value })}
                placeholder={`Enter ${key}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
          {(integration.optionalEnvVars || []).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-500 mb-1">{key} (optional)</label>
              <input
                type="text"
                value={formValues[key] || ""}
                onChange={(e) => setFormValues({ ...formValues, [key]: e.target.value })}
                placeholder={`Enter ${key}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>

        {/* Save/Cancel */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : connected ? "Update Configuration" : "Save & Connect"}
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
        </div>

        {/* Save result */}
        {saveResult && (
          <div className={`mt-3 p-3 rounded text-sm ${saveResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {saveResult.success ? "Configuration saved!" : saveResult.message}
            {saveResult.missingFields && (
              <div className="mt-1">
                Missing: {saveResult.missingFields.map((f: string) => (
                  <code key={f} className="bg-red-100 px-1 mx-0.5 rounded text-xs">{f}</code>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`mt-3 p-3 rounded text-sm ${testResult.mode === "live" ? "bg-green-50 text-green-800" : testResult.mode === "error" ? "bg-red-50 text-red-800" : "bg-yellow-50 text-yellow-800"}`}>
            <p className="font-medium">{testResult.mode === "live" ? "✓ Connected!" : testResult.mode === "error" ? "✗ Error" : "⚠ Not Live"}</p>
            <p className="mt-0.5">{testResult.message}</p>
          </div>
        )}
      </div>

      {/* Help Links */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Help & Resources</h2>
        <ul className="space-y-2">
          {integration.helpLinks.map((link, i) => (
            <li key={i}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {link.label} →
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Security note */}
      <div className="border-t border-gray-200 pt-6">
        <p className="text-xs text-gray-400">
          ⚠️ Never commit API keys to version control. These credentials are stored securely in your environment
          and database config. Use Vercel Environment Variables for server-side secrets.
        </p>
      </div>
    </div>
  );
}
