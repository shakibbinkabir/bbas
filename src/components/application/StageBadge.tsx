'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from '@/hooks/useLocale';
import { cn, toBanglaNumerals } from '@/lib/utils';

interface StageBadgeProps {
  stage: number;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const stageNumber = locale === 'bn' ? toBanglaNumerals(stage) : String(stage);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-primary/10 py-1 pl-1 pr-3 text-xs font-medium text-primary',
        className
      )}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
        aria-hidden="true"
      >
        {stageNumber}
      </span>
      <span>{t(`stage.${stage}`)}</span>
    </span>
  );
}
