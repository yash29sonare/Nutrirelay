"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { CheckCircle, Dumbbell } from "lucide-react";
import type { OnboardingData } from "../onboarding-types";

interface StepCompleteProps {
  data: OnboardingData;
}

export function StepComplete({ data }: StepCompleteProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center text-center py-8 sm:py-12">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-500 mb-6">
        <CheckCircle size={32} className="text-white" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
        You&apos;re All Set!
      </h1>
      <p className="text-sm text-[var(--muted)] mt-2 max-w-md">
        Welcome aboard{data.displayName ? `, ${data.displayName}` : ""}. Your Fortress Fitness
        workspace is ready.
      </p>

      <Card className="mt-8 w-full max-w-sm text-left">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Dumbbell size={15} className="text-brand-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">Business</p>
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {data.businessName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle size={15} className="text-brand-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">Country</p>
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {data.country || "Not specified"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--muted)] mt-6 max-w-sm leading-relaxed">
        Redirecting to your dashboard...
      </p>
    </div>
  );
}
