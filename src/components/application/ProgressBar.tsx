'use client';

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
  const { locale } = useLocale();
  const percent = getStageProgressPercent(currentStage);
  const label = locale === 'bn' ? toBanglaNumerals(percent) : String(percent);

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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {locale === 'bn' ? toBanglaNumerals(currentStage) : currentStage} /{' '}
            {locale === 'bn' ? toBanglaNumerals(totalStages) : totalStages}
          </span>
          <span>{label}%</span>
        </div>
      )}
    </div>
  );
}
