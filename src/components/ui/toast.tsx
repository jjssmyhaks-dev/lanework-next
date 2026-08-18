"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in",
              t.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800",
              t.type === "error" && "bg-red-50 border-red-200 text-red-800",
              t.type === "info" && "bg-blue-50 border-blue-200 text-blue-800"
            )}
          >
            {t.type === "success" && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
            {t.type === "info" && <Info className="h-4 w-4 flex-shrink-0" />}
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="p-0.5 rounded hover:bg-black/5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
