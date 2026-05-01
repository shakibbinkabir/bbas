'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { WizardStep } from '@/store/applicationForm';

interface StepProgressProps {
  currentStep: WizardStep;
  visitedSteps: Set<WizardStep>;
  onStepClick?: (step: WizardStep) => void;
}

const STEP_LABEL_KEYS: Record<WizardStep, string> = {
  1: 'wizard.step1Label',
  2: 'wizard.step2Label',
  3: 'wizard.step3Label',
  4: 'wizard.step4Label',
  5: 'wizard.step5Label',
};

const STEPS: WizardStep[] = [1, 2, 3, 4, 5];

export function StepProgress({
  currentStep,
  visitedSteps,
  onStepClick,
}: StepProgressProps) {
  const t = useTranslations();

  return (
    <ol
      className="-mx-4 flex items-center gap-0 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0 md:pb-0"
      aria-label={t('wizard.progressLabel')}
    >
      {STEPS.map((step, idx) => {
        const isCurrent = step === currentStep;
        const isCompleted = step < currentStep;
        // Per spec: clicking step indicators only navigates BACK to completed
        // steps, never forward. `visitedSteps` is read so React subscribes to
        // store updates that affect the visual state.
        void visitedSteps;
        const canNavigate = step < currentStep;
        const stepLabel = t(STEP_LABEL_KEYS[step]);

        return (
          <li
            key={step}
            className={cn(
              'flex flex-1 items-center gap-2',
              idx === STEPS.length - 1 ? 'flex-none' : 'min-w-[64px] md:min-w-0'
            )}
          >
            <button
              type="button"
              onClick={canNavigate ? () => onStepClick?.(step) : undefined}
              disabled={!canNavigate}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`${t('wizard.stepNumber', { n: step })}: ${stepLabel}`}
              className={cn(
                'flex shrink-0 items-center gap-3 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                canNavigate ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  isCurrent &&
                    'border-primary bg-primary text-primary-foreground shadow ring-2 ring-primary/20',
                  isCompleted &&
                    !isCurrent &&
                    'border-emerald-500 bg-emerald-500 text-white',
                  !isCurrent &&
                    !isCompleted &&
                    'border-border bg-background text-muted-foreground'
                )}
                aria-hidden="true"
              >
                {isCompleted && !isCurrent ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step
                )}
              </span>
              <span
                className={cn(
                  'hidden whitespace-nowrap text-sm font-medium md:block',
                  isCurrent
                    ? 'text-foreground'
                    : isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                )}
              >
                {stepLabel}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'mx-1 h-0.5 flex-1 min-w-[16px] md:min-w-[24px] rounded-full',
                  isCompleted ? 'bg-emerald-500' : 'bg-border'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
