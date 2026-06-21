import { forwardRef } from "react";

type ButtonVariant = "default" | "ghost" | "outline" | "brand" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--surface-overlay)] text-[var(--foreground)] hover:bg-[var(--surface-border)] border border-[var(--surface-border)]",
  ghost:
    "bg-transparent text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]",
  outline:
    "bg-transparent text-[var(--foreground)] border border-[var(--surface-border)] hover:bg-white/5",
  brand: "bg-brand-500 text-white hover:bg-brand-600 border border-brand-600",
  danger:
    "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-5 py-2.5 text-base rounded-xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center font-medium
          transition-all duration-150 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${VARIANT_CLASSES[variant]}
          ${SIZE_CLASSES[size]}
          ${className}
        `.trim()}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
