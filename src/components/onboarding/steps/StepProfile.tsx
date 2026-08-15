"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormSection } from "@/components/ui/FormSection";
import type { OnboardingData } from "../onboarding-types";

const timezoneOptions = [
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "America/New_York", label: "Eastern Time (US/Canada)" },
  { value: "America/Chicago", label: "Central Time (US/Canada)" },
  { value: "America/Denver", label: "Mountain Time (US/Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US/Canada)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export function StepProfile() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingData>();

  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="border-b border-[var(--surface-border)] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">Workspace profile</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
          Add the details clients will recognize
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          These details appear in your dashboard and help NutriRelay time reminders and reports correctly.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <FormSection title="Trainer identity" description="Use the name you want clients and operators to recognize.">
          <Input
            label="Full name"
            placeholder="Yash Sonare"
            error={errors.fullName?.message}
            {...register("fullName")}
          />
          <Input
            label="Trainer display name"
            placeholder="Coach Yash"
            error={errors.displayName?.message}
            {...register("displayName")}
          />
        </FormSection>

        <FormSection title="Coaching brand">
          <Input
            label="Business or coaching brand"
            placeholder="Your coaching brand"
            error={errors.businessName?.message}
            {...register("businessName")}
          />
        </FormSection>

        <div className="space-y-1.5">
          <Select
            label="Timezone"
            placeholder="Choose your timezone for reminders and reports"
            options={timezoneOptions}
            error={errors.timezone?.message}
            {...register("timezone")}
          />
          <p className="text-xs leading-5 text-[var(--muted)]">
            Next: connect your WhatsApp coaching number from Settings after setup.
          </p>
        </div>
      </div>
    </div>
  );
}
