import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)]",
            "px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]",
            "transition-all duration-150 resize-y min-h-[80px]",
            "focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-[var(--destructive)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--destructive)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
