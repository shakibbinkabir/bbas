import { useLocale } from '@/hooks/useLocale';
import { cn, toBanglaNumerals } from '@/lib/utils';

interface AIScoreBadgeProps {
  score: number | null | undefined;
  className?: string;
}

function colorClass(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300';
  if (score >= 50) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300';
}

export function AIScoreBadge({ score, className }: AIScoreBadgeProps) {
  const { locale } = useLocale();

  if (score === null || score === undefined) {
    return (
      <span
        className={cn(
          'inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-md bg-muted px-2 text-xs font-semibold text-muted-foreground',
          className
        )}
      >
        —
      </span>
    );
  }

  const rounded = Math.round(score);
  const display = locale === 'bn' ? toBanglaNumerals(rounded) : rounded;

  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-md px-2 text-xs font-semibold tabular-nums',
        colorClass(rounded),
        className
      )}
    >
      {display}
    </span>
  );
}
