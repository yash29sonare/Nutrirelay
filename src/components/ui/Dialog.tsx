"use client";

import { useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  children,
  title,
  className = "",
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div
        className={cn(
          "relative w-full max-w-lg rounded-xl bg-[var(--surface-raised)] border border-[var(--surface-border)]",
          "shadow-lg animate-in fade-in zoom-in-95",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--surface-border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
