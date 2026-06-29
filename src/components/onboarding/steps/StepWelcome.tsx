"use client";

import { Button } from "@/components/ui/Button";
import { Dumbbell } from "lucide-react";

interface StepWelcomeProps {
  onContinue: () => void;
}

export function StepWelcome({ onContinue }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center text-center py-8 sm:py-12">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 mb-6">
        <Dumbbell size={32} className="text-white" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
        Welcome to Fortress Fitness
      </h1>
      <p className="text-sm text-[var(--muted)] mt-3 max-w-md leading-relaxed">
        Your all-in-one platform for managing clients, automating coaching workflows,
        and growing your training business. Let&apos;s get you set up.
      </p>

      <div className="grid gap-3 mt-8 w-full max-w-sm text-left">
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--surface-border)]">
          <span className="text-lg leading-none mt-0.5">📋</span>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Client Management</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Track goals, meals, workouts, and compliance in one place
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--surface-border)]">
          <span className="text-lg leading-none mt-0.5">🤖</span>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">AI-Powered Automation</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Automated check-ins, meal logging, and compliance monitoring
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--surface-border)]">
          <span className="text-lg leading-none mt-0.5">📊</span>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Business Insights</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Reports, billing, and analytics to grow your practice
            </p>
          </div>
        </div>
      </div>

      <Button variant="brand" size="lg" onClick={onContinue} className="mt-8">
        Get Started
      </Button>
    </div>
  );
}
