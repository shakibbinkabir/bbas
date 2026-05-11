'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from '@/hooks/useLocale';
import { cn, getStageProgressPercent, toBanglaNumerals } from '@/lib/utils';

interface ProgressBarProps {
  currentStage: number;
  totalStages?: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  currentStage,
  totalStages = 9,
  showLabel = true,
  className,
}: ProgressBarProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const percent = getStageProgressPercent(currentStage);
  const currentLabel =
    locale === 'bn' ? toBanglaNumerals(currentStage) : String(currentStage);
  const totalLabel =
    locale === 'bn' ? toBanglaNumerals(totalStages) : String(totalStages);

  return (
    <div className={cn('space-y-1', className)}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-muted-foreground">
          {t('stage.of', { current: currentLabel, total: totalLabel })}
        </div>
      )}
    </div>
  );
}
