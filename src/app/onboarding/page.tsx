"use client";

import { FormProvider } from "react-hook-form";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { StepWelcome } from "@/components/onboarding/steps/StepWelcome";
import { StepProfile } from "@/components/onboarding/steps/StepProfile";
import { StepCoaching } from "@/components/onboarding/steps/StepCoaching";
import { StepBusiness } from "@/components/onboarding/steps/StepBusiness";
import { StepComplete } from "@/components/onboarding/steps/StepComplete";
import { useOnboardingForm } from "@/components/onboarding/use-onboarding";
import { STEP_LABELS } from "@/components/onboarding/onboarding-types";
import { ArrowLeft, ArrowRight } from "lucide-react";

const STEPS = STEP_LABELS.map((label) => ({ label }));

const STEP_COMPONENTS = [
  StepWelcome,
  StepProfile,
  StepCoaching,
  StepBusiness,
  StepComplete,
];

export default function OnboardingPage() {
  const {
    form,
    currentStep,
    showSuccess,
    totalSteps,
    goToNextStep,
    goToPrevStep,
    isFirstStep,
    isLastStep,
  } = useOnboardingForm();

  if (showSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <StepComplete data={form.getValues()} />
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep];
  const isWelcomeStep = currentStep === 0;
  const isCompleteStep = currentStep === totalSteps - 1;

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      {!isWelcomeStep && (
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--surface-border)]">
          <Stepper steps={STEPS} currentStep={currentStep} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">
          <FormProvider {...form}>
            <StepComponent
              onContinue={goToNextStep}
              data={form.getValues()}
            />
          </FormProvider>
        </div>
      </div>

      {/* Bottom navigation — hidden on welcome and complete steps */}
      {!isWelcomeStep && !isCompleteStep && (
        <div className="px-4 sm:px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-raised)]">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevStep}
              icon={<ArrowLeft size={14} />}
            >
              Back
            </Button>

            <span className="text-xs text-[var(--muted)]">
              Step {currentStep + 1} of {totalSteps}
            </span>

            <Button
              variant="brand"
              size="sm"
              onClick={goToNextStep}
              icon={<ArrowRight size={14} />}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Complete step has its own CTA */}
      {!isWelcomeStep && isCompleteStep && (
        <div className="px-4 sm:px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-raised)]">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevStep}
              icon={<ArrowLeft size={14} />}
            >
              Back
            </Button>

            <span className="text-xs text-[var(--muted)]">
              Step {currentStep + 1} of {totalSteps}
            </span>

            <Button variant="brand" size="sm" onClick={goToNextStep}>
              Complete Setup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
