interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Text label rendered at the centre of the ring */
  label?: string;
  /** CSS color value for the progress arc — defaults to brand-500 green */
  accentColor?: string;
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  className = "",
  label,
  accentColor = "var(--color-brand-500, #22c55e)",
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          style={{ stroke: "var(--surface-border)" }}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            stroke: accentColor,
            transition: "stroke-dashoffset 0.4s ease",
          }}
        />
      </svg>
      {label !== undefined && (
        <span className="absolute text-xs font-semibold text-[var(--foreground)]">
          {label}
        </span>
      )}
    </div>
  );
}
