import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className = "" }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap",
        className
      )}
    >
      {children}
    </div>
  );
}
