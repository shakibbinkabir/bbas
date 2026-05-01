import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
  tone?: 'default' | 'amber' | 'green' | 'red' | 'blue';
  className?: string;
}

const TONE_STYLES: Record<NonNullable<SummaryCardProps['tone']>, string> = {
  default:
    'bg-primary/10 text-primary',
  amber:
    'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  green:
    'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  red:
    'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
};

export function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  tone = 'default',
  className,
}: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start gap-4 p-5">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            TONE_STYLES[tone]
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
