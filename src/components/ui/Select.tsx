import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, ...props }, ref) => {
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
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)]",
              "px-3 py-2 pr-9 text-sm text-[var(--foreground)]",
              "transition-all duration-150 appearance-none",
              "focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-[var(--destructive)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]",
              className
            )}
            aria-invalid={!!error}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
          />
        </div>
        {error && (
          <p className="text-xs text-[var(--destructive)]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
