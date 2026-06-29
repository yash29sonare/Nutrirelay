"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { RadioCards } from "@/components/ui/RadioCards";
import { FormSection } from "@/components/ui/FormSection";
import { Card, CardContent } from "@/components/ui/Card";
import { MessageSquare } from "lucide-react";
import type { OnboardingData } from "../onboarding-types";

const clientCountOptions = [
  {
    value: "Just getting started (0-5)",
    label: "Just getting started",
    description: "0–5 clients",
  },
  {
    value: "Growing (5-15)",
    label: "Growing",
    description: "5–15 clients",
  },
  {
    value: "Established (15-30)",
    label: "Established",
    description: "15–30 clients",
  },
  {
    value: "Scaling (30-50)",
    label: "Scaling",
    description: "30–50 clients",
  },
  {
    value: "Large studio (50+)",
    label: "Large studio",
    description: "50+ clients",
  },
];

export function StepBusiness() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<OnboardingData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Business Setup
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Configure your business settings. You can change these later.
        </p>
      </div>

      <FormSection title="WhatsApp Business">
        <Card>
          <CardContent className="flex items-start gap-4 py-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface-overlay)] shrink-0">
              <MessageSquare size={18} className="text-[var(--muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Connect WhatsApp Business
              </p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Send automated check-ins, reminders, and updates to your clients via WhatsApp.
              </p>
              <div className="mt-3">
                <Controller
                  name="whatsappConnected"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      label="I'll set up WhatsApp later"
                    />
                  )}
                />
              </div>
              <p className="text-xs text-amber-500 mt-2">
                WhatsApp connection will be configured after onboarding.
              </p>
            </div>
          </CardContent>
        </Card>
      </FormSection>

      <FormSection title="Client Volume">
        <Controller
          name="expectedClientCount"
          control={control}
          render={({ field }) => (
            <RadioCards
              options={clientCountOptions}
              value={field.value || ""}
              onChange={field.onChange}
              name="expectedClientCount"
            />
          )}
        />
        {errors.expectedClientCount && (
          <p className="text-xs text-[var(--destructive)]">
            {errors.expectedClientCount.message}
          </p>
        )}
      </FormSection>

      <FormSection title="Goals">
        <Textarea
          label="What are your coaching goals?"
          placeholder="E.g., I want to grow my client base, improve retention with automated check-ins, and streamline my meal plan management..."
          rows={4}
          error={errors.coachingGoals?.message}
          {...register("coachingGoals")}
        />
      </FormSection>
    </div>
  );
}
