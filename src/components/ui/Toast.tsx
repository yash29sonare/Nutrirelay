"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={15} />,
  error: <AlertCircle size={15} />,
  warning: <AlertTriangle size={15} />,
  info: <Info size={15} />,
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-l-[var(--success)] text-[var(--success)]",
  error: "border-l-[var(--destructive)] text-[var(--destructive)]",
  warning: "border-l-[var(--warning)] text-[var(--warning)]",
  info: "border-l-[var(--info)] text-[var(--info)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 max-w-sm"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--surface-raised)]",
        "border border-[var(--surface-border)] shadow-md",
        "border-l-4",
        VARIANT_STYLES[item.variant]
      )}
    >
      <span className="mt-0.5 shrink-0">{ICONS[item.variant]}</span>
      <p className="text-sm text-[var(--foreground)] flex-1">{item.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(item.id)}
        className="text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
