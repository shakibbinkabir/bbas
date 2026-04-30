'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { STATUS_LIST } from '@/lib/constants';
import { cn, getStatusColor } from '@/lib/utils';
import type { AppStatus } from '@/types';

const STATUS_KEY: Record<AppStatus, string> = {
  draft: 'status.draft',
  submitted: 'status.submitted',
  under_review: 'status.underReview',
  information_requested: 'status.informationRequested',
  corrections_submitted: 'status.correctionsSubmitted',
  approved: 'status.approved',
  rejected: 'status.rejected',
  withdrawn: 'status.withdrawn',
};

interface StatusBadgeProps {
  status: AppStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations();
  const meta = STATUS_LIST.find((s) => s.value === status);

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent font-medium',
        getStatusColor(status),
        className
      )}
    >
      {t(STATUS_KEY[status]) || meta?.labelEn || status}
    </Badge>
  );
}
