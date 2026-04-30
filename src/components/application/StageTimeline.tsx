'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/hooks/useLocale';
import { STAGES } from '@/lib/constants';
import { cn, toBanglaNumerals } from '@/lib/utils';

interface StageTimelineProps {
  currentStage: number;
  className?: string;
}

export function StageTimeline({ currentStage, className }: StageTimelineProps) {
  const t = useTranslations();
  const { locale } = useLocale();

  return (
    <ol className={cn('relative space-y-4', className)}>
      {STAGES.map((stage, idx) => {
        const completed = stage.number < currentStage;
        const current = stage.number === currentStage;
        const stageNumber = locale === 'bn' ? toBanglaNumerals(stage.number) : stage.number;

        return (
          <li key={stage.number} className="flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  completed && 'border-primary bg-primary text-primary-foreground',
                  current && 'border-primary bg-primary/10 text-primary',
                  !completed && !current && 'border-muted-foreground/30 text-muted-foreground'
                )}
                aria-hidden="true"
              >
                {completed ? <Check className="h-4 w-4" /> : stageNumber}
              </span>
              {idx < STAGES.length - 1 && (
                <span
                  className={cn(
                    'mt-1 w-0.5 grow',
                    completed ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="flex-1 pb-4">
              <p
                className={cn(
                  'text-sm font-medium',
                  current ? 'text-primary' : 'text-foreground',
                  !current && !completed && 'text-muted-foreground'
                )}
              >
                {t(`stage.${stage.number}`)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {locale === 'bn' ? stage.descriptionBn : stage.descriptionEn}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
