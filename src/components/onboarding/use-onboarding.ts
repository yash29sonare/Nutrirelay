"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  onboardingSchema,
  STEP_SCHEMAS,
  type OnboardingData,
} from "./onboarding-types";
import { completeOnboardingAction } from "@/app/onboarding/actions";

const TOTAL_STEPS = STEP_SCHEMAS.length;

function getStepFields(step: number): (keyof OnboardingData)[] {
  const schema = STEP_SCHEMAS[step];
  return Object.keys(schema.shape) as (keyof OnboardingData)[];
}

export function useOnboardingForm() {
  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: "",
      displayName: "",
      businessName: "",
      timezone: "Asia/Kolkata",
      country: "IN",
    },
    mode: "onTouched",
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const goToNextStep = useCallback(async () => {
    const fields = getStepFields(currentStep);
    const isValid = await form.trigger(fields);
    if (!isValid) return;

    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setSubmitting(true);
      setSubmitError(null);
      const data = form.getValues();
      const result = await completeOnboardingAction({
        fullName: data.fullName,
        displayName: data.displayName,
        businessName: data.businessName,
        timezone: data.timezone,
        country: data.country ?? "IN",
      });
      setSubmitting(false);
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      setShowSuccess(true);
    }
  }, [currentStep, form]);

  const goToPrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < TOTAL_STEPS && step <= currentStep) {
        setCurrentStep(step);
      }
    },
    [currentStep]
  );

  const reset = useCallback(() => {
    form.reset();
    setCurrentStep(0);
    setShowSuccess(false);
    setSubmitError(null);
  }, [form]);

  return {
    form,
    currentStep,
    showSuccess,
    submitting,
    submitError,
    totalSteps: TOTAL_STEPS,
    goToNextStep,
    goToPrevStep,
    goToStep,
    reset,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === TOTAL_STEPS - 1,
  };
}
