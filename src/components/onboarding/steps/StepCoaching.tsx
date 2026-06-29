"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Select } from "@/components/ui/Select";
import { RadioCards } from "@/components/ui/RadioCards";
import { FormSection } from "@/components/ui/FormSection";
import type { OnboardingData } from "../onboarding-types";

const styleOptions = [
  {
    value: "1-on-1 Personal Training",
    label: "1-on-1 Personal Training",
    description: "Work individually with each client",
  },
  {
    value: "Small Group Coaching",
    label: "Small Group Coaching",
    description: "Train small groups of 3-8 clients",
  },
  {
    value: "Online Coaching",
    label: "Online Coaching",
    description: "Coach clients remotely through your app",
  },
  {
    value: "Hybrid (Online + In-Person)",
    label: "Hybrid",
    description: "Mix of online and in-person sessions",
  },
  {
    value: "Corporate Wellness",
    label: "Corporate Wellness",
    description: "Employee wellness programs",
  },
];

const experienceOptions = [
  { value: "Less than 1 year", label: "Less than 1 year" },
  { value: "1–3 years", label: "1–3 years" },
  { value: "3–5 years", label: "3–5 years" },
  { value: "5–10 years", label: "5–10 years" },
  { value: "10+ years", label: "10+ years" },
];

const specialtyOptions = [
  { value: "Weight Loss", label: "Weight Loss" },
  { value: "Muscle Building", label: "Muscle Building" },
  { value: "Strength Training", label: "Strength Training" },
  { value: "Endurance & Conditioning", label: "Endurance & Conditioning" },
  { value: "Flexibility & Mobility", label: "Flexibility & Mobility" },
  { value: "Nutrition Coaching", label: "Nutrition Coaching" },
  { value: "Rehabilitation", label: "Rehabilitation" },
  { value: "Sports Performance", label: "Sports Performance" },
  { value: "Senior Fitness", label: "Senior Fitness" },
  { value: "Pre/Postnatal Fitness", label: "Pre/Postnatal Fitness" },
];

const languageOptions = [
  { value: "English", label: "English" },
  { value: "Spanish", label: "Spanish" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Hindi", label: "Hindi" },
  { value: "Mandarin", label: "Mandarin" },
  { value: "Arabic", label: "Arabic" },
  { value: "Other", label: "Other" },
];

interface ChipSelectProps {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

function ChipSelect({ label, options, value, onChange, error }: ChipSelectProps) {
  const isSelected = (val: string) => value.includes(val);

  const toggle = (val: string) => {
    if (isSelected(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
              isSelected(opt.value)
                ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/30"
                : "bg-[var(--surface-raised)] text-[var(--muted)] border-[var(--surface-border)] hover:border-[var(--muted)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}

const availabilityOptions = [
  { value: "weekdays-business", label: "Weekdays, business hours (9 AM – 5 PM)" },
  { value: "weekdays-extended", label: "Weekdays, extended hours (6 AM – 8 PM)" },
  { value: "evenings-weekends", label: "Evenings & weekends" },
  { value: "flexible", label: "Fully flexible" },
];

export function StepCoaching() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<OnboardingData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Coaching Details
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Help us tailor the platform to your coaching style.
        </p>
      </div>

      <FormSection title="Coaching Style">
        <Controller
          name="coachingStyle"
          control={control}
          render={({ field }) => (
            <RadioCards
              options={styleOptions}
              value={field.value || ""}
              onChange={field.onChange}
              name="coachingStyle"
            />
          )}
        />
        {errors.coachingStyle && (
          <p className="text-xs text-[var(--destructive)]">{errors.coachingStyle.message}</p>
        )}
      </FormSection>

      <FormSection title="Experience">
        <Select
          label="Experience Level"
          placeholder="Select your experience"
          options={experienceOptions}
          error={errors.experienceLevel?.message}
          {...register("experienceLevel")}
        />
      </FormSection>

      <FormSection title="Specialties">
        <Controller
          name="specialties"
          control={control}
          render={({ field }) => (
            <ChipSelect
              label="Primary Specialties"
              options={specialtyOptions}
              value={field.value || []}
              onChange={field.onChange}
              error={errors.specialties?.message}
            />
          )}
        />
      </FormSection>

      <FormSection title="Languages">
        <Controller
          name="languages"
          control={control}
          render={({ field }) => (
            <ChipSelect
              label="Languages You Speak"
              options={languageOptions}
              value={field.value || []}
              onChange={field.onChange}
              error={errors.languages?.message}
            />
          )}
        />
      </FormSection>

      <FormSection title="Availability">
        <Controller
          name="defaultAvailability"
          control={control}
          render={({ field }) => (
            <RadioCards
              options={availabilityOptions}
              value={field.value || ""}
              onChange={field.onChange}
              name="defaultAvailability"
            />
          )}
        />
        {errors.defaultAvailability && (
          <p className="text-xs text-[var(--destructive)]">{errors.defaultAvailability.message}</p>
        )}
      </FormSection>
    </div>
  );
}
