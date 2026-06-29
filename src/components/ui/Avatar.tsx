import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "w-7 h-7 text-xs",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

export function Avatar({
  src,
  alt = "",
  fallback,
  size = "md",
  className = "",
}: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(
          "rounded-full object-cover shrink-0",
          SIZE_CLASSES[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[var(--surface-overlay)] flex items-center justify-center shrink-0",
        SIZE_CLASSES[size],
        className
      )}
      aria-label={alt || fallback}
    >
      <span className="font-semibold text-[var(--muted)]">
        {fallback || "?"}
      </span>
    </div>
  );
}
