"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className = "" }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center justify-center gap-0">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          const isLast = i === steps.length - 1;

          return (
            <li key={i} className="flex items-center flex-1 min-w-0">
              <div className="flex items-center w-full">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Step circle */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-xs font-semibold transition-colors duration-200",
                      isCompleted &&
                        "bg-brand-500 text-white",
                      isCurrent &&
                        "bg-brand-500 text-white ring-2 ring-brand-500/30",
                      !isCompleted &&
                        !isCurrent &&
                        "bg-[var(--surface-overlay)] text-[var(--muted)]"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isCompleted ? (
                      <Check size={13} />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>

                  {/* Label — hidden on mobile */}
                  <span
                    className={cn(
                      "hidden sm:inline text-xs font-medium truncate",
                      isCompleted && "text-[var(--foreground)]",
                      isCurrent && "text-[var(--foreground)]",
                      !isCompleted && !isCurrent && "text-[var(--muted)]"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      "flex-1 h-px mx-3",
                      i < currentStep
                        ? "bg-brand-500"
                        : "bg-[var(--surface-border)]"
                    )}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
