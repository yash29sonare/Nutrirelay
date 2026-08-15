"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { CheckCircle, Clock, MessageSquare, UserRound } from "lucide-react";
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
        Your workspace is ready
      </h1>
      <p className="text-sm text-[var(--muted)] mt-2 max-w-md">
        Welcome aboard{data.displayName ? `, ${data.displayName}` : ""}. Next, connect your WhatsApp coaching number from Settings.
      </p>

      <Card className="mt-8 w-full max-w-sm text-left">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3">
            <UserRound size={15} className="text-brand-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">Trainer display name</p>
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {data.displayName || "Trainer"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare size={15} className="text-brand-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">Coaching brand</p>
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {data.businessName || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={15} className="text-brand-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">Timezone</p>
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {data.timezone || "Asia/Kolkata"}
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
