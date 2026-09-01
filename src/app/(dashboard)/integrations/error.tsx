"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function IntegrationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Integrations Error]", error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="h-12 w-12 text-red-500" />
      <h2 className="text-xl font-semibold text-gray-900">Integrations unavailable</h2>
      <p className="max-w-md text-center text-sm text-gray-500">
        {error.message || "Failed to load integrations. Please try again."}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
