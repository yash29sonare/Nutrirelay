import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
