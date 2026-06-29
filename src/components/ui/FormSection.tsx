import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className = "",
}: FormSectionProps) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      <legend className="text-base font-semibold text-[var(--foreground)] mb-1">
        {title}
      </legend>
      {description && (
        <p className="text-sm text-[var(--muted)] mb-4">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
