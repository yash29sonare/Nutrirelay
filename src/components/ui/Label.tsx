import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function Label({ children, className = "", ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-[var(--foreground)]",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
