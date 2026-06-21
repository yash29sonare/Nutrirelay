import { Card, CardContent } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";

interface MetricCardProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  accentColor: string;
}

export function MetricCard({
  label,
  current,
  target,
  unit,
  accentColor,
}: MetricCardProps) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const remaining = Math.max(0, target - current);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-6">
        <ProgressRing
          value={pct}
          size={88}
          strokeWidth={7}
          accentColor={accentColor}
          label={`${pct}%`}
        />
        <div className="text-center space-y-0.5">
          <p className="text-lg font-bold text-[var(--foreground)] leading-none">
            {current}
            <span className="text-xs font-normal text-[var(--muted)] ml-1">
              {unit}
            </span>
          </p>
          <p className="text-xs text-[var(--muted)]">{label}</p>
          <p className="text-xs" style={{ color: accentColor }}>
            {remaining}
            {unit} remaining
          </p>
        </div>
        <div className="w-full mt-1">
          <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
            <span>0</span>
            <span>
              Target: {target}
              {unit}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--surface-border)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: accentColor }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
