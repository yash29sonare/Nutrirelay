import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={cn("px-6 py-6 max-w-6xl", className)}>
      {children}
    </div>
  );
}
