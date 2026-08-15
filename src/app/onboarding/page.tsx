"use client";

import { FormProvider } from "react-hook-form";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { StepWelcome } from "@/components/onboarding/steps/StepWelcome";
import { StepProfile } from "@/components/onboarding/steps/StepProfile";
import { StepComplete } from "@/components/onboarding/steps/StepComplete";
import { useOnboardingForm } from "@/components/onboarding/use-onboarding";
import { STEP_LABELS } from "@/components/onboarding/onboarding-types";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ErrorBanner } from "@/components/ui/StatusBanner";

const STEPS = STEP_LABELS.map((label) => ({ label }));

export default function OnboardingPage() {
  const {
    form,
    currentStep,
    showSuccess,
    submitting,
    submitError,
    totalSteps,
    goToNextStep,
    goToPrevStep,
  } = useOnboardingForm();

  if (showSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <StepComplete data={form.getValues()} />
      </div>
    );
  }

  const isWelcomeStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

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
        <div className={isWelcomeStep ? "w-full max-w-5xl" : "w-full max-w-xl"}>
          <FormProvider {...form}>
            {isWelcomeStep ? (
              <StepWelcome onContinue={goToNextStep} />
            ) : (
              <StepProfile />
            )}
          </FormProvider>
        </div>
      </div>

      {/* Error */}
      {submitError && !isWelcomeStep && (
        <div className="px-4 sm:px-6 py-2">
          <div className="max-w-lg mx-auto">
            <ErrorBanner>{submitError}</ErrorBanner>
          </div>
        </div>
      )}

      {/* Bottom navigation — hidden on welcome step */}
      {!isWelcomeStep && (
        <div className="px-4 sm:px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-raised)]">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            {!isLastStep ? (
              <>
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
              </>
            ) : (
              <>
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
                  loading={submitting}
                  disabled={submitting}
                >
                  {submitting ? "Completing…" : "Complete Setup"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
