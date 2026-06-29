"use client";

import { cn } from "@/lib/utils";

interface RadioCardsOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioCardsProps {
  options: RadioCardsOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  className?: string;
}

export function RadioCards({
  options,
  value,
  onChange,
  name,
  className = "",
}: RadioCardsProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-150",
              isSelected
                ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500"
                : "border-[var(--surface-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)]"
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={isSelected}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-brand-500"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {opt.label}
              </p>
              {opt.description && (
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {opt.description}
                </p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
