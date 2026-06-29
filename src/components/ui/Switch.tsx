"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  id,
}: SwitchProps) {
  const switchId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label
      htmlFor={switchId}
      className={cn(
        "inline-flex items-center gap-2 cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={switchId}
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={cn(
            "w-9 h-5 rounded-full transition-colors duration-150",
            checked
              ? "bg-brand-500"
              : "bg-[var(--surface-border)]"
          )}
        >
          <div
            className={cn(
              "w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-150",
              "absolute top-0.5 left-0.5",
              checked && "translate-x-4"
            )}
          />
        </div>
      </div>
      {label && (
        <span className="text-sm text-[var(--foreground)]">{label}</span>
      )}
    </label>
  );
}
