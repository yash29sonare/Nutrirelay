"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormSection } from "@/components/ui/FormSection";
import type { OnboardingData } from "../onboarding-types";

const timezoneOptions = [
  { value: "America/New_York", label: "Eastern Time (US/Canada)" },
  { value: "America/Chicago", label: "Central Time (US/Canada)" },
  { value: "America/Denver", label: "Mountain Time (US/Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US/Canada)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const countryOptions = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "UK", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "AU", label: "Australia" },
  { value: "IN", label: "India" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "NZ", label: "New Zealand" },
  { value: "Other", label: "Other" },
];

export function StepProfile() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Your Profile
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Tell us about yourself and your coaching brand.
        </p>
      </div>

      <FormSection title="Personal Information">
        <Input
          label="Full Name"
          placeholder="John Doe"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <Input
          label="Display Name"
          placeholder="John"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
      </FormSection>

      <FormSection title="Business Details">
        <Input
          label="Business / Coaching Brand"
          placeholder="Fortress Fitness"
          error={errors.businessName?.message}
          {...register("businessName")}
        />
      </FormSection>

      <FormSection title="Location">
        <Select
          label="Timezone"
          placeholder="Select your timezone"
          options={timezoneOptions}
          error={errors.timezone?.message}
          {...register("timezone")}
        />
        <Select
          label="Country"
          placeholder="Select your country"
          options={countryOptions}
          error={errors.country?.message}
          {...register("country")}
        />
      </FormSection>
    </div>
  );
}
