import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--foreground)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)]",
              "px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]",
              "transition-all duration-150",
              "focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-[var(--destructive)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]",
              icon && "pl-9",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--destructive)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
